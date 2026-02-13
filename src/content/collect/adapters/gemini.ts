/**
 * Gemini 平台适配器
 *
 * DOM 结构（2026-02）：
 *   .conversation-container#<id>
 *     ├── user-query
 *     │     └── user-query-content
 *     │           └── .query-content
 *     │                 └── .query-text > p.query-text-line  ← 用户提问文本
 *     └── model-response
 *           └── response-container
 *                 └── .response-container-content
 *                       └── .response-content
 *                             ├── model-thoughts .markdown            ← thinking（可选）
 *                             └── structured-content-container.model-response-text
 *                                   └── message-content
 *                                         └── .markdown.markdown-main-panel
 *                                               ├── p / h3 / ul / hr  ← 普通内容
 *                                               ├── response-element   ← 代码块包装
 *                                               │     └── code-block
 *                                               │           ├── code-block-decoration (语言 + 复制按钮)
 *                                               │           └── pre > code.code-container
 *                                               └── span.math-inline[data-math]  ← KaTeX 公式
 */

import { BaseAdapter } from './base'
import type { CollectResult, CollectOptions } from './base'
import type { ChatMessage } from '@/types/chat'

export class GeminiAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    const pageTitle = document.title
      .replace(/\s*[-–—]\s*(Google\s+)?Gemini\s*$/i, '')
      .trim()
    if (pageTitle) return pageTitle

    const firstQuery = document.querySelector('user-query .query-text')
    if (firstQuery) {
      const text = this.extractText(firstQuery)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * Gemini 专用预处理
   * 处理 KaTeX .math-inline/.math-display + code-block + response-element
   */
  protected override preprocessClone(clone: Element): void {
    // 1. KaTeX 公式：用 data-math 属性还原 LaTeX
    clone.querySelectorAll('.math-inline').forEach((math) => {
      const tex = math.getAttribute('data-math') || math.textContent || ''
      math.replaceWith(`$${tex}$`)
    })
    clone.querySelectorAll('.math-display').forEach((math) => {
      const tex = math.getAttribute('data-math') || math.textContent || ''
      math.replaceWith(`$$${tex}$$`)
    })

    // 2. Gemini code-block 自定义元素
    clone.querySelectorAll('code-block').forEach((block) => {
      const langEl = block.querySelector('code-block-decoration span')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      block.querySelectorAll('code-block-decoration').forEach((d) => d.remove())
      const codeEl = block.querySelector('pre code') || block.querySelector('code')
      const codeText = codeEl?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 3. 清理 response-element 空壳
    clone.querySelectorAll('response-element').forEach((el) => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
      el.remove()
    })
  }

  /**
   * 展开所有折叠的思考区域，使 DOM 中包含 thinking 内容
   * 返回被展开的按钮列表，采集后可恢复
   */
  private expandThoughts(): HTMLElement[] {
    const expanded: HTMLElement[] = []
    document.querySelectorAll('model-thoughts').forEach((mt) => {
      // 如果 thoughts-content 不存在，说明是折叠状态
      if (!mt.querySelector('[data-test-id="thoughts-content"]')) {
        const btn = mt.querySelector('[data-test-id="thoughts-header-button"]') as HTMLElement
        if (btn) {
          btn.click()
          expanded.push(btn)
        }
      }
    })
    return expanded
  }

  /**
   * 恢复折叠状态
   */
  private collapseThoughts(buttons: HTMLElement[]): void {
    buttons.forEach((btn) => btn.click())
  }

  /**
   * 覆写 collect：
   * - 手动采集：展开思考区域，等待 Angular 渲染后再采集，然后恢复折叠
   * - 自动同步：跳过展开/折叠，避免 MutationObserver 死循环（展开→变更→同步→展开…）
   */
  override async collect(options?: CollectOptions): Promise<CollectResult> {
    let expandedBtns: HTMLElement[] = []

    if (!options?.isAutoSync) {
      expandedBtns = this.expandThoughts()
      if (expandedBtns.length) {
        await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 150)))
      }
    }

    const result = super.collect()

    if (expandedBtns.length) {
      this.collapseThoughts(expandedBtns)
    }

    return result
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const containers = document.querySelectorAll('.conversation-container')

    containers.forEach((container) => {
      // ── 用户提问 ──
      const userQuery = container.querySelector('user-query')
      if (userQuery) {
        const queryTextEl = userQuery.querySelector('.query-text')
        const text = queryTextEl ? this.extractText(queryTextEl) : this.extractText(userQuery)
        if (text.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
          })
        }
      }

      // ── AI 回复 ──
      const modelResponse = container.querySelector('model-response')
      if (modelResponse) {
        // thinking 内容
        let thinking: string | undefined
        const thoughtsEl = modelResponse.querySelector('model-thoughts')
        if (thoughtsEl) {
          const parts: string[] = []
          thoughtsEl.querySelectorAll('.markdown').forEach((md) => {
            const t = this.extractText(md).trim()
            if (t) parts.push(t)
          })
          if (parts.length) thinking = parts.join('\n\n')
        }

        // 主回复内容 — 限定在 .model-response-text 内，避免匹配到 thinking 的 .markdown
        const responseEl =
          modelResponse.querySelector('.model-response-text .markdown-main-panel') ||
          modelResponse.querySelector('.model-response-text .markdown') ||
          modelResponse.querySelector('message-content .markdown')
        const content = responseEl ? this.extractMarkdown(responseEl) : ''

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
    })

    return messages
  }
}
