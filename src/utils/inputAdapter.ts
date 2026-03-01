/**
 * 输入目标类型定义
 * 支持两种输入元素：textarea 和 contenteditable 元素
 */
type InputTarget =
  | { kind: 'textarea'; el: HTMLTextAreaElement }
  | { kind: 'contenteditable'; el: HTMLElement }

type InsertTraceFn = (step: string, payload?: Record<string, unknown>) => void

interface AppendAtEndOptions {
  separator?: string
  trace?: InsertTraceFn
}

type ProseMirrorTransaction = {
  insertText: (text: string, from: number, to: number) => {
    scrollIntoView?: () => unknown
  }
}

type ProseMirrorDoc = {
  textContent?: string
  content?: { size?: number }
}

type ProseMirrorView = {
  state: {
    doc?: ProseMirrorDoc
    tr: ProseMirrorTransaction
  }
  dispatch: (transaction: unknown) => void
  focus?: () => void
}

function isProseMirrorView(value: unknown): value is ProseMirrorView {
  if (!value || typeof value !== 'object') return false
  const maybeView = value as Partial<ProseMirrorView>
  return (
    typeof maybeView.dispatch === 'function'
    && !!maybeView.state
    && typeof maybeView.state === 'object'
    && !!maybeView.state.tr
    && typeof maybeView.state.tr.insertText === 'function'
  )
}

const COMMON_SELECTORS = [
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
] as const

function isVisibleElement(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return el.getClientRects().length > 0
}

function resolveContentEditableRoot(el: HTMLElement): HTMLElement {
  const scopedRoot = el.closest<HTMLElement>('[contenteditable="true"],[contenteditable="plaintext-only"],[contenteditable]:not([contenteditable="false"]),[role="textbox"]') || el

  if (scopedRoot.isContentEditable) return scopedRoot

  const nestedEditable = scopedRoot.querySelector<HTMLElement>('[contenteditable="true"],[contenteditable="plaintext-only"],[contenteditable]:not([contenteditable="false"])')
  return nestedEditable || scopedRoot
}

function setSelectionRange(range: Range): Selection | null {
  const selection = window.getSelection()
  if (!selection) return null
  selection.removeAllRanges()
  selection.addRange(range)
  return selection
}

function createRangeAtEnd(el: HTMLElement): Range {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  return range
}

function hasMeaningfulText(el: HTMLElement): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let checkedNodes = 0
  while (walker.nextNode()) {
    checkedNodes += 1
    const node = walker.currentNode as Text
    if (/\S/.test(node.data)) return true
    // 防止极端大 DOM 下长时间遍历，超过阈值直接按“有内容”处理。
    if (checkedNodes > 64) return true
  }
  return false
}

