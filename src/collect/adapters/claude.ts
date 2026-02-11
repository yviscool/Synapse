/**
 * Claude 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class ClaudeAdapter extends BaseAdapter {
  platform: ChatPlatform = 'claude'

  isConversationPage(): boolean {
    return /claude\.ai\/chat\//.test(window.location.href)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 从页面标题获取
    const pageTitle = document.title.replace(' - Claude', '').trim()
    if (pageTitle && pageTitle !== 'Claude') {
      return pageTitle
    }

    // 从侧边栏获取
    const activeItem = document.querySelector('[data-testid="chat-menu-trigger"]')
    if (activeItem?.textContent) {
      return this.cleanText(activeItem.textContent)
    }

    // 使用第一条用户消息
    const firstUserMessage = document.querySelector('[data-testid="user-message"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // Claude 的消息容器
    const messageContainers = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]')

    messageContainers.forEach((container) => {
      const isUser = container.getAttribute('data-testid') === 'user-message'
      const role = isUser ? 'user' : 'assistant'

      // 提取内容
      const contentEl = container.querySelector('.prose, .whitespace-pre-wrap')
      const content = contentEl ? this.extractMarkdown(contentEl) : this.extractText(container)

      if (!content) return

      // 检查是否有思考过程（Claude 的 thinking）
      let thinking: string | undefined
      const thinkingEl = container.querySelector('[data-testid="thinking-content"]')
      if (thinkingEl) {
        thinking = this.extractText(thinkingEl)
      }

      messages.push({
        id: this.generateMessageId(),
        role,
        content,
        thinking,
        timestamp: Date.now(),
      })
    })

    return messages
  }
}
