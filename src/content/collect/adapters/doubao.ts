/**
 * 豆包 (Doubao) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   [data-testid="union_message"]
 *     └── [data-testid="message-block-container"]
 *           ├── [data-testid="receive_message"]          ← AI 回复
 *           │     └── [data-message-id]
 *           │           ├── [data-plugin-identifier*="thinking_block"]
 *           │           │     └── [data-testid="think_block_collapse"]
 *           │           │           └── .think-block-container-*  ← thinking 文本
 *           │           └── [data-testid="message_text_content"]  ← 主回复
 *           └── [data-testid="send_message"]             ← 用户消息
 *                 └── [data-testid="message_text_content"]
 *
 *   标题：顶部 .truncate 元素 或 document.title
 *   代码块：.code-block-element-* > pre > code
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

export class DoubaoAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*豆包\s*$/i, '').trim()
    if (pageTitle && pageTitle !== '豆包') return pageTitle

    const firstUser = document.querySelector(
      '[data-testid="send_message"] [data-testid="message_text_content"]'
    )
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * 豆包专用预处理
   * 处理 code-block-element 代码块 + paragraph 元素
   */
  protected override preprocessClone(clone: Element): void {
    // 1. 处理豆包代码块：.code-block-element-* 包含 header(语言) + pre > code
    clone.querySelectorAll('[class*="code-block-element"]').forEach((block) => {
      const langEl = block.querySelector('[class*="title-"] [class*="text-"]')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      block.querySelectorAll('[class*="header-wrapper"], [class*="mask-wrapper"]').forEach((el) => el.remove())
      const pre = block.querySelector('pre')
      const codeText = pre?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 豆包特有的 paragraph 元素
    clone.querySelectorAll('[class*="paragraph-"]').forEach((p) => p.append('\n\n'))
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 查找所有消息块容器
    const blocks = document.querySelectorAll('[data-testid="message-block-container"]')

    for (const block of Array.from(blocks)) {
      // ── 用户消息 ──
      const sendMsg = block.querySelector('[data-testid="send_message"]')
      if (sendMsg) {
        const textEl = sendMsg.querySelector('[data-testid="message_text_content"]')
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
      const recvMsg = block.querySelector('[data-testid="receive_message"]')
      if (recvMsg) {
        // thinking 内容
        let thinking: string | undefined
        const thinkContainer = recvMsg.querySelector('[data-plugin-identifier*="thinking_block"]')
        if (thinkContainer) {
          const thinkTextEl = thinkContainer.querySelector('[data-testid="message_text_content"]')
          if (thinkTextEl) {
            thinking = this.extractText(thinkTextEl).trim() || undefined
          }
        }

        // 主回复：非 thinking 的 message_text_content
        const allTextEls = Array.from(recvMsg.querySelectorAll('[data-testid="message_text_content"]'))
        let content = ''
        for (const el of allTextEls) {
          // 跳过 thinking 块内的
          if (el.closest('[data-plugin-identifier*="thinking_block"]')) continue
          content = this.extractMarkdown(el)
          break
        }

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
