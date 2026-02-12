/**
 * ChatGPT 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

export class ChatGPTAdapter extends BaseAdapter {
  override getTitle(): string {
    // 优先用 config.titleSelector（侧边栏标题）
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    // 页面标题 fallback
    const pageTitle = document.title.replace(' | ChatGPT', '').replace('ChatGPT', '').trim()
    if (pageTitle && pageTitle !== 'ChatGPT') return pageTitle

    // 第一条用户消息
    const firstUserMessage = document.querySelector('[data-message-author-role="user"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const messageElements = document.querySelectorAll('[data-message-author-role]')

    messageElements.forEach((el) => {
      const role = el.getAttribute('data-message-author-role')
      if (role !== 'user' && role !== 'assistant') return

      const contentEl = el.querySelector('.markdown, .whitespace-pre-wrap')
      if (!contentEl) return

      const content = this.extractMarkdown(contentEl)
      if (!content) return

      messages.push({
        id: this.generateMessageId(),
        role: role as 'user' | 'assistant',
        content,
        timestamp: Date.now(),
      })
    })

    return messages
  }
}
