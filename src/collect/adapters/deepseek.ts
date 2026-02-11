/**
 * DeepSeek 平台适配器
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class DeepSeekAdapter extends BaseAdapter {
  platform: ChatPlatform = 'deepseek'

  isConversationPage(): boolean {
    return /chat\.deepseek\.com/.test(window.location.href)
  }

  getConversationId(): string | null {
    // DeepSeek URL 格式: /a/chat/s/{session_id}
    const match = window.location.pathname.match(/\/s\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 从侧边栏获取当前对话标题
    const activeItem = document.querySelector('.ds-chat-list-item.active, [class*="active"] .ds-chat-title')
    if (activeItem?.textContent) {
      return this.cleanText(activeItem.textContent)
    }

    // 从页面标题获取
    const pageTitle = document.title.replace(' - DeepSeek', '').trim()
    if (pageTitle && pageTitle !== 'DeepSeek') {
      return pageTitle
    }

    // 使用第一条用户消息
    const firstUserMessage = document.querySelector('[class*="user-message"], [class*="human"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // DeepSeek 消息选择器
    const messageGroups = document.querySelectorAll('[class*="message-group"], [class*="chat-message"]')

    messageGroups.forEach((group) => {
      // 判断角色
      const isUser = group.classList.contains('user') ||
                     group.querySelector('[class*="user"]') !== null ||
                     group.getAttribute('data-role') === 'user'

      const role = isUser ? 'user' : 'assistant'

      // 提取内容
      const contentEl = group.querySelector('[class*="markdown"], [class*="content"], .prose')
      const content = contentEl ? this.extractMarkdown(contentEl) : this.extractText(group)

      if (!content) return

      // DeepSeek 的思考过程
      let thinking: string | undefined
      const thinkingEl = group.querySelector('[class*="thinking"], [class*="reasoning"]')
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
