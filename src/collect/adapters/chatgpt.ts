/**
 * ChatGPT 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class ChatGPTAdapter extends BaseAdapter {
  platform: ChatPlatform = 'chatgpt'

  isConversationPage(): boolean {
    const url = window.location.href
    return /chat\.openai\.com\/c\/|chatgpt\.com\/c\//.test(url) ||
           /chat\.openai\.com\/?$|chatgpt\.com\/?$/.test(url)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 尝试从侧边栏获取当前对话标题
    const activeItem = document.querySelector('nav [data-testid="history-item"].bg-token-sidebar-surface-secondary')
    if (activeItem) {
      const titleEl = activeItem.querySelector('div[class*="truncate"]')
      if (titleEl?.textContent) {
        return this.cleanText(titleEl.textContent)
      }
    }

    // 尝试从页面标题获取
    const pageTitle = document.title.replace(' | ChatGPT', '').replace('ChatGPT', '').trim()
    if (pageTitle && pageTitle !== 'ChatGPT') {
      return pageTitle
    }

    // 使用第一条用户消息作为标题
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
