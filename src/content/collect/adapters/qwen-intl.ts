/**
 * Qwen 国际版 (chat.qwen.ai) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #chat-message-container
 *     ├── .qwen-chat-message-user
 *     │     └── .chat-user-message .user-message-content
 *     └── .qwen-chat-message-assistant
 *           └── .response-message-content .custom-qwen-markdown .qwen-markdown
 *
 * thinking（可选）：
 *   右侧面板 .splitter-container-right-panel 在点击“思考”后才会渲染，
 *   通过 data-phase-id 前缀与当前 assistant 消息 ID 关联。
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'

const MESSAGE_ITEM_SELECTOR = '.qwen-chat-message'
const USER_ITEM_SELECTOR = '.qwen-chat-message-user'
const ASSISTANT_ITEM_SELECTOR = '.qwen-chat-message-assistant'

export class QwenIntlAdapter extends BaseAdapter {
  private thinkingByAssistantId = new Map<string, string>()
  private thinkingCacheScope = ''
  private mermaidCodeQueueByAssistantId = new Map<string, string[]>()
  private currentAssistantId: string | null = null
  private static readonly BRIDGE_SCRIPT_ID = '__synapse_qwen_intl_bridge__'
  private static readonly BRIDGE_CMD_EVENT = 'synapse:qwen-intl-bridge-command'
  private static readonly BRIDGE_DATA_EVENT = 'synapse:qwen-intl-bridge-data'
  private static readonly BRIDGE_READY_EVENT = 'synapse:qwen-intl-bridge-ready'
  private bridgeLoadPromise: Promise<void> | null = null

  private getThinkingScope(): string {
    return this.getConversationId() || `${window.location.origin}${window.location.pathname}`
  }

  private ensureThinkingScope(): void {
    const scope = this.getThinkingScope()
    if (scope === this.thinkingCacheScope) return

    this.thinkingCacheScope = scope
    this.thinkingByAssistantId.clear()
  }

  private startsWithMermaidSyntax(code: string): boolean {
    const trimmed = code.trim()
    const withoutInit = trimmed.replace(/^(?:%%\{[\s\S]*?\}%%\s*)+/i, '').trimStart()
    return /^(?:graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|gantt\b|pie\b|gitgraph\b|journey\b|mindmap\b|timeline\b|quadrantChart\b|sankey\b|xychart(?:-beta)?\b|block-beta\b|packet-beta\b|architecture-beta\b|kanban\b)/i.test(withoutInit)
  }

  private isMermaidContent(code: string): boolean {
    return !!this.extractMermaidCandidate(code)
  }

  private sanitizeMermaidCode(code: string): string {
    let normalized = code
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\r\n?/g, '\n')
      .trim()

    // 去掉 markdown 围栏
    normalized = normalized
      .replace(/^```(?:mermaid)?\s*\n?/i, '')
      .replace(/\n?```$/, '')
      .trim()

    const lines = normalized.split('\n')
    if (lines.length > 0 && /^\s*(?:language-)?mermaid\s*$/i.test(lines[0])) {
      lines.shift()
    }

    return lines.join('\n').trim()
  }

  private extractMermaidCandidate(text: string): string | undefined {
    const normalized = this.sanitizeMermaidCode(text || '')
    if (!normalized) return undefined

    if (this.startsWithMermaidSyntax(normalized)) return normalized

    const lines = normalized.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('%%')) continue
      if (!this.startsWithMermaidSyntax(line)) continue

      const tail = this.sanitizeMermaidCode(lines.slice(i).join('\n'))
      if (tail && this.startsWithMermaidSyntax(tail)) return tail
    }

    return undefined
  }

  private createCaptureToken(): string {
    try {
      return crypto.randomUUID()
    } catch {
      return `qwen-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
  }

  private async ensurePageCaptureBridge(): Promise<void> {
    const existing = document.getElementById(QwenIntlAdapter.BRIDGE_SCRIPT_ID) as HTMLScriptElement | null
    if (existing?.dataset.ready === '1') return
    if (this.bridgeLoadPromise) {
      await this.bridgeLoadPromise
      return
    }

    let script = existing
    if (!script) {
      script = document.createElement('script')
      script.id = QwenIntlAdapter.BRIDGE_SCRIPT_ID
      script.async = false
      script.dataset.cmdEvent = QwenIntlAdapter.BRIDGE_CMD_EVENT
      script.dataset.dataEvent = QwenIntlAdapter.BRIDGE_DATA_EVENT
      script.dataset.bridgeKey = '__synapseQwenIntlBridgeInstalled__'
      script.dataset.readyEvent = QwenIntlAdapter.BRIDGE_READY_EVENT
      script.src = chrome.runtime.getURL('page-bridges/qwen-intl-bridge.js')
      ;(document.documentElement || document.head || document.body).appendChild(script)
    }
    if (!script) return
    const scriptEl: HTMLScriptElement = script

    this.bridgeLoadPromise = Promise.race([
      this.waitForEvent<Event>(scriptEl, 'load', {
        timeoutMs: 1200,
        capture: false,
      }),
      this.waitForEvent<Event>(scriptEl, 'error', {
        timeoutMs: 1200,
        capture: false,
      }),
      this.waitForEvent<Event>(window, QwenIntlAdapter.BRIDGE_READY_EVENT, {
        timeoutMs: 1200,
        capture: true,
      }),
    ]).then(() => {
      scriptEl.dataset.ready = '1'
    }).finally(() => {
      this.bridgeLoadPromise = null
    })

    await this.bridgeLoadPromise
  }

  private armBridge(mode: 'copy' | 'download', token: string): void {
    window.dispatchEvent(new CustomEvent(QwenIntlAdapter.BRIDGE_CMD_EVENT, {
      detail: { cmd: 'arm', token, mode },
    }))
  }

  private disarmBridge(token: string): void {
    window.dispatchEvent(new CustomEvent(QwenIntlAdapter.BRIDGE_CMD_EVENT, {
      detail: { cmd: 'disarm', token },
    }))
  }

  private async waitBridgeData(token: string, timeoutMs: number): Promise<string | undefined> {
    const event = await this.waitForEvent<CustomEvent<{ token?: string; text?: string }>>(
      window,
      QwenIntlAdapter.BRIDGE_DATA_EVENT,
      {
        timeoutMs,
        capture: true,
        filter: (raw) => {
          const detail = (raw as CustomEvent<{ token?: string }>).detail || {}
          return detail.token === token
        },
      },
    )
    if (!event) return undefined
    return this.extractMermaidCandidate(typeof event.detail?.text === 'string' ? event.detail.text : '')
  }

  private parseMermaidBlocksFromText(text: string): string[] {
    const results: string[] = []
    const fenceRegex = /```([^\n`]*)\r?\n([\s\S]*?)```/g
    let match: RegExpExecArray | null

    while ((match = fenceRegex.exec(text)) !== null) {
      const lang = (match[1] || '').trim().toLowerCase()
      const body = match[2] || ''
      const candidate = this.extractMermaidCandidate(body)
      if (lang === 'mermaid' && candidate) {
        results.push(candidate)
        continue
      }
      if (candidate) results.push(candidate)
    }

    if (results.length === 0) {
      const loose = this.extractMermaidCandidate(text)
      if (loose) results.push(loose)
    }

    return results
  }

  private extractMermaidFromReactPayload(block: Element): string | undefined {
    const roots: Element[] = []
    let cur: Element | null = block
    for (let i = 0; i < 8 && cur; i++) {
      roots.push(cur)
      cur = cur.parentElement
    }

    const seenObjects = new Set<object>()
    const candidateTexts: string[] = []

    const visitAny = (value: unknown, depth: number): void => {
      if (value == null || depth > 7) return
      if (typeof value === 'string') {
        if (value.length > 10) candidateTexts.push(value)
        return
      }
      if (typeof value !== 'object') return
      const obj = value as object
      if (seenObjects.has(obj)) return
      seenObjects.add(obj)

      if (Array.isArray(obj)) {
        for (const item of obj) visitAny(item, depth + 1)
        return
      }

      const plain = obj as Record<string, unknown>
      for (const [k, v] of Object.entries(plain)) {
        if (k === 'children' || k === 'content' || k === 'text' || k === 'value' || k === 'markdown' || k === 'source' || k === 'code') {
          visitAny(v, depth + 1)
          continue
        }
        if (k.startsWith('memoized') || k.startsWith('pending') || k.startsWith('child') || k.startsWith('sibling') || k.startsWith('alternate') || k.startsWith('props') || k.startsWith('state')) {
          visitAny(v, depth + 1)
        }
      }
    }

    for (const root of roots) {
      const keys = Object.keys(root).filter((k) =>
        k.startsWith('__reactProps$')
        || k.startsWith('__reactFiber$')
        || k.startsWith('__reactContainer$'),
      )
      for (const key of keys) {
        try {
          const payload = (root as unknown as Record<string, unknown>)[key]
          visitAny(payload, 0)
        } catch {
          // ignore
        }
      }
    }

    for (const text of candidateTexts) {
      const blocks = this.parseMermaidBlocksFromText(text)
      if (blocks.length > 0) return blocks[0]

      const candidate = this.extractMermaidCandidate(text)
      if (candidate) return candidate
    }

    return undefined
  }

  private detectCodeLanguage(block: Element, fallback = ''): string {
    const headerLang =
      block.querySelector('.qwen-markdown-code-header > div:first-child')?.textContent
      || block.querySelector('.qwen-markdown-code-header')?.firstChild?.textContent
      || ''

    const normalized = (headerLang || fallback)
      .trim()
      .toLowerCase()
      .replace(/^language-/, '')
      .split(/\s+/)[0]

    return normalized
  }

  private extractCodeFromLines(root: Element): string {
    const lineNodes = root.querySelectorAll('.view-lines .view-line, .cm-line')
    if (lineNodes.length === 0) return ''

    const lines = Array.from(lineNodes).map((line) =>
      (line.textContent || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, ''),
    )

    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
    return lines.join('\n').trimEnd()
  }

  private extractCodeText(block: Element): string {
    const directCandidates = [
      ...Array.from(block.querySelectorAll('pre code')),
      ...Array.from(block.querySelectorAll('code')),
      ...Array.from(block.querySelectorAll('textarea')),
    ]
    for (const el of directCandidates) {
      const text = (el.textContent || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, '')
        .trimEnd()
      if (text.trim()) return text
    }

    const lineCode = this.extractCodeFromLines(block)
    if (lineCode.trim()) return lineCode

    const body = block.querySelector('.qwen-markdown-code-body') || block
    const bodyClone = body.cloneNode(true) as Element
    bodyClone.querySelectorAll(
      'svg, style, [class*="header"], [class*="action"], [role="img"], button',
    ).forEach((el) => el.remove())

    const text = (bodyClone.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\r\n?/g, '\n')
      .trim()

    return text
  }

  private getMermaidCodeBlocks(root: Element): Element[] {
    const blocks = Array.from(root.querySelectorAll('.qwen-markdown-code'))
    return blocks.filter((block) => {
      const body = block.querySelector('.qwen-markdown-code-body')
      const className = (body?.getAttribute('class') || block.getAttribute('class') || '').toLowerCase()
      return className.includes('mermaid') || !!block.querySelector('.qwen-markdown-mermaid-chart, svg.flowchart')
    })
  }

  private getCodeActionButton(block: Element, type: 'copy' | 'download'): HTMLElement | null {
    const iconPattern = type === 'copy' ? 'copy-right' : 'download-02'
    const icon = block.querySelector(
      `use[xlink\\:href*="${iconPattern}"], use[href*="${iconPattern}"]`,
    )
    const byIcon = icon?.closest<HTMLElement>('.qwen-markdown-code-header-action-item') || null
    if (byIcon) return byIcon

    const actions = Array.from(block.querySelectorAll<HTMLElement>('.qwen-markdown-code-header-actions .qwen-markdown-code-header-action-item'))
    if (actions.length === 0) return null
    return type === 'copy' ? actions[0] : actions[1] || null
  }

  private isSupportedDownloadHref(href: string): boolean {
    return href.startsWith('blob:') || href.startsWith('data:text/plain')
  }

  private getSupportedDownloadAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null
    const anchor = target.closest('a[download], a[href]') as HTMLAnchorElement | null
    if (!anchor) return null
    const href = anchor.getAttribute('href') || anchor.href || ''
    return this.isSupportedDownloadHref(href) ? anchor : null
  }

  private async parseDownloadHrefText(href: string): Promise<string | undefined> {
    if (!href) return undefined

    if (href.startsWith('blob:')) {
      try {
        return await fetch(href).then((r) => r.text())
      } catch {
        return undefined
      }
    }

    if (href.startsWith('data:text/plain')) {
      try {
        const payload = href.split(',', 2)[1] || ''
        return decodeURIComponent(payload)
      } catch {
        return undefined
      }
    }

    return undefined
  }

  private createDownloadAnchorObserver(timeoutMs: number): {
    promise: Promise<HTMLAnchorElement | null>
    stop: () => void
  } {
    let done = false
    let timer: number | undefined
    let observer: MutationObserver | null = null
    let resolvePromise: (anchor: HTMLAnchorElement | null) => void = () => {}

    const finish = (anchor: HTMLAnchorElement | null) => {
      if (done) return
      done = true
      if (timer) window.clearTimeout(timer)
      observer?.disconnect()
      observer = null
      resolvePromise(anchor)
    }

    const promise = new Promise<HTMLAnchorElement | null>((resolve) => {
      resolvePromise = resolve

      if (!document.body) {
        finish(null)
        return
      }

      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (!(node instanceof Element)) continue
            const anchor = node.matches('a[download], a[href]')
              ? (node as HTMLAnchorElement)
              : node.querySelector<HTMLAnchorElement>('a[download], a[href]')
            if (!anchor) continue
            const supported = this.getSupportedDownloadAnchor(anchor)
            if (!supported) continue
            finish(supported)
            return
          }
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      timer = window.setTimeout(() => finish(null), timeoutMs)
    })

    return { promise, stop: () => finish(null) }
  }

  private async tryCaptureMermaidFromCopy(block: Element): Promise<string | undefined> {
    const copyBtn = this.getCodeActionButton(block, 'copy')
    if (!copyBtn) return undefined

    await this.ensurePageCaptureBridge()
    const token = this.createCaptureToken()
    this.armBridge('copy', token)
    this.clickElement(copyBtn)
    const bridgeCaptured = await this.waitBridgeData(token, 1200)
    this.disarmBridge(token)
    if (bridgeCaptured) return bridgeCaptured

    const copyEventPromise = this.waitForEvent<ClipboardEvent>(document, 'copy', {
      timeoutMs: 600,
      capture: true,
    })
    this.clickElement(copyBtn)
    const copyEvent = await copyEventPromise

    const copied = copyEvent?.clipboardData?.getData('text/plain') || ''
    const fromCopyEvent = this.extractMermaidCandidate(copied)
    if (fromCopyEvent) return fromCopyEvent

    try {
      const clipboardText = await navigator.clipboard.readText()
      return this.extractMermaidCandidate(clipboardText)
    } catch {
      return undefined
    }
  }

  private async tryCaptureMermaidFromDownload(block: Element): Promise<string | undefined> {
    const downloadBtn = this.getCodeActionButton(block, 'download')
    if (!downloadBtn) return undefined

    await this.ensurePageCaptureBridge()
    const token = this.createCaptureToken()
    this.armBridge('download', token)
    this.clickElement(downloadBtn)
    const bridgeCaptured = await this.waitBridgeData(token, 1800)
    this.disarmBridge(token)
    if (bridgeCaptured) return bridgeCaptured

    const clickAnchorPromise = this
      .waitForEvent<MouseEvent>(document, 'click', {
        timeoutMs: 1200,
        capture: true,
        filter: (raw) => {
          const event = raw as MouseEvent
          const anchor = this.getSupportedDownloadAnchor(event.target)
          if (!anchor) return false
          event.preventDefault()
          event.stopPropagation()
          return true
        },
      })
      .then((event) => this.getSupportedDownloadAnchor(event?.target ?? null))

    const mutationWatcher = this.createDownloadAnchorObserver(1200)

    this.clickElement(downloadBtn)

    let anchor: HTMLAnchorElement | null = null
    try {
      anchor = await Promise.race([clickAnchorPromise, mutationWatcher.promise])
    } finally {
      mutationWatcher.stop()
    }
    if (!anchor) return undefined

    const href = anchor.getAttribute('href') || anchor.href || ''
    const text = await this.parseDownloadHrefText(href)
    return this.extractMermaidCandidate(text || '')
  }

  private async preloadMermaidCodesByActions(): Promise<void> {
    this.mermaidCodeQueueByAssistantId.clear()

    const assistants = Array.from(
      document.querySelectorAll<HTMLElement>(`${ASSISTANT_ITEM_SELECTOR}[id^="qwen-chat-message-assistant-"]`),
    )

    for (const assistant of assistants) {
      const assistantId = this.extractAssistantId(assistant)
      if (!assistantId) continue

      const mermaidBlocks = this.getMermaidCodeBlocks(assistant)
      if (mermaidBlocks.length === 0) continue

      const codes: string[] = []
      console.debug('[QwenIntlAdapter] mermaid blocks', { assistantId, count: mermaidBlocks.length })

      for (const block of mermaidBlocks) {
        if (codes.length >= mermaidBlocks.length) break

        const byCopy = await this.tryCaptureMermaidFromCopy(block)
        if (byCopy) {
          console.debug('[QwenIntlAdapter] mermaid captured by copy', { assistantId })
          codes.push(byCopy)
          continue
        }

        const byDownload = await this.tryCaptureMermaidFromDownload(block)
        if (byDownload) {
          console.debug('[QwenIntlAdapter] mermaid captured by download', { assistantId })
          codes.push(byDownload)
          continue
        }

        const byReactPayload = this.extractMermaidFromReactPayload(block)
        if (byReactPayload) {
          console.debug('[QwenIntlAdapter] mermaid captured by react payload', { assistantId })
          codes.push(byReactPayload)
        }
      }

      if (codes.length > 0) {
        console.debug('[QwenIntlAdapter] mermaid queue ready', { assistantId, count: codes.length })
        this.mermaidCodeQueueByAssistantId.set(assistantId, codes)
      } else {
        console.debug('[QwenIntlAdapter] mermaid capture failed', { assistantId })
      }
    }
  }

  private getThinkingCards(assistantId: string): Element[] {
    return Array.from(
      document.querySelectorAll(
        `.splitter-container-right-panel .qwen-chat-thinking-status-card[data-phase-id^="${assistantId}_"]`,
      ),
    )
  }

  private async waitForThinkingPanelReady(assistantId: string, timeoutMs = 4000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const cards = this.getThinkingCards(assistantId)
      if (cards.length > 0) {
        const hasContent = cards.some((card) => {
          const content = (card.querySelector('.qwen-markdown')?.textContent || '')
            .replace(/\s+/g, '')
            .trim()
          return content.length > 0
        })
        if (hasContent) return true
      }
      await this.sleep(80)
    }

    return false
  }

  private getThinkingTriggers(messageEl: Element): HTMLElement[] {
    const selectors = [
      '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-tool-status-card',
      '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-completed',
      '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-title',
      '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-title-text',
      '.qwen-chat-thinking-tool-status-card-wraper',
    ]

    const triggers: HTMLElement[] = []
    const seen = new Set<HTMLElement>()

    for (const selector of selectors) {
      const nodes = Array.from(messageEl.querySelectorAll<HTMLElement>(selector))
      for (const node of nodes) {
        if (seen.has(node)) continue
        seen.add(node)
        triggers.push(node)
      }
    }

    return triggers
  }

  private clickElement(el: HTMLElement): void {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
    el.click()
  }

  private async openThinkingPanelForAssistant(messageEl: Element, assistantId: string): Promise<boolean> {
    const triggers = this.getThinkingTriggers(messageEl)
    if (triggers.length === 0) return false

    for (let round = 0; round < 3; round++) {
      for (const trigger of triggers) {
        this.clickElement(trigger)
      }

      const ready = await this.waitForThinkingPanelReady(assistantId, 2000)
      if (ready) return true

      await this.sleep(120)
    }

    return false
  }

  private closeThinkingPanelIfOpenedByAdapter(panelWasOpen: boolean): void {
    if (panelWasOpen) return
    const closeBtn
      = document.querySelector<HTMLElement>(
        '.splitter-container-right-panel .qwen-chat-thinking-and-sources-header .anticon',
      )
        || document.querySelector<HTMLElement>(
          '.splitter-container-right-panel .qwen-chat-thinking-and-sources-header [role="img"]',
        )
    if (closeBtn) this.clickElement(closeBtn)
  }

  private async preloadThinkingByClicking(): Promise<void> {
    this.thinkingByAssistantId.clear()

    const panelWasOpen = !!document.querySelector('.splitter-container-right-panel')
    const assistants = Array.from(
      document.querySelectorAll<HTMLElement>(`${ASSISTANT_ITEM_SELECTOR}[id^="qwen-chat-message-assistant-"]`),
    )

    for (const assistant of assistants) {
      const assistantId = this.extractAssistantId(assistant)
      if (!assistantId) continue

      let ready = await this.waitForThinkingPanelReady(assistantId, 200)
      if (!ready) {
        ready = await this.openThinkingPanelForAssistant(assistant, assistantId)
      }
      if (!ready) continue

      // 等待一次渲染帧，确保右侧内容稳定
      await this.nextFrame()
      await this.sleep(50)

      const thinking = this.extractThinkingFromRightPanel(assistantId)
      if (thinking) {
        this.thinkingByAssistantId.set(assistantId, thinking)
      }
    }

    this.closeThinkingPanelIfOpenedByAdapter(panelWasOpen)
  }

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    this.ensureThinkingScope()

    if (this.shouldInteractWithUi(options)) {
      console.debug('[QwenIntlAdapter] interactive collect: preload thinking + mermaid')
      await this.preloadThinkingByClicking()
      await this.preloadMermaidCodesByActions()
    } else {
      this.mermaidCodeQueueByAssistantId.clear()
    }

    return super.collect(options)
  }

  private extractAssistantId(messageEl: Element): string | null {
    const id = messageEl.getAttribute('id') || ''
    const match = id.match(/^qwen-chat-message-assistant-(.+)$/)
    return match ? match[1] : null
  }

  private isGenericThinkingTitle(title: string): boolean {
    const normalized = title.replace(/\s+/g, '').toLowerCase()
    return normalized === '已经完成思考'
      || normalized === '已完成思考'
      || normalized === 'thinkingcompleted'
  }

  private extractThinkingFromRightPanel(assistantId: string): string | undefined {
    const cards = document.querySelectorAll(
      `.splitter-container-right-panel .qwen-chat-thinking-status-card[data-phase-id^="${assistantId}_"]`,
    )
    if (cards.length === 0) return undefined

    const chunks: string[] = []
    cards.forEach((card) => {
      const title = this.extractText(card.querySelector('.qwen-chat-thinking-status-card-title-text'))
      const body = this.extractMarkdown(card.querySelector('.qwen-markdown')).trim()

      if (title && !this.isGenericThinkingTitle(title)) {
        chunks.push(body ? `${title}\n${body}` : title)
      } else if (body) {
        chunks.push(body)
      }
    })

    const thinking = chunks.join('\n\n').trim()
    return thinking || undefined
  }

  override getTitle(): string {
    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*(Qwen|通义千问|千问)\s*$/i, '')
      .trim()

    if (pageTitle && pageTitle.length > 1) return pageTitle

    const firstUser = document.querySelector('.qwen-chat-message-user .user-message-content')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  protected override preprocessClone(clone: Element): void {
    clone
      .querySelectorAll(
        '.message-hoc-container, .qwen-chat-package-comp-new-action-control, .copy-response-button',
      )
      .forEach((el) => el.remove())

    clone.querySelectorAll('.qwen-markdown-paragraph').forEach((p) => p.append('\n\n'))

    // 国际版表格：替换整个 wrapper，避免表头工具栏等污染正文
    clone.querySelectorAll('.qwen-markdown-table-wrapper').forEach((wrapper) => {
      const table = wrapper.querySelector('table')
      if (!table) {
        wrapper.remove()
        return
      }

      const md = this.tableToMarkdown(table)
      if (md) wrapper.replaceWith(md)
    })
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (md) table.replaceWith(md)
    })

    // 国际版代码块：优先提取源码；mermaid 提取失败时降噪占位，避免 SVG 样式噪声
    clone.querySelectorAll('.qwen-markdown-code').forEach((block) => {
      const body = block.querySelector('.qwen-markdown-code-body')
      const className = (body?.getAttribute('class') || block.getAttribute('class') || '').toLowerCase()
      const hasMermaidChart = !!block.querySelector('.qwen-markdown-mermaid-chart, svg.flowchart')
      const isMermaid = className.includes('mermaid') || hasMermaidChart

      const code = this.extractCodeText(block)
      const detectedLang = this.detectCodeLanguage(block, isMermaid ? 'mermaid' : '')
      const lang = isMermaid ? 'mermaid' : detectedLang

      const queueCode = isMermaid && this.currentAssistantId
        ? this.mermaidCodeQueueByAssistantId.get(this.currentAssistantId)?.shift()
        : undefined
      const queueMermaidCode = queueCode ? this.extractMermaidCandidate(queueCode) : undefined
      if (queueMermaidCode) {
        block.replaceWith(`\n\`\`\`mermaid\n${queueMermaidCode}\n\`\`\`\n`)
        return
      }

      if (code.trim()) {
        const finalCode = isMermaid
          ? this.extractMermaidCandidate(code) || ''
          : code

        const canUse = isMermaid ? this.isMermaidContent(finalCode) : true
        if (canUse && finalCode.trim()) {
          block.replaceWith(`\n\`\`\`${lang}\n${finalCode}\n\`\`\`\n`)
          return
        }
      }

      if (isMermaid) {
        // 兜底改为 text fence，避免触发 mermaid 解析报错
        block.replaceWith('\n```text\n[Mermaid 图表已渲染，原始源码未在 DOM 中暴露]\n```\n')
        return
      }

      block.remove()
    })

    // 清理残留渲染层
    clone.querySelectorAll(
      '.qwen-markdown-code-header-wrapper, .qwen-markdown-mermaid-chart-wrapper, .qwen-markdown-mermaid-chart, svg.flowchart, .qwen-markdown-table-header',
    ).forEach((el) => el.remove())
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const root = document.querySelector('#chat-message-container') || document

    const items = root.querySelectorAll(MESSAGE_ITEM_SELECTOR)
    for (const item of Array.from(items)) {
      // ── 用户消息 ──
      if (item.matches(USER_ITEM_SELECTOR)) {
        const textEl
          = item.querySelector('.chat-user-message .user-message-content')
            || item.querySelector('.user-message-content')
        const text = textEl ? this.extractText(textEl) : ''
        if (!text.trim()) continue

        messages.push({
          id: this.generateMessageId(),
          role: 'user',
          content: text.trim(),
          timestamp: Date.now(),
        })
        continue
      }

      if (!item.matches(ASSISTANT_ITEM_SELECTOR)) continue

      // ── AI 回复 ──
      const markdownEls = Array.from(
        item.querySelectorAll('.response-message-content .custom-qwen-markdown .qwen-markdown'),
      )
      const markdownEl = markdownEls.length > 0
        ? markdownEls[markdownEls.length - 1]
        : item.querySelector('.response-message-content .qwen-markdown')

      this.currentAssistantId = this.extractAssistantId(item)
      let content = ''
      try {
        content = markdownEl ? this.extractMarkdown(markdownEl) : ''
      } finally {
        this.currentAssistantId = null
      }
      if (!content.trim()) continue

      const assistantId = this.extractAssistantId(item)
      const panelThinking = assistantId
        ? (
            this.thinkingByAssistantId.get(assistantId)
            || this.extractThinkingFromRightPanel(assistantId)
          )
        : undefined

      // 未展开右侧思考面板时，仅保留非通用标题（避免“已完成思考”噪声）
      const inlineThinkingTitle = this.extractText(
        item.querySelector(
          '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-title-text',
        ),
      )
      const thinking = panelThinking
        || (
          inlineThinkingTitle && !this.isGenericThinkingTitle(inlineThinkingTitle)
            ? inlineThinkingTitle
            : undefined
        )

      messages.push({
        id: this.generateMessageId(),
        role: 'assistant',
        content: content.trim(),
        timestamp: Date.now(),
        ...(thinking ? { thinking } : {}),
      })
    }

    return messages
  }
}
