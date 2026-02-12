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
 *           │           ├── div.thinking-container           ← thinking（可选）
 *           │           └── div.response-content-markdown    ← 主回复
 *           └── ...
 *
 *   标题：document.title（去掉 " - Grok" 后缀）
 *   代码块：pre > code（标准 shiki 高亮）
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

export class GrokAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*Grok\s*$/i, '').trim()
    if (pageTitle && pageTitle !== 'Grok') return pageTitle

    const firstUser = document.querySelector(
      'div.group.items-end .response-content-markdown'
    )
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 所有消息容器：带 id="response-xxx" 的 div.group
    const allMsgGroups = document.querySelectorAll(
      'div.group[id^="response-"]'
    )

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
        // thinking
        let thinking: string | undefined
        const thinkContainer = group.querySelector('.thinking-container')
        if (thinkContainer) {
          thinking = this.extractText(thinkContainer).trim() || undefined
        }

        // 主回复
        const contentEl = group.querySelector('.response-content-markdown')
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
