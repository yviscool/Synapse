/**
 * Claude 平台适配器
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class ClaudeAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(' - Claude', '').trim()
    if (pageTitle && pageTitle !== 'Claude') return pageTitle

    const firstUserMessage = document.querySelector('[data-testid="user-message"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const messageContainers = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]')

    messageContainers.forEach((container) => {
      const isUser = container.getAttribute('data-testid') === 'user-message'
      const role = isUser ? 'user' : 'assistant'

      const contentEl = container.querySelector('.prose, .whitespace-pre-wrap')
      const content = contentEl ? this.extractMarkdown(contentEl) : this.extractText(container)

      if (!content) return

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
