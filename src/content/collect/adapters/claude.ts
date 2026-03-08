/**
 * Claude 平台适配器
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class ClaudeAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    return this.resolveTitleFallback({
      removeSuffixPatterns: [/\s*-\s*Claude\s*$/i],
      denylist: ['Claude'],
      firstUserSelectors: ['[data-testid="user-message"]'],
    })
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
