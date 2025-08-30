type InputTarget =
  | { kind: 'textarea'; el: HTMLTextAreaElement }
  | { kind: 'contenteditable'; el: HTMLElement }

const COMMON_SELECTORS = [
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]',
] as const

export function findActiveInput(customSelectors: string[] = []): InputTarget | null {
  const active = document.activeElement as HTMLElement | null
  const selectors = [...customSelectors, ...COMMON_SELECTORS]
  const candidates: HTMLElement[] = []
  if (active) candidates.push(active)
  document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach(el => candidates.push(el))
  for (const el of candidates) {
    if (!el.isConnected || el.offsetParent === null) continue
    if (el.tagName === 'TEXTAREA') return { kind: 'textarea', el: el as HTMLTextAreaElement }
    if (el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox')
      return { kind: 'contenteditable', el }
  }
  return null
}

export function insertAtCursor(target: InputTarget, text: string) {
  if (target.kind === 'textarea') {
    const ta = target.el
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(end)
    ta.value = before + text + after
    const pos = start + text.length
    ta.selectionStart = ta.selectionEnd = pos
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }
  const el = target.el
  el.focus()
  const sel = window.getSelection()
  if (!sel) return
  if (sel.rangeCount === 0) {
    const r = document.createRange()
    r.selectNodeContents(el)
    r.collapse(false)
    sel.addRange(r)
  }
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  
  // Move cursor to the end of the inserted text
  range.setStartAfter(textNode)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)

  // Dispatch an input event to notify listeners of the change
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
}

export function isComposing(): boolean {
  // 简单检测：IME 组合态常见时机，外部可自行维护标记
  // 这里留接口给调用方设置
  return false
}