/**
 * Microsoft Copilot 平台适配器
 *
 * DOM 结构（2026-02）：
 *   [data-testid="highlighted-chats"]
 *     ├── [role="article"][class*="group/user-message"]
 *     │     └── [data-content="user-message"]               ← 用户消息
 *     └── [role="article"][data-content="ai-message"]
 *           └── [class*="group/ai-message-item"]            ← AI 回复正文
 *
 *   特性：
 *   - 代码块：卡片头部含语言/复制按钮，正文在 pre > code
 *   - 表格：standard <table>
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class CopilotAdapter extends BaseAdapter {
  override isConversationPage(): boolean {
    if (!super.isConversationPage()) return false
    return !!document.querySelector('[data-content="user-message"], [data-content="ai-message"]')
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title
      .replace(/\s*[-–—|]\s*(Microsoft\s+)?Copilot\s*$/i, '')
      .trim()
    if (pageTitle && !/^copilot$/i.test(pageTitle)) return pageTitle

    const firstUser = document.querySelector('[data-content="user-message"]')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  override getConversationId(): string | null {
    const fromConfig = super.getConversationId()
    if (fromConfig) return fromConfig

    const url = new URL(window.location.href)
    const searchParamKeys = ['conversationId', 'conversation', 'chatId', 'threadId', 'id', 'cid']

    for (const key of searchParamKeys) {
      const value = url.searchParams.get(key)
      if (value) return value
    }

    const pathPatterns = [
      /\/(?:chats|chat|conversation|conversations)\/([a-zA-Z0-9-]+)/i,
      /\/s\/([a-zA-Z0-9-]+)/i,
    ]

    for (const pattern of pathPatterns) {
      const match = url.pathname.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  /**
   * Copilot 专用预处理
   * 1. 表格转 Markdown
   * 2. 代码块卡片转 fenced code（去除复制/折叠按钮噪音）
   */
  protected override preprocessClone(clone: Element): void {
    // 1) 表格
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (!md) return

      const wrapper = table.closest('.horizontal-scrollbar') || table
      wrapper.replaceWith(md)
    })

    // 2) 代码块
    clone.querySelectorAll('pre').forEach((pre) => {
      if (!pre.isConnected) return

      const codeEl = pre.querySelector('code')
      if (!codeEl) return

      const codeText = codeEl.textContent || ''
      const classLang = codeEl.className.match(/\blanguage-([a-z0-9#+-]+)/i)?.[1] || ''

      const codeCard = pre.closest('div.rounded-xl, div[class*="rounded-xl"]')
      const hasCopyButton = !!codeCard?.querySelector('button[title*="复制代码"]')
      const cardLang = hasCopyButton
        ? (codeCard?.querySelector('span.capitalize')?.textContent || '').trim().toLowerCase()
        : ''

      const lang = (classLang || cardLang).trim().toLowerCase()
      const fenced = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`

      if (codeCard && codeCard.contains(pre)) {
        codeCard.replaceWith(fenced)
      } else {
        pre.replaceWith(fenced)
      }
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const root = document.querySelector(this.config.observeTarget) || document
    const articles = root.querySelectorAll('[role="article"]')

    for (const article of Array.from(articles)) {
      // ── 用户消息 ──
      const userEl = article.querySelector('[data-content="user-message"]')
      if (userEl) {
        const text = this.extractText(userEl)
        if (text) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
          })
        }
        continue
      }

      // ── AI 回复 ──
      const isAi = article.matches('[data-content="ai-message"], [data-testid="ai-message"]')
      if (!isAi) continue

      const itemNodes = article.querySelectorAll('.group\\/ai-message-item, [class*="group/ai-message-item"]')
      const parts: string[] = []
      const seen = new Set<string>()

      itemNodes.forEach((item) => {
        const content = this.extractMarkdown(item).trim()
        if (!content || seen.has(content)) return
        seen.add(content)
        parts.push(content)
      })

      const merged = parts.join('\n\n').trim()
      if (merged) {
        messages.push({
          id: this.generateMessageId(),
          role: 'assistant',
          content: merged,
          timestamp: Date.now(),
        })
      }
    }

    return messages
  }
}
