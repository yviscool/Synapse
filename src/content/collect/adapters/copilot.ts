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
  private resolveConversationRoot(): ParentNode {
    const candidates = Array.from(
      document.querySelectorAll('main, [role="main"], [data-testid="highlighted-chats"]'),
    )

    if (candidates.length === 0) return document

    let best: Element = candidates[0]
    let bestScore = -1

    for (const candidate of candidates) {
      const score = candidate.querySelectorAll(
        '[role="article"][class*="group/user-message"], [role="article"][class*="group/ai-message"]',
      ).length
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }

    return best
  }

  private isMermaidContent(code: string): boolean {
    const trimmed = code.trim()
    return /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i.test(trimmed)
  }

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
      // 额外补一个空行，避免后续段落被 Markdown 解析器并入表格
      wrapper.replaceWith(`\n${md.trim()}\n\n`)
    })

    // 2) 代码块
    clone.querySelectorAll('pre').forEach((pre) => {
      if (!pre.isConnected) return

      const codeEl = pre.querySelector('code')
      if (!codeEl) return

      const codeText = codeEl.textContent || ''
      const classLang = codeEl.className.match(/\blanguage-([a-z0-9#+-]+)/i)?.[1] || ''

      // 向上回溯寻找“完整代码卡片”（含语言/复制工具栏），避免仅替换 pre 导致工具栏文本残留
      let codeCard: Element | null = null
      let cursor: Element | null = pre
      while (cursor && cursor !== clone) {
        const hasCode = !!cursor.querySelector('pre code')
        const hasCopy = !!cursor.querySelector(
          'button[title*="复制代码"], button[title*="Copy code"], button[aria-label*="复制代码"], button[aria-label*="Copy code"]',
        )
        const hasLangTag = !!cursor.querySelector('span.capitalize')
        if (hasCode && (hasCopy || hasLangTag)) {
          codeCard = cursor
          break
        }
        cursor = cursor.parentElement
      }

      const cardLang = (codeCard?.querySelector('span.capitalize')?.textContent || '').trim().toLowerCase()
      const rawLang = (classLang || cardLang).trim().toLowerCase()
      const lang = this.isMermaidContent(codeText)
        ? 'mermaid'
        : (rawLang === 'text' ? '' : rawLang)
      const fenced = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`

      if (codeCard && codeCard.contains(pre)) {
        codeCard.replaceWith(fenced)
      } else {
        pre.replaceWith(fenced)
      }
    })

    // 3) 清理可能残留的代码工具栏文案
    clone
      .querySelectorAll(
        'button[title*="复制代码"], button[title*="Copy code"], button[title*="折叠代码片段"], button[title*="Collapse"]',
      )
      .forEach((btn) => btn.remove())
    clone.querySelectorAll('span.capitalize').forEach((el) => {
      const parent = el.closest('div')
      if (parent?.querySelector('pre code, button[title*="复制代码"], button[title*="Copy code"]')) {
        el.remove()
      }
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const root = this.resolveConversationRoot()
    const articles = root.querySelectorAll('[role="article"]')

    for (const article of Array.from(articles)) {
      const className = article.getAttribute('class') || ''
      const dataContent = article.getAttribute('data-content') || ''
      const dataTestId = article.getAttribute('data-testid') || ''
      const isUserArticle = className.includes('group/user-message') || dataContent === 'user-message'
      const isAiArticle = className.includes('group/ai-message')
        || dataContent === 'ai-message'
        || dataTestId === 'ai-message'

      // ── 用户消息 ──
      if (isUserArticle) {
        const userEl = article.querySelector('[data-content="user-message"]')
        if (!userEl) continue
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
      if (!isAiArticle) continue

      const itemNodes = article.querySelectorAll(
        ':scope .group\\/ai-message-item, :scope [class*="group/ai-message-item"]',
      )
      const parts: string[] = []
      const seen = new Set<string>()

      itemNodes.forEach((item) => {
        const content = this.extractMarkdown(item).trim()
        if (!content || seen.has(content)) return
        seen.add(content)
        parts.push(content)
      })

      // 兜底：有些版本 class 命名变化，直接取 AI article 主体文本区
      if (parts.length === 0) {
        const body = article.querySelector(':scope > .space-y-3, :scope .space-y-3.mt-3')
        if (body) {
          const content = this.extractMarkdown(body).trim()
          if (content) parts.push(content)
        }
      }

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
