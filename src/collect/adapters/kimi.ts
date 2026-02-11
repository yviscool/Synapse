/**
 * Kimi 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class KimiAdapter extends BaseAdapter {
  platform: ChatPlatform = 'kimi'

  isConversationPage(): boolean {
    return /kimi\.moonshot\.cn\/chat\//.test(window.location.href)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 从侧边栏获取
    const activeItem = document.querySelector('.chat-list-item.active, [class*="selected"] .chat-title')
    if (activeItem?.textContent) {
      return this.cleanText(activeItem.textContent)
    }

    // 从页面标题获取
    const pageTitle = document.title.replace(' - Kimi', '').trim()
    if (pageTitle && pageTitle !== 'Kimi') {
      return pageTitle
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // Kimi 消息选择器
    const messageItems = document.querySelectorAll('[class*="chat-message"], [class*="message-item"]')

    messageItems.forEach((item) => {
      const isUser = item.classList.contains('user') ||
                     item.getAttribute('data-role') === 'user' ||
                     item.querySelector('[class*="user-avatar"]') !== null

      const role = isUser ? 'user' : 'assistant'

      const contentEl = item.querySelector('[class*="markdown"], [class*="content"]')
      const content = contentEl ? this.extractMarkdown(contentEl) : this.extractText(item)

      if (!content) return

      messages.push({
        id: this.generateMessageId(),
        role,
        content,
        timestamp: Date.now(),
      })
    })

    return messages
  }
}
