/**
 * Gemini 平台适配器
 *
 * DOM 结构（2026-02）：
 *   .conversation-container#<id>
 *     ├── user-query
 *     │     └── user-query-content
 *     │           └── .query-content
 *     │                 └── .query-text > p.query-text-line  ← 用户提问文本
 *     └── model-response
 *           └── response-container
 *                 └── .response-container-content
 *                       └── .response-content
 *                             ├── model-thoughts .markdown            ← thinking（可选）
 *                             └── structured-content-container.model-response-text
 *                                   └── message-content
 *                                         └── .markdown.markdown-main-panel
 *                                               ├── p / h3 / ul / hr  ← 普通内容
 *                                               ├── response-element   ← 代码块包装
 *                                               │     └── code-block
 *                                               │           ├── code-block-decoration (语言 + 复制按钮)
 *                                               │           └── pre > code.code-container
 *                                               └── span.math-inline[data-math]  ← KaTeX 公式
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class GeminiAdapter extends BaseAdapter {
  platform: ChatPlatform = 'gemini'

  isConversationPage(): boolean {
    return /gemini\.google\.com\/app/.test(window.location.href)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 优先从顶栏 DOM 获取对话标题（最可靠）
    const titleEl = document.querySelector('[data-test-id="conversation-title"]') ||
      document.querySelector('.conversation-title')
    if (titleEl) {
      const title = this.extractText(titleEl)
      if (title) return title
    }

    // 回退到 document.title — 清理所有 Gemini 后缀变体
    const pageTitle = document.title
      .replace(/\s*[-–—]\s*(Google\s+)?Gemini\s*$/i, '')
      .trim()
    if (pageTitle) return pageTitle

    // 回退到第一条用户提问
    const firstQuery = document.querySelector('user-query .query-text')
    if (firstQuery) {
      const text = this.extractText(firstQuery)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * Gemini 专用预处理
   * 处理 KaTeX .math-inline/.math-display + code-block + response-element
   */
  protected override preprocessClone(clone: Element): void {
    // 1. KaTeX 公式：用 data-math 属性还原 LaTeX
    clone.querySelectorAll('.math-inline').forEach((math) => {
      const tex = math.getAttribute('data-math') || math.textContent || ''
      math.replaceWith(`$${tex}$`)
    })
    clone.querySelectorAll('.math-display').forEach((math) => {
      const tex = math.getAttribute('data-math') || math.textContent || ''
      math.replaceWith(`$$${tex}$$`)
    })

    // 2. Gemini code-block 自定义元素
    clone.querySelectorAll('code-block').forEach((block) => {
      const langEl = block.querySelector('code-block-decoration span')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      block.querySelectorAll('code-block-decoration').forEach((d) => d.remove())
      const codeEl = block.querySelector('pre code') || block.querySelector('code')
      const codeText = codeEl?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 3. 清理 response-element 空壳
    clone.querySelectorAll('response-element').forEach((el) => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
      el.remove()
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const containers = document.querySelectorAll('.conversation-container')

    containers.forEach((container) => {
      // ── 用户提问 ──
      const userQuery = container.querySelector('user-query')
      if (userQuery) {
        const queryTextEl = userQuery.querySelector('.query-text')
        const text = queryTextEl ? this.extractText(queryTextEl) : this.extractText(userQuery)
        if (text.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
          })
        }
      }

      // ── AI 回复 ──
      const modelResponse = container.querySelector('model-response')
      if (modelResponse) {
        // thinking 内容
        let thinking: string | undefined
        const thoughtsEl = modelResponse.querySelector('model-thoughts')
        if (thoughtsEl) {
          const parts: string[] = []
          thoughtsEl.querySelectorAll('.markdown').forEach((md) => {
            const t = this.extractText(md).trim()
            if (t) parts.push(t)
          })
          if (parts.length) thinking = parts.join('\n\n')
        }

        // 主回复内容 — 优先匹配 .markdown-main-panel（实际 class 组合）
        const responseEl =
          modelResponse.querySelector('.markdown-main-panel') ||
          modelResponse.querySelector('.model-response-text .markdown') ||
          modelResponse.querySelector('message-content .markdown')
        const content = responseEl ? this.extractMarkdown(responseEl) : ''

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
    })

    return messages
  }
}
