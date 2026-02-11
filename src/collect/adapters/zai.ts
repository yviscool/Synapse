/**
 * 智谱清言 (chat.z.ai) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   #messages-container
 *     └── div.group
 *           ├── .user-message                              ← 用户消息
 *           │     └── div[class*="rounded-xl"]             ← 文本气泡
 *           └── .chat-assistant > #response-content-container
 *                 └── .markdown-prose                      ← 内容容器
 *                       ├── .thinking-chain-container      ← thinking 标题按钮
 *                       ├── div > .thinking-block          ← thinking 正文
 *                       │         └── blockquote           ← 实际思考文本
 *                       ├── p / h3 / div(code)             ← 主回复内容
 *                       └── ...
 *
 *   代码块：CodeMirror (.cm-editor → .cm-content .cm-line)
 *   对话 ID：URL 路径 /chat/{id}
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class ZAIAdapter extends BaseAdapter {
  platform: ChatPlatform = 'zai'

  isConversationPage(): boolean {
    return /chat\.z\.ai/.test(window.location.hostname)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/chat\/([^/?]+)/)
    return match?.[1] || null
  }

  getTitle(): string {
    const pageTitle = document.title.replace(/\s*[-–—]\s*智谱清言\s*$/i, '').trim()
    if (pageTitle && pageTitle !== '智谱清言') return pageTitle

    const firstUser = document.querySelector('.user-message div[class*="rounded-xl"]')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * 预处理：移除 thinking 区域 + 将 CodeMirror 代码块转为标准 pre>code
   *
   * Z.AI 的 thinking 分两个兄弟节点：
   *   1. .thinking-chain-container — 仅包含"思考过程"标题按钮
   *   2. 下一个兄弟 div 内的 .thinking-block — 包含实际思考文本 (blockquote)
   */
  protected preprocessClone(clone: Element): void {
    // 移除 thinking 标题
    clone.querySelectorAll('.thinking-chain-container').forEach((el) => el.remove())
    // 移除 thinking 正文（.thinking-block 的父级 wrapper div）
    clone.querySelectorAll('.thinking-block').forEach((el) => {
      el.parentElement?.remove()
    })

    clone.querySelectorAll('.cm-editor').forEach((editor) => {
      const langEl = editor.closest('[data-language]') || editor.querySelector('[data-language]')
      const lang = langEl?.getAttribute('data-language') || ''
      const lines = Array.from(editor.querySelectorAll('.cm-line'))
      const code = lines.map((l) => l.textContent || '').join('\n')

      const pre = document.createElement('pre')
      const codeEl = document.createElement('code')
      if (lang) codeEl.className = `language-${lang}`
      codeEl.textContent = code
      pre.appendChild(codeEl)
      editor.closest('pre')?.replaceWith(pre) || editor.replaceWith(pre)
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const groups = document.querySelectorAll('#messages-container div.group')

    for (const group of Array.from(groups)) {
      // ── 用户消息 ──
      const userEl = group.querySelector('.user-message')
      if (userEl) {
        const bubble = userEl.querySelector('div[class*="rounded-xl"]')
        const text = bubble ? this.extractText(bubble) : ''
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
      const assistantEl = group.querySelector('.chat-assistant')
      if (assistantEl) {
        // thinking — blockquote 在 .thinking-block 内（与 .thinking-chain-container 是兄弟关系）
        let thinking: string | undefined
        const thinkBlock = assistantEl.querySelector('.thinking-block blockquote')
        if (thinkBlock) {
          thinking = this.extractText(thinkBlock).trim() || undefined
        }

        // 主回复 — 精确定位 markdown 内容区，排除 thinking / UI 元素
        const markdownEl =
          assistantEl.querySelector('#response-content-container .markdown-prose') ||
          assistantEl.querySelector('.markdown-prose')
        const content = markdownEl ? this.extractMarkdown(markdownEl) : ''

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