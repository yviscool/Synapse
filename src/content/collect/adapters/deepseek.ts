/**
 * DeepSeek 平台适配器
 *
 * DOM 结构（2026-02）：
 *   ._765a5cd (根容器)
 *     ├── ._2be88ba (顶栏)
 *     │     └── .afa34042                          ← 对话标题
 *     └── ._2bd7b35 (聊天区)
 *           └── .dad65929 (消息列表)
 *                 ├── ._9663006 (用户消息组)
 *                 │     └── .d29f3d7d.ds-message
 *                 │           └── .fbb737a4         ← 用户文本
 *                 ├── ._4f9bf79 (AI 回复组)
 *                 │     └── .ds-message
 *                 │           ├── .ds-think-content
 *                 │           │     └── .ds-markdown ← thinking
 *                 │           └── .ds-markdown       ← 主回复
 *                 └── ...
 *
 *   代码块：.md-code-block > .md-code-block-banner (.d813de27 = 语言) + pre
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'

// 折叠 thinking 后，DeepSeek 常不再暴露完整思考 DOM。
// 这里按消息身份/内容维护轻量缓存，避免自动同步把已采集到的 thinking 覆盖丢失。
const deepSeekThinkingCache = new Map<string, string>()
const MAX_DEEPSEEK_THINKING_CACHE = 600

interface MermaidTabSwitch {
  chartTab: HTMLElement
  codeTab: HTMLElement
  block: Element
}

interface ThinkingToggleContext {
  trigger: HTMLElement
  messageEl: Element
}

export class DeepSeekAdapter extends BaseAdapter {
  private normalizeThinkingKey(content: string): string {
    return content
      .replace(/\u200B/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240)
  }

  private getAssistantIdentity(node: Element): string | null {
    const attrs = ['data-message-id', 'data-id', 'data-msg-id', 'id']
    for (const attr of attrs) {
      const value = node.getAttribute(attr)?.trim()
      if (value) return value
    }
    return null
  }

  private getThinkingScope(): string {
    return this.getConversationId() || `${window.location.origin}${window.location.pathname}`
  }

  private cacheThinking(key: string, thinking: string): void {
    if (!key || !thinking.trim()) return
    if (deepSeekThinkingCache.has(key)) {
      deepSeekThinkingCache.delete(key)
    }
    deepSeekThinkingCache.set(key, thinking)
    if (deepSeekThinkingCache.size > MAX_DEEPSEEK_THINKING_CACHE) {
      const oldestKey = deepSeekThinkingCache.keys().next().value
      if (oldestKey) {
        deepSeekThinkingCache.delete(oldestKey)
      }
    }
  }

  private getCachedThinking(identity: string | null, content: string): string | undefined {
    const scope = this.getThinkingScope()
    if (identity) {
      const byId = deepSeekThinkingCache.get(`${scope}:id:${identity}`)
      if (byId) return byId
    }
    return deepSeekThinkingCache.get(`${scope}:content:${this.normalizeThinkingKey(content)}`)
  }

  private persistThinking(identity: string | null, content: string, thinking: string): void {
    const normalized = thinking.trim()
    if (!normalized) return
    const scope = this.getThinkingScope()

    if (identity) {
      this.cacheThinking(`${scope}:id:${identity}`, normalized)
    }
    this.cacheThinking(`${scope}:content:${this.normalizeThinkingKey(content)}`, normalized)
  }

  private hasCachedThinkingByIdentity(identity: string | null): boolean {
    if (!identity) return false
    const scope = this.getThinkingScope()
    return deepSeekThinkingCache.has(`${scope}:id:${identity}`)
  }

  /** 模拟用户点击（mousedown → mouseup → click，冒泡），兼容 React 合成事件 */
  private simulateClick(el: HTMLElement): void {
    const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window }
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
  }

  /**
   * 将 mermaid 代码块从"图表"tab 切换到"代码"tab，确保 pre 元素存在
   * 返回需要恢复状态的切换上下文
   */
  private switchMermaidToCodeTab(): MermaidTabSwitch[] {
    const switched: MermaidTabSwitch[] = []
    document.querySelectorAll('.md-code-block .ds-segmented').forEach((seg) => {
      const tabs = Array.from(seg.querySelectorAll<HTMLElement>('[role="tab"]'))
      if (tabs.length < 2) return

      const chartTab = tabs.find((t) => /图表|chart/i.test((t.textContent || '').trim())) || tabs[0]
      const codeTab = tabs.find((t) => /代码|code/i.test((t.textContent || '').trim())) || tabs[1]
      if (!chartTab || !codeTab) return
      if (this.isTabSelected(codeTab)) return

      this.simulateClick(codeTab)
      switched.push({
        chartTab,
        codeTab,
        block: seg.closest('.md-code-block') || seg,
      })
    })
    return switched
  }

  private restoreMermaidTabs(switched: MermaidTabSwitch[]): void {
    switched.forEach(({ chartTab }) => this.simulateClick(chartTab))
  }

  private isTabSelected(tab: HTMLElement): boolean {
    const ariaSelected = tab.getAttribute('aria-selected')
    const className = tab.className.toLowerCase()
    return ariaSelected === 'true' || className.includes('active') || className.includes('selected')
  }

  private hasThinkingContent(messageEl: Element): boolean {
    const thinkBlocks = messageEl.querySelectorAll('.ds-think-content .ds-markdown')
    for (const block of Array.from(thinkBlocks)) {
      const text = (block.textContent || '').replace(/\s+/g, '').trim()
      if (text) return true
    }
    return false
  }

  private isThinkingHeaderText(text: string): boolean {
    const compact = text.replace(/\s+/g, '')
    return /已思考（用时\d+(?:\.\d+)?(?:秒|s)）/i.test(compact)
      || /思考(?:完成|中)?/.test(compact)
      || /thoughtfor\d+(?:\.\d+)?s/i.test(compact)
      || /thinking/i.test(compact)
  }

  private findClickableAncestor(start: HTMLElement, root: Element): HTMLElement {
    let cur: HTMLElement | null = start
    let depth = 0
    while (cur && depth < 6 && root.contains(cur)) {
      const role = cur.getAttribute('role')
      const tabIndex = cur.getAttribute('tabindex')
      if (
        cur.tagName === 'BUTTON'
        || role === 'button'
        || role === 'tab'
        || tabIndex !== null
      ) {
        return cur
      }

      const style = window.getComputedStyle(cur)
      if (style.cursor === 'pointer') return cur

      cur = cur.parentElement
      depth++
    }
    return start
  }

  private getCollapsedThinkingTriggers(messageEl: Element): HTMLElement[] {
    const triggers: HTMLElement[] = []
    const seen = new Set<HTMLElement>()

    // 语义优先：依赖 collapsible 变量与文本，不强依赖混淆 class。
    const semanticBlocks = Array.from(
      messageEl.querySelectorAll<HTMLElement>(
        '[style*="--collapsible-area-title-height"], [class*="collapsible" i], ._74c0879',
      ),
    )

    for (const block of semanticBlocks) {
      if (this.hasThinkingContent(block)) continue

      const label = block.querySelector<HTMLElement>('span, div')
      const text = label?.textContent || block.textContent || ''
      if (!this.isThinkingHeaderText(text)) continue

      const header
        = block.querySelector<HTMLElement>(':scope > ._245c867')
          || block.querySelector<HTMLElement>(':scope > *')
          || label
          || block
      if (!header) continue

      const clickable = this.findClickableAncestor(header, messageEl)
      if (seen.has(clickable)) continue
      seen.add(clickable)
      triggers.push(clickable)
    }

    if (triggers.length > 0) return triggers

    // 最后兜底：直接按“已思考（用时 x 秒）”文本反推可点击祖先。
    const labels = Array.from(messageEl.querySelectorAll<HTMLElement>('span, div')).filter((el) => {
      if (el.closest('.ds-think-content')) return false
      return this.isThinkingHeaderText(el.textContent || '')
    })
    for (const label of labels) {
      const clickable = this.findClickableAncestor(label, messageEl)
      if (seen.has(clickable)) continue
      seen.add(clickable)
      triggers.push(clickable)
    }

    return triggers
  }

  private getThinkingTriggers(messageEl: Element): HTMLElement[] {
    const collapsedTriggers = this.getCollapsedThinkingTriggers(messageEl)
    if (collapsedTriggers.length > 0) return collapsedTriggers

    const nodes = Array.from(
      messageEl.querySelectorAll<HTMLElement>(
        'button, [role="button"], [tabindex], [data-testid*="think" i], [aria-label*="思考"], [aria-label*="think" i], [title*="思考"], [title*="think" i], [class*="think" i], [class*="reason" i]',
      ),
    )

    const triggers: HTMLElement[] = []
    const seen = new Set<HTMLElement>()

    for (const node of nodes) {
      const clickable
        = node.closest<HTMLElement>('button, [role="button"], a, [tabindex]')
          || node
      if (seen.has(clickable)) continue

      const signal = [
        clickable.textContent || '',
        clickable.getAttribute('aria-label') || '',
        clickable.getAttribute('title') || '',
        clickable.getAttribute('data-testid') || '',
        clickable.className || '',
      ]
        .join(' ')
        .toLowerCase()
        .replace(/\s+/g, '')

      // 仅命中思考相关触发器，避免误点复制/菜单按钮。
      const isThinkingTrigger = /思考|think|thought|reason|推理|分析/.test(signal)
      if (!isThinkingTrigger) continue

      const style = window.getComputedStyle(clickable)
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue

      seen.add(clickable)
      triggers.push(clickable)
    }

    return triggers
  }

  private async waitForThinkingReady(messageEl: Element, timeoutMs = 1500): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (this.hasThinkingContent(messageEl)) return true
      await new Promise<void>((r) => setTimeout(r, 80))
    }
    return this.hasThinkingContent(messageEl)
  }

  private async expandUncachedThinking(): Promise<ThinkingToggleContext[]> {
    const expanded: ThinkingToggleContext[] = []
    const container = document.querySelector('.dad65929')
    if (!container) return expanded

    const assistants = Array.from(container.children).filter((el) => el.classList.contains('_4f9bf79'))
    for (const assistant of assistants) {
      if (this.hasThinkingContent(assistant)) continue

      const identity = this.getAssistantIdentity(assistant)
      if (this.hasCachedThinkingByIdentity(identity)) continue

      const triggers = this.getThinkingTriggers(assistant)
      if (triggers.length === 0) continue

      let opened = false
      for (const trigger of triggers) {
        this.simulateClick(trigger)
        const ready = await this.waitForThinkingReady(assistant, 1200)
        if (ready) {
          expanded.push({ trigger, messageEl: assistant })
          opened = true
          break
        }
      }

      if (!opened) {
        await new Promise<void>((r) => setTimeout(r, 60))
      }
    }

    return expanded
  }

  private collapseThinking(expanded: ThinkingToggleContext[]): void {
    for (const item of expanded) {
      if (!item.messageEl.isConnected || !item.trigger.isConnected) continue
      this.simulateClick(item.trigger)
    }
  }

  /**
   * 等待 mermaid 切换到“代码”tab 且 pre 文本可读。
   * 失败时会重试点击 code tab，避免首轮采集拿到空代码块。
   */
  private async waitForMermaidCodeReady(switched: MermaidTabSwitch[], timeoutMs = 2000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      let ready = true

      for (const item of switched) {
        const selected = this.isTabSelected(item.codeTab)
        const pre = item.block.querySelector('pre')
        const hasCode = !!pre && !!(pre.textContent || '').trim()
        if (!selected || !hasCode) {
          ready = false
          this.simulateClick(item.codeTab)
          break
        }
      }

      if (ready) return
      await new Promise<void>((r) => setTimeout(r, 80))
    }
  }

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    const shouldInteractWithUi = this.shouldInteractWithUi(options)

    // 自动同步 + 页面可见：禁止触发 UI 交互，避免干扰阅读状态
    if (!shouldInteractWithUi) {
      return super.collect(options)
    }

    const expandedThinking = await this.expandUncachedThinking()
    const switched = this.switchMermaidToCodeTab()
    try {
      if (switched.length) {
        // 等待 React 重新渲染，让 pre 元素稳定可读
        await this.waitForMermaidCodeReady(switched)
        await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 50)))
      }

      return super.collect(options)
    } finally {
      if (expandedThinking.length) {
        this.collapseThinking(expandedThinking)
      }
      if (switched.length) {
        this.restoreMermaidTabs(switched)
      }
    }
  }

  private extractKatexTex(node: Element): string {
    const annotation = node.querySelector('annotation[encoding="application/x-tex"]')
    return (annotation?.textContent || node.textContent || '').trim()
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*DeepSeek\s*$/i, '').trim()
    if (pageTitle && pageTitle !== 'DeepSeek') return pageTitle

    const firstUser = document.querySelector('.fbb737a4')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  /**
   * DeepSeek 专用预处理
   * 处理 .md-code-block 代码块 + 表格转 Markdown
   */
  protected override preprocessClone(clone: Element): void {
    // 0. 还原 KaTeX 公式（优先从 MathML annotation 提取原始 TeX）
    clone.querySelectorAll('.katex-display, .ds-markdown-math').forEach((displayMath) => {
      const tex = this.extractKatexTex(displayMath)
      if (tex) {
        displayMath.replaceWith(`\n$$${tex}$$\n`)
      }
    })

    clone.querySelectorAll('span.katex').forEach((inlineMath) => {
      if (inlineMath.closest('.katex-display, .ds-markdown-math')) return
      const tex = this.extractKatexTex(inlineMath)
      if (tex) {
        inlineMath.replaceWith(`$${tex}$`)
      }
    })

    // 1. 处理 DeepSeek 代码块：.md-code-block 包含 banner(语言) + pre
    clone.querySelectorAll('.md-code-block').forEach((block) => {
      // 检测 mermaid：带有 图表/代码 分栏 tab 的代码块
      const isMermaid = !!block.querySelector('.ds-segmented')

      const langEl = block.querySelector('.d813de27')
      const lang = isMermaid ? 'mermaid' : langEl?.textContent?.trim().toLowerCase() || ''

      // 提取代码文本：从 pre 获取（在移除其他元素之前）
      const pre = block.querySelector('pre')
      let codeText = ''
      if (pre) {
        const lineSpans = pre.querySelectorAll(':scope > span')
        if (lineSpans.length > 0) {
          codeText = Array.from(lineSpans)
            .map((s) => s.textContent || '')
            .join('\n')
        } else {
          codeText = pre.querySelector('code')?.textContent || pre.textContent || ''
        }
      }
      if (!codeText.trim()) {
        codeText = block.querySelector('code')?.textContent || ''
      }

      // 用纯文本替换整个代码块
      const placeholder = clone.ownerDocument.createTextNode(
        `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`,
      )
      block.parentNode?.replaceChild(placeholder, block)
    })

    // 2. 表格转 Markdown（DeepSeek 回复中常见）
    clone.querySelectorAll('table').forEach((table) => {
      // 清理滚动容器装饰元素
      const scrollArea = table.closest('.ds-scroll-area')
      scrollArea?.querySelectorAll('.ds-scroll-area__gutters').forEach((g) => g.remove())

      const md = this.tableToMarkdown(table)
      if (!md) return

      const target = scrollArea || table
      target.replaceWith(md)
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 消息列表容器
    const container = document.querySelector('.dad65929')
    if (!container) return messages

    // 遍历直接子元素，按顺序区分用户/AI
    const children = container.children

    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      // ── 用户消息：._9663006 包含 .d29f3d7d.ds-message ──
      if (child.classList.contains('_9663006')) {
        const userTextEl = child.querySelector('.fbb737a4')
        const text = userTextEl ? this.extractText(userTextEl) : ''
        if (text.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
          })
        }
        continue
      }

      // ── AI 回复：._4f9bf79 包含 .ds-message ──
      if (child.classList.contains('_4f9bf79')) {
        // thinking 内容
        let thinking: string | undefined
        const thinkEl = child.querySelector('.ds-think-content .ds-markdown')
        if (thinkEl) {
          thinking = this.extractMarkdown(thinkEl).trim() || undefined
        }

        // 主回复：直接子级 .ds-markdown（排除 thinking 内的）
        const allMarkdowns = child.querySelectorAll(':scope > .ds-message > .ds-markdown')
        let content = ''
        if (allMarkdowns.length > 0) {
          // 取最后一个 .ds-markdown（thinking 之后的主回复）
          const mainMarkdown = allMarkdowns[allMarkdowns.length - 1]
          content = this.extractMarkdown(mainMarkdown)
        }

        if (content.trim()) {
          const identity = this.getAssistantIdentity(child)
          if (thinking?.trim()) {
            this.persistThinking(identity, content, thinking)
          } else {
            thinking = this.getCachedThinking(identity, content)
          }

          messages.push({
            id: this.generateMessageId(),
            role: 'assistant',
            content: content.trim(),
            timestamp: Date.now(),
            ...(thinking ? { thinking } : {}),
          })
        }
        continue
      }
    }

    return messages
  }
}
