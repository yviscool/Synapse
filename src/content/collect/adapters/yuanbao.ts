/**
 * 腾讯元宝平台适配器
 *
 * DOM 结构（2026-02）：
 *   .agent-chat__list__content
 *     └── .agent-chat__list__item[data-conv-speaker]
 *           ├── [data-conv-speaker="human"]
 *           │     └── .agent-chat__bubble__content .hyc-content-text          ← 用户消息
 *           └── [data-conv-speaker="ai"]
 *                 └── .agent-chat__conv--ai__speech_show
 *                       └── .hyc-component-reasoner
 *                             ├── .hyc-component-reasoner__think-content .hyc-content-md  ← thinking
 *                             └── .hyc-component-reasoner__text .hyc-content-md           ← 主回复
 *
 * 标题：document.title
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class YuanbaoAdapter extends BaseAdapter {
  override getTitle(): string {
    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*腾讯元宝\s*$/i, '')
      .replace(/\s*[-–—|·]\s*元宝\s*$/i, '')
      .trim()

    if (pageTitle && pageTitle.length > 1) return pageTitle
    return DEFAULT_TITLE
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const items = document.querySelectorAll('.agent-chat__list__item[data-conv-speaker]')

    for (const item of Array.from(items)) {
      const speaker = item.getAttribute('data-conv-speaker')

      // ── 用户消息 ──
      if (speaker === 'human') {
        const textEl = item.querySelector('.agent-chat__bubble__content .hyc-content-text')
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
      if (speaker === 'ai') {
        const speeches = item.querySelectorAll('.agent-chat__conv--ai__speech_show')
        const speech = speeches[speeches.length - 1] || item

        // thinking
        let thinking: string | undefined
        const thinkingEl = speech.querySelector(
          '.hyc-component-reasoner__think-content .hyc-content-md',
        )
        if (thinkingEl) {
          thinking = this.extractText(thinkingEl).trim() || undefined
        }

        // 主回复：优先 reasoner 正文；回退到第一个非 thinking 的 markdown 区域
        const mainReplyEl = speech.querySelector(
          '.hyc-component-reasoner__text .hyc-content-md',
        ) || Array.from(speech.querySelectorAll('.hyc-content-md')).find(
          el => !el.closest('.hyc-component-reasoner__think-content'),
        )

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
