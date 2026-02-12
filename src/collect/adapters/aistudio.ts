/**
 * Google AI Studio 平台适配器
 *
 * DOM 结构（2026-02）：
 *   .page-title
 *     └── h1.mode-title                                ← 对话标题
 *
 *   ms-chat-turn#turn-{UUID}
 *     └── .chat-turn-container.user | .model
 *           ├── [data-turn-role="User"]
 *           │     └── ms-cmark-node.user-chunk          ← 用户消息
 *           └── [data-turn-role="Model"]
 *                 ├── ms-thought-chunk                   ← thinking（可选）
 *                 │     └── .thought-panel
 *                 │           └── ms-text-chunk
 *                 │                 └── ms-cmark-node.cmark-node
 *                 └── ms-text-chunk
 *                       └── ms-cmark-node.cmark-node    ← 主回复
 *
 *   代码块：ms-code-block > mat-expansion-panel
 *             ├── mat-panel-title span                   ← 语言
 *             └── pre > code                             ← 代码内容
 *   行内代码：span.inline-code
 *   响应耗时：.model-run-time-pill
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class AIStudioAdapter extends BaseAdapter {
  platform: ChatPlatform = 'aistudio'

  isConversationPage(): boolean {
    return /aistudio\.google\.com/.test(window.location.href)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/prompts\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    const titleEl = document.querySelector('h1.mode-title')
    if (titleEl?.textContent?.trim()) {
      return this.cleanText(titleEl.textContent)
    }
    const pageTitle = document.title
      .replace(/\s*[-–—]\s*(Google\s+)?AI\s*Studio\s*$/i, '')
      .trim()
    if (pageTitle && pageTitle !== 'Google AI Studio') return pageTitle

    // fallback: 第一条用户消息
    const firstUser = document.querySelector(
      'ms-chat-turn .chat-turn-container.user ms-cmark-node.user-chunk'
    )
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * AI Studio 专用预处理
   * 处理 ms-code-block + span.inline-code
   */
  protected override preprocessClone(clone: Element): void {
    // 1. ms-code-block：mat-expansion-panel 包含语言标签 + pre > code
    clone.querySelectorAll('ms-code-block').forEach((block) => {
      const langEl = block.querySelector('mat-panel-title span')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      block.querySelectorAll('mat-expansion-panel-header').forEach((h) => h.remove())
      const codeEl = block.querySelector('pre code') || block.querySelector('pre')
      const codeText = codeEl?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 行内代码 span.inline-code（在基类处理 code 之前转换）
    clone.querySelectorAll('span.inline-code').forEach((c) => {
      c.replaceWith(`\`${c.textContent}\``)
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const turns = document.querySelectorAll('ms-chat-turn')

    for (const turn of Array.from(turns)) {
      // ── 用户消息 ──
      const userContainer = turn.querySelector('.chat-turn-container.user')
      if (userContainer) {
        const textEl = userContainer.querySelector('ms-cmark-node.user-chunk')
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
      const modelContainer = turn.querySelector('.chat-turn-container.model')
      if (modelContainer) {
        // thinking 内容
        let thinking: string | undefined
        const thoughtChunk = modelContainer.querySelector('ms-thought-chunk')
        if (thoughtChunk) {
          const thinkTextEl = thoughtChunk.querySelector('ms-text-chunk ms-cmark-node.cmark-node')
          if (thinkTextEl) {
            thinking = this.extractText(thinkTextEl).trim() || undefined
          }
        }

        // 主回复：非 thought-chunk 内的 ms-text-chunk > ms-cmark-node
        const allTextChunks = Array.from(modelContainer.querySelectorAll('ms-text-chunk'))
        let content = ''
        for (const chunk of allTextChunks) {
          // 跳过 thinking 块内的
          if (chunk.closest('ms-thought-chunk')) continue
          const cmarkNode = chunk.querySelector('ms-cmark-node.cmark-node')
          if (cmarkNode) {
            content = this.extractMarkdown(cmarkNode)
            break
          }
        }

        // 响应耗时
        const timePill = modelContainer.querySelector('.model-run-time-pill')
        const metadata: Record<string, unknown> = {}
        if (timePill?.textContent) {
          const timeMatch = timePill.textContent.match(/([\d.]+)s/)
          if (timeMatch) {
            metadata.thinkingDuration = parseFloat(timeMatch[1]) * 1000
          }
        }

        if (content.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'assistant',
            content: content.trim(),
            timestamp: Date.now(),
            ...(thinking ? { thinking } : {}),
            ...(Object.keys(metadata).length ? { metadata } : {}),
          })
        }
      }
    }

    return messages
  }
}
