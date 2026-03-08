/**
 * Grok 平台适配器
 *
 * DOM 结构（2026-02）：
 *   div.overflow-y-auto.scrollbar-gutter-stable (滚动容器)
 *     └── div.relative.flex.w-full.flex-col (内容区)
 *           ├── div.group.items-end [id="response-xxx"]     ← 用户消息
 *           │     └── div.message-bubble.bg-surface-l1
 *           │           └── div.response-content-markdown
 *           │                 └── p.whitespace-pre-wrap      ← 用户文本
 *           ├── div.group.items-start [id="response-xxx"]   ← AI 回复
 *           │     └── div.message-bubble.w-full
 *           │           ├── 点击 notes 按钮后右侧面板显示 thinking（可选）
 *           │           └── div.response-content-markdown    ← 主回复
 *           └── ...
 *
 *   标题：document.title（去掉 " - Grok" 后缀）
 *   代码块：pre > code（标准 shiki 高亮），mermaid 可能为图表渲染态
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'
import {
  collectGrokMermaidTargets,
  extractGrokMermaidCode,
  isGrokMermaidBlock,
} from './grok-mermaid'

const ASSISTANT_GROUP_SELECTOR = 'div.group.items-start[id^="response-"]'
const ALL_GROUP_SELECTOR = 'div.group[id^="response-"]'

export class GrokAdapter extends BaseAdapter {
  private thinkingByAssistantId = new Map<string, string>()
  private thinkingCacheScope = ''

  private getThinkingScope(): string {
    return this.getConversationId() || `${window.location.origin}${window.location.pathname}`
  }

  private ensureThinkingScope(): void {
    const scope = this.getThinkingScope()
    if (scope === this.thinkingCacheScope) return

    this.thinkingCacheScope = scope
    this.thinkingByAssistantId.clear()
  }

  private isMermaidBlock(block: Element): boolean {
    return isGrokMermaidBlock(block)
  }

  private extractMermaidCode(block: Element): string {
    return extractGrokMermaidCode(block)
  }

  private collectMermaidTargets(clone: Element): Element[] {
    return collectGrokMermaidTargets(clone)
  }

  private extractAssistantId(messageEl: Element): string | null {
    const id = messageEl.getAttribute('id') || ''
    return /^response-/.test(id) ? id : null
  }

  private isGenericThinkingText(text: string): boolean {
    const normalized = text.replace(/\s+/g, '').toLowerCase()
    return !normalized
      || normalized === 'thinking'
      || normalized === 'thoughts'
      || normalized === '思考'
      || normalized === '思考过程'
      || normalized === '已完成思考'
      || normalized === '已经完成思考'
      || normalized === 'thinkingcompleted'
  }

  private isElementVisible(el: HTMLElement, ignoreOpacity = false): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false

    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if (!ignoreOpacity && style.opacity === '0') return false

    return true
  }

  private simulateHover(el: HTMLElement): void {
    const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window }
    el.dispatchEvent(new MouseEvent('pointerover', opts))
    el.dispatchEvent(new MouseEvent('mouseover', opts))
    el.dispatchEvent(new MouseEvent('mouseenter', opts))
    el.dispatchEvent(new MouseEvent('pointerenter', opts))
    el.dispatchEvent(new MouseEvent('mousemove', opts))
  }

  private simulateClick(el: HTMLElement): void {
    const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window }
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
  }

  private clickElement(el: HTMLElement): void {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
    el.click()
    this.simulateClick(el)
  }

  private warmupThinkingHover(messageEl: Element): void {
    const nodes: HTMLElement[] = []
    const push = (node: Element | null): void => {
      if (!(node instanceof HTMLElement)) return
      if (!nodes.includes(node)) nodes.push(node)
    }

    push(messageEl)
    push(messageEl.querySelector('[class*="group/notes"]'))
    push(messageEl.querySelector('.message-bubble'))
    push(messageEl.querySelector('[class*="notes"]'))

    for (const node of nodes) {
      this.simulateHover(node)
    }
  }

  private getThinkingTriggers(messageEl: Element): HTMLElement[] {
    const selectors = [
      '.thinking-container button.group\\/notes',
      '.thinking-container button',
      '[class*="group-hover/notes:opacity-100"]',
      '[class*="group/notes"] [class*="absolute"][class*="inset-0"][class*="items-center"]',
      '[class*="group/notes"] button',
      '[class*="group/notes"] [role="button"]',
      'button[aria-label*="think" i]',
      'button[aria-label*="思考"]',
      'button[aria-label*="thought" i]',
      'button[aria-label*="reason" i]',
      'button[title*="think" i]',
      'button[title*="思考"]',
      '[data-testid*="think" i]',
      '[data-testid*="note" i]',
    ]

    const triggers: HTMLElement[] = []
    const seen = new Set<HTMLElement>()
    for (const selector of selectors) {
      const nodes = Array.from(messageEl.querySelectorAll<HTMLElement>(selector))
      for (const node of nodes) {
        const clickable = node.closest<HTMLElement>('button, [role="button"], a, [tabindex]') || node
        if (seen.has(clickable)) continue
        const isNotesTrigger = selector.includes('notes') || !!node.closest('[class*="group/notes"]')
        if (!this.isElementVisible(clickable, isNotesTrigger)) continue
        seen.add(clickable)
        triggers.push(clickable)
      }
    }

    return triggers
  }

  private extractInlineThinking(messageEl: Element): string | undefined {
    const selectors = [
      '.thinking-container .response-content-markdown',
      '.thinking-container .markdown',
      '.thinking-container [class*="prose"]',
      '.thinking-container [role="region"]',
      '[class*="thinking-container"] .response-content-markdown',
      '[class*="thinking-container"] .markdown',
      '[class*="thinking-container"] [class*="prose"]',
      '[class*="thinking-container"] [role="region"]',
    ]

    for (const selector of selectors) {
      const el = messageEl.querySelector(selector)
      if (!el) continue
      const text = this.extractMarkdown(el).trim()
      if (!text || this.isGenericThinkingText(text)) continue

      const compact = text.replace(/\s+/g, '').toLowerCase()
      if (/^(?:思考了?\d+(?:\.\d+)?(?:s|秒)|thoughtfor\d+(?:\.\d+)?s)$/.test(compact)) continue

      return text
    }

    return undefined
  }

  private getRightPanelCandidates(): HTMLElement[] {
    const selectors = [
      '.splitter-container-right-panel',
      '.h-dvh.flex-shrink-0.max-w-\\[66\\%\\]',
      'aside',
      '[role="complementary"]',
      '[class*="right-panel"]',
      '[class*="rightPanel"]',
      '[class*="notes-panel"]',
      '[class*="notesPanel"]',
      '[class*="notes-sidebar"]',
      '[class*="notesSidebar"]',
      '[class*="thinking-panel"]',
      '[class*="thinkingPanel"]',
      '[class*="thought-panel"]',
      '[class*="thoughtPanel"]',
      '[class*="drawer"][class*="right"]',
    ]

    const panels: HTMLElement[] = []
    const seen = new Set<HTMLElement>()
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector))
      for (const node of nodes) {
        if (seen.has(node)) continue
        if (!this.isElementVisible(node)) continue
        if (node.closest(ALL_GROUP_SELECTOR)) continue

        const rect = node.getBoundingClientRect()
        if (rect.width < 180 || rect.height < 120) continue
        if (rect.left < window.innerWidth * 0.45) continue

        const text = (node.textContent || '').replace(/\s+/g, '').slice(0, 300)
        const hasCloseButton = !!node.querySelector('button[aria-label*="关闭"], button[aria-label*="close" i]')
        const hasThinkingSignal = /思考结果|查询分析|thinking|thought/i.test(text)
        if (!hasCloseButton && !hasThinkingSignal) continue

        seen.add(node)
        panels.push(node)
      }
    }

    return panels
  }

  private extractThinkingFromPanel(panel: Element): string | undefined {
    const selectors = [
      '.response-content-markdown',
      '.markdown',
      '[class*="markdown"]',
      '[class*="prose"]',
      'article',
      'blockquote',
      '[class*="notes-content"]',
      '[class*="thinking-content"]',
      '[class*="thought-content"]',
    ]

    const chunks: string[] = []
    const nodes = Array.from(panel.querySelectorAll(selectors.join(', ')))
    const candidates = nodes.length > 0 ? nodes : [panel]

    for (const node of candidates) {
      if (node.closest(ALL_GROUP_SELECTOR)) continue
      const text = this.extractMarkdown(node).trim()
      if (!text || this.isGenericThinkingText(text)) continue
      if (!chunks.includes(text)) chunks.push(text)
    }

    const merged = chunks.join('\n\n').trim()
    if (!merged || this.isGenericThinkingText(merged)) return undefined
    return merged
  }

  private getCurrentRightPanelThinking(): string | undefined {
    const panels = this.getRightPanelCandidates()
    let best: string | undefined

    for (const panel of panels) {
      const thinking = this.extractThinkingFromPanel(panel)
      if (!thinking) continue
      if (!best || thinking.length > best.length) {
        best = thinking
      }
    }

    return best
  }

  private async waitForThinkingPanelReady(timeoutMs = 2200): Promise<string | undefined> {
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const current = this.getCurrentRightPanelThinking()
      if (current) {
        return current
      }
      await this.sleep(80)
    }

    return this.getCurrentRightPanelThinking()
  }

  private async closeThinkingPanelIfOpened(): Promise<void> {
    const candidates = this.getRightPanelCandidates()
    if (candidates.length === 0) return

    const closeBtn = candidates
      .map(panel => panel.querySelector<HTMLElement>('button[aria-label*="关闭"], button[aria-label*="close" i]'))
      .find(Boolean)

    if (!closeBtn) return

    this.clickElement(closeBtn)

    const start = Date.now()
    while (Date.now() - start < 800) {
      if (this.getRightPanelCandidates().length === 0) return
      await this.sleep(60)
    }
  }

  private async openThinkingPanelForAssistant(messageEl: Element): Promise<string | undefined> {
    for (let round = 0; round < 3; round++) {
      this.warmupThinkingHover(messageEl)
      await this.sleep(50)

      const triggers = this.getThinkingTriggers(messageEl)
      if (triggers.length === 0) continue

      for (const trigger of triggers) {
        this.clickElement(trigger)
      }

      const ready = await this.waitForThinkingPanelReady(1600)
      if (ready) return ready

      await this.sleep(120)
    }

    return undefined
  }

  private async preloadThinkingByClicking(): Promise<void> {
    this.thinkingByAssistantId.clear()

    const assistants = Array.from(
      document.querySelectorAll<HTMLElement>(ASSISTANT_GROUP_SELECTOR),
    )

    for (const assistant of assistants) {
      const assistantId = this.extractAssistantId(assistant)
      if (!assistantId) continue

      // Grok 思考详情通常仅在点击正文按钮后渲染到右侧抽屉：优先点击采集
      await this.closeThinkingPanelIfOpened()
      const panelThinking = await this.openThinkingPanelForAssistant(assistant)
      if (panelThinking) {
        this.thinkingByAssistantId.set(assistantId, panelThinking)
        continue
      }

      // 回退：仅当消息内本身已包含思考正文时使用
      const inlineThinking = this.extractInlineThinking(assistant)
      if (inlineThinking) {
        this.thinkingByAssistantId.set(assistantId, inlineThinking)
      }
    }
  }

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    this.ensureThinkingScope()

    if (this.shouldInteractWithUi(options)) {
      await this.preloadThinkingByClicking()
    }

    return super.collect(options)
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    return this.resolveTitleFallback({
      removeSuffixPatterns: [/\s*[-–—]\s*Grok\s*$/i],
      denylist: ['Grok'],
      firstUserSelectors: [`${ALL_GROUP_SELECTOR}.items-end .response-content-markdown`],
    })
  }

  protected override preprocessClone(clone: Element): void {
    clone.querySelectorAll(
      '.message-actions, .message-toolbar, [class*="copy-button"], [class*="CopyButton"], [class*="response-actions"], [class*="responseActions"]',
    ).forEach((el) => el.remove())

    for (const table of Array.from(clone.querySelectorAll('table'))) {
      if (!table.isConnected) continue
      const md = this.tableToMarkdown(table)
      if (!md) continue

      const wrapper = table.closest(
        '[class*="table-wrapper"], [class*="tableWrapper"], [class*="table-container"], [class*="tableContainer"], [class*="table-scroll"], [class*="tableScroll"], figure',
      )

      if (wrapper && wrapper !== clone && wrapper.contains(table)) {
        wrapper.replaceWith(md)
      } else {
        table.replaceWith(md)
      }
    }

    const mermaidTargets = this.collectMermaidTargets(clone)
    for (const target of mermaidTargets) {
      if (!target.isConnected) continue
      if (!this.isMermaidBlock(target)) continue

      const code = this.extractMermaidCode(target)
      if (code) {
        target.replaceWith(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`)
      } else {
        target.replaceWith('\n```text\n[Mermaid 图表已渲染，原始源码未在 DOM 中暴露]\n```\n')
      }
    }

    clone.querySelectorAll(
      '[class*="mermaid-toolbar"], [class*="mermaidToolbar"], [class*="diagram-actions"], svg.flowchart, svg[id^="mermaid"]',
    ).forEach((el) => {
      if (el.closest('pre, code')) return
      el.remove()
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 所有消息容器：带 id="response-xxx" 的 div.group
    const allMsgGroups = document.querySelectorAll(ALL_GROUP_SELECTOR)

    for (const group of Array.from(allMsgGroups)) {
      const isUser = group.classList.contains('items-end')
      const isAssistant = group.classList.contains('items-start')

      if (isUser) {
        const contentEl = group.querySelector('.response-content-markdown')
        const text = contentEl ? this.extractText(contentEl) : ''
        if (text.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
          })
        }
      } else if (isAssistant) {
        const assistantId = this.extractAssistantId(group)
        const cachedThinking = assistantId
          ? this.thinkingByAssistantId.get(assistantId)
          : undefined
        const inlineThinking = this.extractInlineThinking(group)
        const thinking = cachedThinking || inlineThinking

        // 主回复
        const markdownEls = Array.from(group.querySelectorAll('.response-content-markdown'))
        const contentEl = markdownEls.length > 0
          ? markdownEls[markdownEls.length - 1]
          : null
        const content = contentEl ? this.extractMarkdown(contentEl) : ''

        if (content.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'assistant',
            content: content.trim(),
            timestamp: Date.now(),
            ...(thinking ? { thinking } : {}),
          })
        }
      }
    }

    return messages
  }
}
