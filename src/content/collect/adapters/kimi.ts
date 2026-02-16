/**
 * Kimi 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #page-layout-container .layout-container
 *     └── #chat-container .layout-content
 *           ├── .layout-header
 *           │     └── .chat-header-content > h2          ← 对话标题
 *           └── .layout-content-main
 *                 └── .chat-content-list
 *                       ├── .chat-content-item-user
 *                       │     └── .segment-user
 *                       │           └── .user-content     ← 用户文本
 *                       ├── .chat-content-item-assistant
 *                       │     └── .segment-assistant
 *                       │           └── .segment-content-box
 *                       │                 ├── .container-block > .thinking-container
 *                       │                 │     └── .toolcall-content-text .markdown ← thinking
 *                       │                 └── .markdown-container > .markdown        ← 主回复
 *                       │                       ├── .table.markdown-table > table
 *                       │                       └── .markdown-container.markdown-mermaid
 *                       │                             ├── .markdown-code-content pre code.language-mermaid
 *                       │                             └── .markdown-preview-content (svg 预览)
 *                       └── ...
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class KimiAdapter extends BaseAdapter {
  private isMermaidContent(code: string): boolean {
    const trimmed = code.trim()
    return /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i.test(trimmed)
  }

  private extractMermaidCode(container: Element): string {
    const directMermaid =
      container.querySelector('.markdown-code-content pre code.language-mermaid') ||
      container.querySelector('.markdown-code-content code.language-mermaid') ||
      container.querySelector('pre code.language-mermaid') ||
      container.querySelector('code.language-mermaid')

    const directText = (directMermaid?.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .trim()
    if (directText) return directText

    const fallback = container.querySelector('.markdown-code-content pre code, pre code, code')
    const fallbackText = (fallback?.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .trim()
    if (this.isMermaidContent(fallbackText)) return fallbackText

    return ''
  }

  /**
   * Kimi markdown 预处理
   * - .paragraph 补换行
   * - 表格转 Markdown
   * - Mermaid 容器转 ```mermaid```，避免采集预览 SVG 样式噪声
   */
  protected override preprocessClone(clone: Element): void {
    clone.querySelectorAll('.paragraph').forEach((p) => p.append('\n\n'))

    clone.querySelectorAll('.markdown-container.markdown-mermaid').forEach((container) => {
      const code = this.extractMermaidCode(container)
      if (code) {
        container.replaceWith(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`)
      } else {
        container.querySelectorAll('.markdown-preview-content, .markdown-header').forEach((el) => el.remove())
      }
    })

    clone.querySelectorAll('.table.markdown-table').forEach((wrapper) => {
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

    clone
      .querySelectorAll(
        '.table-actions, .markdown-header, .markdown-switch, .markdown-preview-content',
      )
      .forEach((el) => el.remove())
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*Kimi\s*$/i, '').trim()
    if (pageTitle && pageTitle !== 'Kimi') return pageTitle

    const firstUser = document.querySelector('.chat-content-item-user .user-content')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const items = document.querySelectorAll(
      '.chat-content-item-user, .chat-content-item-assistant',
    )

    items.forEach((item) => {
      // ── 用户消息 ──
      if (item.classList.contains('chat-content-item-user')) {
        const contentEl = item.querySelector('.user-content')
        const content = contentEl ? this.extractText(contentEl) : ''
        if (content.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now(),
          })
        }
        return
      }

      // ── AI 回复 ──
      // thinking
      let thinking: string | undefined
      const thinkEl = item.querySelector(
        '.thinking-container .toolcall-content-text .markdown, .thinking-container .toolcall-content-text',
      )
      if (thinkEl) {
        thinking = this.extractMarkdown(thinkEl).trim() || undefined
      }

      // 主回复：排除 thinking 内 markdown，兼容新版嵌套结构
      const markdownEl = Array.from(
        item.querySelectorAll('.segment-content-box .markdown-container > .markdown'),
      ).find(el => !el.closest('.thinking-container'))

      const content = markdownEl ? this.extractMarkdown(markdownEl) : ''

      if (content.trim()) {
        messages.push({
          id: this.generateMessageId(),
          role: 'assistant',
          content: content.trim(),
          timestamp: Date.now(),
          ...(thinking ? { thinking } : {}),
        })
      }
    })

    return messages
  }
}
