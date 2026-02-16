/**
 * MiniMax (海螺AI) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #message-container
 *     └── div[data-msg-id]
 *           ├── .message.sent                          ← 用户消息
 *           │     └── .message-content .text-pretty
 *           └── .message.received                      ← AI 回复
 *                 ├── .think-container                  ← thinking（可选）
 *                 └── .matrix-markdown                  ← 主回复
 *
 *   标题：顶部 tab 区域 .truncate.flex-1 或 document.title
 *   代码块：.matrix-markdown pre > code
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class MiniMaxAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*海螺AI\s*$/i, '').trim()
    if (pageTitle && pageTitle !== '海螺AI') return pageTitle

    const firstUser = document.querySelector('.message.sent .message-content .text-pretty')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  /** MiniMax 的 getConversationId 从 query param 提取 */
  override getConversationId(): string | null {
    const url = new URL(window.location.href)
    return url.searchParams.get('id')
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const msgBlocks = document.querySelectorAll('#message-container div[data-msg-id]')

    for (const block of Array.from(msgBlocks)) {
      // ── 用户消息 ──
      const sentEl = block.querySelector('.message.sent')
      if (sentEl) {
        const textEl = sentEl.querySelector('.message-content .text-pretty')
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
      const recvEl = block.querySelector('.message.received')
      if (recvEl) {
        // thinking 内容
        let thinking: string | undefined
        const thinkContainer = recvEl.querySelector('.think-container')
        if (thinkContainer) {
          // thinking 文本在折叠区域的第二个子 div 内
          const thinkText = thinkContainer.querySelector('.relative.pl-5')
          if (thinkText) {
            thinking = this.extractText(thinkText).trim() || undefined
          }
        }

        // 主回复
        const markdownEl = recvEl.querySelector('.matrix-markdown')
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
      }
    }

    return messages
  }
}
