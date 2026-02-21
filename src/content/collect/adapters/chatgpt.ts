/**
 * ChatGPT 平台适配器
 *
 * DOM 结构（2026-02）：
 *   [data-message-author-role="user"|"assistant"]
 *     └── .markdown.prose  ← 回复内容
 *           ├── p / h3 / ul / hr                    ← 普通内容
 *           ├── div[class*="tableContainer"]         ← 表格包装
 *           │     └── div[class*="tableWrapper"]
 *           │           ├── table
 *           │           └── div.sticky (复制按钮)
 *           └── pre                                  ← 代码块（CodeMirror）
 *                 └── ... > .cm-editor > .cm-scroller > .cm-content
 *                             └── span + br (逐行代码)
 *
 *   深度调研报告（Deep Research）：
 *   article[data-turn="assistant"]
 *     └── iframe[title="internal://deep-research"]  ← 报告渲染容器（跨域）
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'
import { MSG } from '@/utils/messaging'

const MERMAID_RE = /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i
const DEEP_RESEARCH_IFRAME_SELECTOR = [
  'iframe[title="internal://deep-research"]',
  'iframe[src*="connector_openai_deep_research"]',
  'iframe[src*="deep_research"]',
  'iframe[src*="deep-research"]',
].join(', ')
const FRAME_DOM_BRIDGE_REQUEST_TYPE = 'synapse:frame-dom-collect'
const FRAME_DOM_BRIDGE_RESPONSE_TYPE = 'synapse:frame-dom-result'

interface DeepResearchFrameSnapshot {
  url?: string
  title: string
  content: string
  html?: string
  collectedAt: number
}

const deepResearchFrameCache = new Map<string, DeepResearchFrameSnapshot>()

export class ChatGPTAdapter extends BaseAdapter {
  private extractMarkdownFromFrameHtml(html: string): string {
    if (!html.trim()) return ''

    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="synapse-frame-root">${html}</div>`, 'text/html')
    const root
      = doc.querySelector('#extended-response-markdown-content')
        || doc.querySelector('[data-test-id="message-content"] .markdown-main-panel')
        || doc.querySelector('main article')
        || doc.querySelector('article')
        || doc.querySelector('#synapse-frame-root')
    if (!root) return ''

    return this.extractMarkdown(root).trim()
  }

  private normalizeFrameSnapshot(raw: {
    url?: string
    title?: string
    content?: string
    html?: string
  }): DeepResearchFrameSnapshot | null {
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    const textContent = typeof raw.content === 'string' ? raw.content.trim() : ''
    const html = typeof raw.html === 'string' ? raw.html.trim() : ''

    const markdownContent = html ? this.extractMarkdownFromFrameHtml(html) : ''
    const content = markdownContent || textContent
    if (!content) return null

    return {
      url,
      title,
      content,
      ...(html ? { html } : {}),
      collectedAt: Date.now(),
    }
  }

  private normalizeUrl(input: string): string {
    try {
      const u = new URL(input)
      u.hash = ''
      return u.toString()
    } catch {
      return input
    }
  }

  private async preloadDeepResearchFrameContentFromBackground(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MSG.CHAT_COLLECT_FRAME_SNAPSHOTS,
      }) as { ok?: boolean; data?: Array<{ url?: string; title?: string; content?: string; html?: string }> }

      if (!response?.ok || !Array.isArray(response.data)) return

      for (const item of response.data) {
        const snapshot = this.normalizeFrameSnapshot(item || {})
        if (!snapshot?.url) continue
        deepResearchFrameCache.set(this.normalizeUrl(snapshot.url), snapshot)
      }
    } catch {
      // ignore
    }
  }

  private createBridgeRequestId(): string {
    try {
      return crypto.randomUUID()
    } catch {
      return `dr-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
  }

  private async requestFrameSnapshot(iframe: HTMLIFrameElement, timeoutMs = 1800): Promise<DeepResearchFrameSnapshot | null> {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) return null

    const requestId = this.createBridgeRequestId()

    return await new Promise<DeepResearchFrameSnapshot | null>((resolve) => {
      let done = false
      let timer: number | undefined

      const finish = (payload: DeepResearchFrameSnapshot | null) => {
        if (done) return
        done = true
        if (timer) window.clearTimeout(timer)
        window.removeEventListener('message', onMessage as EventListener, true)
        resolve(payload)
      }

      const onMessage = (event: MessageEvent) => {
        const data = event.data || {}
        if (data.__synapseBridge !== true) return
        if (data.type !== FRAME_DOM_BRIDGE_RESPONSE_TYPE) return
        if (data.requestId !== requestId) return

        const payload = data.payload || {}
        const normalized = this.normalizeFrameSnapshot({
          url: iframe.getAttribute('src')?.trim() || '',
          title: typeof payload.title === 'string' ? payload.title : '',
          content: typeof payload.content === 'string' ? payload.content : '',
          html: typeof payload.html === 'string' ? payload.html : '',
        })
        if (!normalized) {
          finish(null)
          return
        }

        finish(normalized)
      }

      window.addEventListener('message', onMessage as EventListener, true)
      timer = window.setTimeout(() => finish(null), timeoutMs)

      try {
        frameWindow.postMessage({
          __synapseBridge: true,
          type: FRAME_DOM_BRIDGE_REQUEST_TYPE,
          requestId,
          payload: {
            selectors: [
              '#extended-response-markdown-content',
              '[data-test-id="message-content"] .markdown-main-panel',
              'main article',
              'article',
              'main',
            ],
            maxLength: 200000,
            maxHtmlLength: 400000,
          },
        }, '*')
      } catch {
        finish(null)
      }
    })
  }

  private async requestFrameSnapshotWithRetry(iframe: HTMLIFrameElement, maxRetry = 3): Promise<DeepResearchFrameSnapshot | null> {
    for (let i = 0; i < maxRetry; i++) {
      const snapshot = await this.requestFrameSnapshot(iframe, 1600 + i * 600)
      if (snapshot?.content?.trim()) return snapshot
      await new Promise<void>(resolve => setTimeout(resolve, 120 + i * 120))
    }
    return null
  }

  private async preloadDeepResearchFrameContent(): Promise<void> {
    const iframes = Array.from(
      document.querySelectorAll<HTMLIFrameElement>(DEEP_RESEARCH_IFRAME_SELECTOR),
    )
    if (iframes.length === 0) return

    await Promise.all(iframes.map(async (iframe) => {
      const src = iframe.getAttribute('src')?.trim() || ''
      if (!src) return
      const normalizedSrc = this.normalizeUrl(src)

      const cached = deepResearchFrameCache.get(normalizedSrc)
      if (cached && Date.now() - cached.collectedAt < 5 * 60 * 1000) return

      const snapshot = await this.requestFrameSnapshotWithRetry(iframe)
      if (!snapshot) return

      deepResearchFrameCache.set(normalizedSrc, snapshot)
    }))
  }

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    await this.preloadDeepResearchFrameContentFromBackground()
    await this.preloadDeepResearchFrameContent()
    return super.collect(options)
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(' | ChatGPT', '').replace('ChatGPT', '').trim()
    if (pageTitle && pageTitle !== 'ChatGPT') return pageTitle

    const firstUserMessage = document.querySelector('[data-message-author-role="user"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  protected override preprocessClone(clone: Element): void {
    // 1. CodeMirror 代码块（新版 ChatGPT 使用 cm-editor 渲染代码）
    clone.querySelectorAll('pre').forEach((pre) => {
      const cmContent = pre.querySelector('.cm-content')
      if (!cmContent) return

      // 提取语言标签：遍历 pre 内叶子 div（无子元素），取第一个短文本
      let lang = ''
      for (const div of Array.from(pre.querySelectorAll('div'))) {
        if (div.contains(cmContent)) continue          // 跳过代码编辑器祖先
        if (div.querySelector('button, svg, div')) continue // 跳过含按钮/嵌套 div
        const text = div.textContent?.trim()
        if (text && text.length < 30) { lang = text.toLowerCase(); break }
      }

      // 提取代码：<br> → 换行，再取 textContent
      cmContent.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      const codeText = cmContent.textContent || ''

      // 按内容检测 mermaid（语言标签可能缺失或为通用名）
      if (MERMAID_RE.test(codeText.trim())) lang = 'mermaid'

      pre.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 表格转 Markdown
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (!md) return
      // 替换最外层表格容器，避免复制按钮文本泄漏
      const wrapper = table.closest('[class*="tableContainer"]') || table
      wrapper.replaceWith(md)
    })
  }

  private collectFromArticleTurns(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const turns = document.querySelectorAll('article[data-turn]')
    if (!turns.length) return messages

    turns.forEach((turn) => {
      const role = turn.getAttribute('data-turn')
      if (role !== 'user' && role !== 'assistant') return

      const msg = this.buildMessage(turn, role)
      if (msg) messages.push(msg)
    })

    return messages
  }

  private collectFromRoleElements(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const messageElements = document.querySelectorAll('[data-message-author-role]')

    messageElements.forEach((el) => {
      const role = el.getAttribute('data-message-author-role')
      if (role !== 'user' && role !== 'assistant') return

      const msg = this.buildMessage(el, role)
      if (msg) messages.push(msg)
    })

    return messages
  }

  private buildMessage(container: Element, role: 'user' | 'assistant'): ChatMessage | null {
    const contentEl = container.querySelector('.markdown, .whitespace-pre-wrap')
    const content = contentEl ? this.extractMarkdown(contentEl).trim() : ''

    if (role === 'assistant') {
      const deepResearchMsg = this.buildDeepResearchMessage(container, content)
      if (deepResearchMsg) return deepResearchMsg
    }

    if (!content) return null

    return {
      id: this.generateMessageId(),
      role,
      content,
      timestamp: Date.now(),
    }
  }

  private buildDeepResearchMessage(container: Element, content: string): ChatMessage | null {
    const iframe = container.querySelector<HTMLIFrameElement>(DEEP_RESEARCH_IFRAME_SELECTOR)
    if (!iframe) return null

    const iframeSrc = iframe.getAttribute('src')?.trim() || ''
    const inlineTitle = this.extractText(container.querySelector('h1, h2, h3'))
    const title = inlineTitle || '深度调研报告'
    const cached = iframeSrc ? deepResearchFrameCache.get(this.normalizeUrl(iframeSrc)) : undefined

    let finalContent = content.trim()
    let source = 'iframe'

    if (cached?.content?.trim()) {
      finalContent = cached.content.trim()
      source = 'iframe-bridge'

      if (cached.title && !finalContent.startsWith(cached.title)) {
        finalContent = `${cached.title}\n\n${finalContent}`
      }
    }

    if (iframeSrc) {
      const linkLine = `报告链接：${iframeSrc}`
      if (!finalContent) {
        // 深度调研正文在跨域 iframe 内，主文档侧通常不可直接读取
        finalContent = `${title}\n\n${linkLine}`
      } else if (!finalContent.includes(iframeSrc)) {
        finalContent = `${finalContent}\n\n${linkLine}`
      }
    } else if (!finalContent) {
      finalContent = title
    }

    return {
      id: this.generateMessageId(),
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
      metadata: {
        mode: 'deep-research',
        source,
        ...(iframeSrc ? { iframeSrc } : {}),
      },
    }
  }

  collectMessages(): ChatMessage[] {
    // 新版 ChatGPT 使用 article[data-turn]；旧版保留 data-message-author-role
    const articleMessages = this.collectFromArticleTurns()
    if (articleMessages.length > 0) return articleMessages
    return this.collectFromRoleElements()
  }
}
