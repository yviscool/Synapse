/**
 * 千问 (qianwen.com) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #qwen-message-list-area
 *     ├── .questionItem-*                 ← 用户消息容器
 *     │     └── .bubble-*                 ← 用户文本
 *     └── .answerItem-*                   ← AI 回复容器
 *           ├── [data-card_name="deep_think"] .qk-markdown   ← thinking
 *           └── .markdown-pc-special-class .qk-markdown       ← 主回复
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

const USER_ITEM_SELECTOR = '[class^="questionItem-"], [class*=" questionItem-"]'
const ASSISTANT_ITEM_SELECTOR = '[class^="answerItem-"], [class*=" answerItem-"]'
const USER_BUBBLE_SELECTOR = '[class^="bubble-"], [class*=" bubble-"]'

export class QianwenAdapter extends BaseAdapter {
  private isMermaidBlock(block: Element): boolean {
    const className = (block.getAttribute('class') || '').toLowerCase()
    if (className.includes('mermaid')) return true

    return !!block.querySelector('[data-mode-id="mermaid"], [class*="mermaidChart-"], svg.flowchart')
  }

  private extractMermaidCode(block: Element): string {
    const roots: Element[] = [
      ...Array.from(block.querySelectorAll('[data-mode-id="mermaid"]')),
      ...Array.from(block.querySelectorAll('.monaco-editor')),
      block,
    ]

    for (const root of roots) {
      const lineNodes = root.querySelectorAll('.view-lines .view-line')
      if (lineNodes.length === 0) continue

      const lines = Array.from(lineNodes).map((line) =>
        (line.textContent || '')
          .replace(/\u00A0/g, ' ')
          .replace(/\u200B/g, ''),
      )

      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

      const code = lines.join('\n').trimEnd()
      if (code) return code
    }

    return ''
  }

  override getTitle(): string {
    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*(通义千问|千问|Qwen)\s*$/i, '')
      .trim()

    if (pageTitle && pageTitle.length > 1) return pageTitle

    const firstUser = document.querySelector(
      `#qwen-message-list-area ${USER_ITEM_SELECTOR} ${USER_BUBBLE_SELECTOR}`,
    )
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  /**
   * 千问 markdown 结构使用 div/span + qk-md-* class，补充段落和列表换行。
   */
  protected override preprocessClone(clone: Element): void {
    clone.querySelectorAll(
      '[class^="search-wrapper-"], [class*=" search-wrapper-"], [class^="reference-wrap-"], [class*=" reference-wrap-"]',
    ).forEach((el) => el.remove())

    clone.querySelectorAll('.qk-md-paragraph').forEach((p) => p.append('\n\n'))
    clone.querySelectorAll('.qk-md-li').forEach((li) => {
      const prefix = li.closest('.qk-md-ol') ? '1. ' : '- '
      li.prepend(prefix)
      li.append('\n')
    })

    // 千问表格：替换整段 table section，避免“表格/复制”等工具栏文字污染正文
    clone.querySelectorAll('.qk-md-table-section').forEach((section) => {
      const table = section.querySelector('table')
      if (!table) {
        section.remove()
        return
      }

      const md = this.tableToMarkdown(table)
      if (md) section.replaceWith(md)
    })
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (md) table.replaceWith(md)
    })

    // 千问 mermaid：从 Monaco 行视图重建源码，输出 mermaid fenced code block
    clone.querySelectorAll('[class*="mermaidBox-"], .qw-md-code').forEach((block) => {
      if (!this.isMermaidBlock(block)) return

      const code = this.extractMermaidCode(block)
      if (code) {
        block.replaceWith(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`)
      } else {
        // 代码提取失败时移除图表渲染层，避免把 SVG 样式噪声带入正文
        block.querySelectorAll('svg, style').forEach((el) => el.remove())
      }
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const root = document.querySelector('#qwen-message-list-area') || document

    const items = root.querySelectorAll(`${USER_ITEM_SELECTOR}, ${ASSISTANT_ITEM_SELECTOR}`)
    for (const item of Array.from(items)) {
      // ── 用户消息 ──
      if (item.matches(USER_ITEM_SELECTOR)) {
        const textEl = item.querySelector(USER_BUBBLE_SELECTOR)
        const text = textEl ? this.extractText(textEl) : ''
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

      // ── AI 回复 ──
      if (item.matches(ASSISTANT_ITEM_SELECTOR)) {
        // thinking
        let thinking: string | undefined
        const thinkingEl = item.querySelector(
          '[data-card_name="deep_think"] [class^="thinkingContent-"] .qk-markdown, [data-card_name="deep_think"] .qk-markdown',
        )
        if (thinkingEl) {
          thinking = this.extractMarkdown(thinkingEl).trim() || undefined
        }

        // 主回复：排除 deep_think 卡片内的 markdown
        const mainReplyEl = Array.from(
          item.querySelectorAll('.markdown-pc-special-class .qk-markdown'),
        ).find(el => !el.closest('[data-card_name="deep_think"]'))

        const content = mainReplyEl ? this.extractMarkdown(mainReplyEl) : ''
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
