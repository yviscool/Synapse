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
 *                       └── ...
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class KimiAdapter extends BaseAdapter {
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
      const thinkEl = item.querySelector('.thinking-container .toolcall-content-text .markdown')
      if (thinkEl) {
        thinking = this.extractText(thinkEl).trim() || undefined
      }

      // 主回复：segment-content-box 下直接的 .markdown-container（排除 thinking 内的）
      const markdownEl = item.querySelector(
        '.segment-content-box > .markdown-container > .markdown',
      )
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
