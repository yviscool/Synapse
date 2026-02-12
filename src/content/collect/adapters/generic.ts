/**
 * 通用适配器 - 用于未专门适配的平台
 * 尝试通过通用选择器采集对话
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

export class GenericAdapter extends BaseAdapter {

  // 通用消息选择器
  private readonly MESSAGE_SELECTORS = [
    '[data-message-author-role]',
    '[data-role]',
    '[class*="message"]',
    '[class*="chat-item"]',
    '[class*="conversation-turn"]',
    '.user-message, .assistant-message',
    '.human, .ai',
  ]

  // 用户消息标识
  private readonly USER_INDICATORS = [
    'user', 'human', 'you', 'me', 'self',
  ]

  // AI 消息标识
  private readonly AI_INDICATORS = [
    'assistant', 'ai', 'bot', 'model', 'gpt', 'claude', 'gemini',
  ]

  isConversationPage(): boolean {
    // 检查页面是否包含对话元素
    for (const selector of this.MESSAGE_SELECTORS) {
      if (document.querySelector(selector)) {
        return true
      }
    }
    return false
  }

  getConversationId(): string | null {
    // 尝试从 URL 提取 ID
    const patterns = [
      /\/chat\/([a-zA-Z0-9_-]+)/,
      /\/c\/([a-zA-Z0-9_-]+)/,
      /\/conversation\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = window.location.href.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  getTitle(): string {
    // 从页面标题获取
    const pageTitle = document.title
      .replace(/[-|·].*$/, '')
      .trim()

    if (pageTitle && pageTitle.length > 2) {
      return pageTitle
    }

    return '未命名对话'
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    let messageElements: Element[] = []

    // 尝试各种选择器
    for (const selector of this.MESSAGE_SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        messageElements = Array.from(elements)
        break
      }
    }

    messageElements.forEach((el) => {
      const role = this.detectRole(el)
      if (!role) return

      const content = this.extractContent(el)
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

  /**
   * 检测消息角色
   */
  private detectRole(element: Element): 'user' | 'assistant' | null {
    // 检查属性
    const roleAttr = element.getAttribute('data-role') ||
                     element.getAttribute('data-message-author-role') ||
                     element.getAttribute('data-author')

    if (roleAttr) {
      const lower = roleAttr.toLowerCase()
      if (this.USER_INDICATORS.some(i => lower.includes(i))) return 'user'
      if (this.AI_INDICATORS.some(i => lower.includes(i))) return 'assistant'
    }

    // 检查类名
    const className = element.className.toLowerCase()
    if (this.USER_INDICATORS.some(i => className.includes(i))) return 'user'
    if (this.AI_INDICATORS.some(i => className.includes(i))) return 'assistant'

    // 检查子元素
    const text = element.textContent?.toLowerCase() || ''
    const hasUserAvatar = element.querySelector('[class*="user"], [class*="human"]')
    const hasAiAvatar = element.querySelector('[class*="assistant"], [class*="ai"], [class*="bot"]')

    if (hasUserAvatar) return 'user'
    if (hasAiAvatar) return 'assistant'

    return null
  }

  /**
   * 提取消息内容
   */
  private extractContent(element: Element): string {
    // 尝试找到内容容器
    const contentSelectors = [
      '.markdown',
      '.prose',
      '[class*="content"]',
      '[class*="text"]',
      'p',
    ]

    for (const selector of contentSelectors) {
      const contentEl = element.querySelector(selector)
      if (contentEl) {
        return this.extractMarkdown(contentEl)
      }
    }

    return this.extractText(element)
  }
}