function tryAppendWithProseMirrorView(
  el: HTMLElement,
  text: string,
  separator: string,
  trace?: InsertTraceFn,
): boolean {
  trace?.('append.pm.lookup.start')
  const candidates: HTMLElement[] = []
  const seen = new Set<HTMLElement>()
  const pushCandidate = (node: HTMLElement | null) => {
    if (!node || seen.has(node)) return
    seen.add(node)
    candidates.push(node)
  }

  pushCandidate(el)
  pushCandidate(el.closest<HTMLElement>('.ProseMirror'))
  pushCandidate(el.querySelector<HTMLElement>('.ProseMirror'))

  let parent = el.parentElement
  let depth = 0
  while (parent && depth < 4) {
    pushCandidate(parent)
    parent = parent.parentElement
    depth += 1
  }

  const maybeView = candidates
    .map((node) => {
      const pmViewDesc = (node as HTMLElement & { pmViewDesc?: { view?: unknown } }).pmViewDesc
      return pmViewDesc?.view
    })
    .find((view): view is ProseMirrorView => isProseMirrorView(view))

  if (!maybeView) {
    trace?.('append.pm.lookup.miss')
    return false
  }

  try {
    const t0 = performance.now()
    const doc = maybeView.state.doc
    const baseText = typeof doc?.textContent === 'string' ? doc.textContent : ''
    const joiner = baseText.trim() ? separator : ''
    const textToInsert = `${joiner}${text}`

    const endPos =
      typeof doc?.content?.size === 'number'
        ? doc.content.size
        : baseText.length

    const tr = maybeView.state.tr.insertText(textToInsert, endPos, endPos)
    maybeView.dispatch(typeof tr.scrollIntoView === 'function' ? tr.scrollIntoView() : tr)
    if (typeof maybeView.focus === 'function') maybeView.focus()
    trace?.('append.pm.dispatch.ok', {
      docSize: typeof doc?.content?.size === 'number' ? doc.content.size : undefined,
      textLength: textToInsert.length,
      elapsedMs: Number((performance.now() - t0).toFixed(2)),
    })
    return true
  } catch (error) {
    trace?.('append.pm.dispatch.fail', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

function tryExecCommandInsertText(text: string, trace?: InsertTraceFn): boolean {
  const doc = document as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean
  }

  if (typeof doc.execCommand !== 'function') {
    trace?.('append.execCommand.unavailable')
    return false
  }
  try {
    const t0 = performance.now()
    const ok = doc.execCommand('insertText', false, text)
    trace?.('append.execCommand.result', {
      ok,
      textLength: text.length,
      elapsedMs: Number((performance.now() - t0).toFixed(2)),
    })
    return ok
  } catch (error) {
    trace?.('append.execCommand.error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

function replaceSelectionWithText(
  text: string,
  trace?: InsertTraceFn,
): { ok: boolean; usedExecCommand: boolean } {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    try {
      const range = selection.getRangeAt(0)
      const t0 = performance.now()
      range.deleteContents()

      if (text) {
        const textNode = document.createTextNode(text)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.collapse(true)
      }

      selection.removeAllRanges()
      selection.addRange(range)
      trace?.('append.domRange.result', {
        textLength: text.length,
        elapsedMs: Number((performance.now() - t0).toFixed(2)),
      })

      return { ok: true, usedExecCommand: false }
    } catch (error) {
      trace?.('append.domRange.error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (tryExecCommandInsertText(text, trace)) {
    return { ok: true, usedExecCommand: true }
  }

  return { ok: false, usedExecCommand: false }
}

export function findActiveInput(customSelectors: string[] = []): InputTarget | null {
  const active = document.activeElement as HTMLElement | null
  const selectors = [...customSelectors, ...COMMON_SELECTORS]

  const candidates: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  const pushCandidate = (el: HTMLElement | null) => {
    if (!el || seen.has(el)) return
    seen.add(el)
    candidates.push(el)
  }

  pushCandidate(active)
  selectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector)
      elements.forEach((el) => pushCandidate(el))
    } catch {
      // Ignore invalid selector from host-specific hints.
    }
  })

  for (const candidate of candidates) {
    if (candidate.tagName === 'TEXTAREA') {
      if (!isVisibleElement(candidate)) continue
      const textarea = candidate as HTMLTextAreaElement
      if (textarea.disabled || textarea.readOnly) continue
      return { kind: 'textarea', el: candidate as HTMLTextAreaElement }
    }

    const contentEditableAttr = candidate.getAttribute('contenteditable')
    const hasEditableAttr = contentEditableAttr !== null && contentEditableAttr.toLowerCase() !== 'false'

    if (candidate.isContentEditable || candidate.getAttribute('role') === 'textbox' || hasEditableAttr) {
      const root = resolveContentEditableRoot(candidate)
      if (!root.isContentEditable) continue
      if (!isVisibleElement(root)) continue
      return { kind: 'contenteditable', el: root }
    }
  }

  return null
}

/**
 * 在光标位置插入文本
 * 支持 textarea 和 contenteditable 两种元素类型
 * @param target 目标输入元素
 * @param text 要插入的文本内容
 * @param replaceTrigger 如果为 true，则在插入前删除一个字符（用于替换触发符如 '/'）
 */
export function insertAtCursor(target: InputTarget, text: string, replaceTrigger = false) {
  target.el.focus()

  if (target.kind === 'textarea') {
    const ta = target.el
    let start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? start

    if (replaceTrigger && start > 0) {
      ta.value = ta.value.slice(0, start - 1) + ta.value.slice(end)
      start -= 1
    }

    const before = ta.value.slice(0, start)
    const after = ta.value.slice(start)
    ta.value = before + text + after

    const pos = start + text.length
    ta.selectionStart = pos
    ta.selectionEnd = pos
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }

  const el = resolveContentEditableRoot(target.el)
  el.focus()

  const selection = window.getSelection()
  if (!selection) return

  if (selection.rangeCount === 0) {
    setSelectionRange(createRangeAtEnd(el))
  }

  if (replaceTrigger && selection.rangeCount > 0) {
    const currentRange = selection.getRangeAt(0)
    const removeRange = currentRange.cloneRange()
    if (removeRange.collapsed && removeRange.startContainer.nodeType === Node.TEXT_NODE && removeRange.startOffset > 0) {
      removeRange.setStart(removeRange.startContainer, removeRange.startOffset - 1)
      setSelectionRange(removeRange)
      replaceSelectionWithText('')
    }
  }

  const result = replaceSelectionWithText(text)
  if (!result.ok) return

  if (!result.usedExecCommand) {
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertText',
    }))
  }
}

/**
 * 在输入内容末尾追加文本。
 * 在输入内容末尾追加文本，不替换现有内容。
 */
export function appendAtEnd(
  target: InputTarget,
  text: string,
  options: AppendAtEndOptions = {},
): boolean {
  const trace = options.trace
  const normalizedText = text || ''
  if (!normalizedText) {
    trace?.('append.skip.empty')
    return false
  }

  const separator = options.separator ?? '\n\n'
  target.el.focus()
  trace?.('append.start', { kind: target.kind, separatorLength: separator.length })

  if (target.kind === 'textarea') {
    const t0 = performance.now()
    const ta = target.el
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? start
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(end)

    const base = before + after
    const joiner = base.trim() ? separator : ''
    ta.value = `${base}${joiner}${normalizedText}`

    const cursor = ta.value.length
    ta.selectionStart = cursor
    ta.selectionEnd = cursor
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    trace?.('append.textarea.ok', {
      baseLength: base.length,
      insertLength: normalizedText.length,
      elapsedMs: Number((performance.now() - t0).toFixed(2)),
    })
    return true
  }

  const el = resolveContentEditableRoot(target.el)
  el.focus()
  trace?.('append.contenteditable.target', {
    id: el.id || undefined,
    className: el.className || undefined,
  })

  if (tryAppendWithProseMirrorView(el, normalizedText, separator, trace)) {
    return true
  }

  const joiner = hasMeaningfulText(el) ? separator : ''
  const textToInsert = `${joiner}${normalizedText}`

  setSelectionRange(createRangeAtEnd(el))
  const inserted = replaceSelectionWithText(textToInsert, trace)
  if (!inserted.ok) return false

  if (!inserted.usedExecCommand) {
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: textToInsert,
      inputType: 'insertText',
    }))
    trace?.('append.inputEvent.dispatched', { inputType: 'insertText' })
  }
  trace?.('append.done', { usedExecCommand: inserted.usedExecCommand })
  return true
}

/**
 * 检测是否正在进行输入法组合输入
 * @returns 是否正在组合输入状态
 */
export function isComposing(): boolean {
  return false
}
