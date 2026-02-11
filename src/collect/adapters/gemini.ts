/**
 * Gemini 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class GeminiAdapter extends BaseAdapter {
  platform: ChatPlatform = 'gemini'

  isConversationPage(): boolean {
    return /gemini\.google\.com\/app/.test(window.location.href)
  }

  getConversationId(): string | null {
    // Gemini URL 格式: /app/{conversation_id}
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 从页面标题获取
    const pageTitle = document.title.replace(' - Google Gemini', '').replace('Gemini', '').trim()
    if (pageTitle) {
      return pageTitle
    }

    // 使用第一条用户消息
    const firstUserMessage = document.querySelector('[data-message-author="user"], .user-query')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // Gemini 消息选择器
    const turns = document.querySelectorAll('message-content, [class*="conversation-turn"]')

    turns.forEach((turn) => {
      // 判断角色
      const authorAttr = turn.getAttribute('data-message-author')
      const isUser = authorAttr === 'user' ||
                     turn.classList.contains('user-turn') ||
                     turn.querySelector('.user-query') !== null

      const role = isUser ? 'user' : 'assistant'

      // 提取内容
      const contentEl = turn.querySelector('.markdown-main-panel, [class*="response-content"], .model-response-text')
      const content = contentEl ? this.extractMarkdown(contentEl) : this.extractText(turn)

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
