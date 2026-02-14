/**
 * 千问 (qianwen.com) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #qwen-message-list-area
 *     ├── .questionItem-*                 ← 用户消息容器
 *     │     └── .bubble-*                 ← 用户文本
 *     └── .answerItem-*                   ← AI 回复容器
 *           ├── [data-card_name="deep_think"] .qk-markdown   ← thinking
 *           └── .markdown-pc-special-class .qk-markdown       ← 主回复
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

const USER_ITEM_SELECTOR = '[class^="questionItem-"], [class*=" questionItem-"]'
const ASSISTANT_ITEM_SELECTOR = '[class^="answerItem-"], [class*=" answerItem-"]'
const USER_BUBBLE_SELECTOR = '[class^="bubble-"], [class*=" bubble-"]'

export class QianwenAdapter extends BaseAdapter {
  override getTitle(): string {
    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*(通义千问|千问|Qwen)\s*$/i, '')
      .trim()

    if (pageTitle && pageTitle.length > 1) return pageTitle

    const firstUser = document.querySelector(
      `#qwen-message-list-area ${USER_ITEM_SELECTOR} ${USER_BUBBLE_SELECTOR}`,
    )
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * 千问 markdown 结构使用 div/span + qk-md-* class，补充段落和列表换行。
   */
  protected override preprocessClone(clone: Element): void {
    clone.querySelectorAll(
      '[class^="search-wrapper-"], [class*=" search-wrapper-"], [class^="reference-wrap-"], [class*=" reference-wrap-"]',
    ).forEach((el) => el.remove())

    clone.querySelectorAll('.qk-md-paragraph').forEach((p) => p.append('\n\n'))
    clone.querySelectorAll('.qk-md-li').forEach((li) => {
      const prefix = li.closest('.qk-md-ol') ? '1. ' : '- '
      li.prepend(prefix)
      li.append('\n')
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const root = document.querySelector('#qwen-message-list-area') || document

    const items = root.querySelectorAll(`${USER_ITEM_SELECTOR}, ${ASSISTANT_ITEM_SELECTOR}`)
    for (const item of Array.from(items)) {
      // ── 用户消息 ──
      if (item.matches(USER_ITEM_SELECTOR)) {
        const textEl = item.querySelector(USER_BUBBLE_SELECTOR)
        const text = textEl ? this.extractText(textEl) : ''
        if (text.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
          })
        }
        continue
      }

      // ── AI 回复 ──
      if (item.matches(ASSISTANT_ITEM_SELECTOR)) {
        // thinking
        let thinking: string | undefined
        const thinkingEl = item.querySelector(
          '[data-card_name="deep_think"] [class^="thinkingContent-"] .qk-markdown, [data-card_name="deep_think"] .qk-markdown',
        )
        if (thinkingEl) {
          thinking = this.extractMarkdown(thinkingEl).trim() || undefined
        }

        // 主回复：排除 deep_think 卡片内的 markdown
        const mainReplyEl = Array.from(
          item.querySelectorAll('.markdown-pc-special-class .qk-markdown'),
        ).find(el => !el.closest('[data-card_name="deep_think"]'))

        const content = mainReplyEl ? this.extractMarkdown(mainReplyEl) : ''
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
