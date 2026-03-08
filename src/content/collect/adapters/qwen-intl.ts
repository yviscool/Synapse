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

import { BaseAdapter } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'
import { extractMermaidCandidate } from './shared/mermaid'
import {
  detectQwenIntlCodeLanguage,
  extractQwenIntlCodeText,
  extractQwenIntlMermaidFromReactPayload,
  getQwenIntlMermaidCodeBlocks,
} from './qwen-intl-mermaid'
import {
  createQwenIntlDownloadAnchorObserver,
  getQwenIntlCodeActionButton,
  getQwenIntlSupportedDownloadAnchor,
  parseQwenIntlDownloadHrefText,
} from './qwen-intl-capture'
import {
  extractQwenIntlThinkingFromRightPanel,
  getQwenIntlAssistantId,
  getQwenIntlThinkingCards,
  getQwenIntlThinkingCloseButton,
  getQwenIntlThinkingTriggers,
  hasQwenIntlThinkingCardContent,
  isQwenIntlGenericThinkingTitle,
} from './qwen-intl-thinking'

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

  private isMermaidContent(code: string): boolean {
    return !!extractMermaidCandidate(code)
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
    return extractMermaidCandidate(typeof event.detail?.text === 'string' ? event.detail.text : '')
  }

  private extractMermaidFromReactPayload(block: Element): string | undefined {
    return extractQwenIntlMermaidFromReactPayload(block)
  }

  private detectCodeLanguage(block: Element, fallback = ''): string {
    return detectQwenIntlCodeLanguage(block, fallback)
  }

  private extractCodeText(block: Element): string {
    return extractQwenIntlCodeText(block)
  }

  private getMermaidCodeBlocks(root: Element): Element[] {
    return getQwenIntlMermaidCodeBlocks(root)
  }

  private getCodeActionButton(block: Element, type: 'copy' | 'download'): HTMLElement | null {
    return getQwenIntlCodeActionButton(block, type)
  }

  private getSupportedDownloadAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    return getQwenIntlSupportedDownloadAnchor(target)
  }

  private async parseDownloadHrefText(href: string): Promise<string | undefined> {
    return await parseQwenIntlDownloadHrefText(href)
  }

  private createDownloadAnchorObserver(timeoutMs: number): {
    promise: Promise<HTMLAnchorElement | null>
    stop: () => void
  } {
    return createQwenIntlDownloadAnchorObserver(timeoutMs)
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
    const fromCopyEvent = extractMermaidCandidate(copied)
    if (fromCopyEvent) return fromCopyEvent

    try {
      const clipboardText = await navigator.clipboard.readText()
      return extractMermaidCandidate(clipboardText)
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
    return extractMermaidCandidate(text || '')
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
    return getQwenIntlThinkingCards(assistantId)
  }

  private async waitForThinkingPanelReady(assistantId: string, timeoutMs = 4000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const cards = this.getThinkingCards(assistantId)
      if (cards.length > 0 && hasQwenIntlThinkingCardContent(cards)) return true
      await this.sleep(80)
    }

    return false
  }

  private getThinkingTriggers(messageEl: Element): HTMLElement[] {
    return getQwenIntlThinkingTriggers(messageEl)
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
    const closeBtn = getQwenIntlThinkingCloseButton()
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
    return getQwenIntlAssistantId(messageEl)
  }

  private extractThinkingFromRightPanel(assistantId: string): string | undefined {
    return extractQwenIntlThinkingFromRightPanel(
      assistantId,
      (el) => this.extractText(el),
      (el) => this.extractMarkdown(el),
    )
  }

  override getTitle(): string {
    return this.resolveTitleFallback({
      removeSuffixPatterns: [/\s*[-–—|·]\s*(Qwen|通义千问|千问)\s*$/i],
      denylist: ['Qwen', '通义千问', '千问'],
      firstUserSelectors: ['.qwen-chat-message-user .user-message-content'],
      minLength: 1,
    })
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
      const queueMermaidCode = queueCode ? extractMermaidCandidate(queueCode) : undefined
      if (queueMermaidCode) {
        block.replaceWith(`\n\`\`\`mermaid\n${queueMermaidCode}\n\`\`\`\n`)
        return
      }

      if (code.trim()) {
        const finalCode = isMermaid
          ? extractMermaidCandidate(code) || ''
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
          inlineThinkingTitle && !isQwenIntlGenericThinkingTitle(inlineThinkingTitle)
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
