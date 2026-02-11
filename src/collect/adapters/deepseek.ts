/**
 * DeepSeek 平台适配器
 *
 * DOM 结构（2026-02）：
 *   ._765a5cd (根容器)
 *     ├── ._2be88ba (顶栏)
 *     │     └── .afa34042                          ← 对话标题
 *     └── ._2bd7b35 (聊天区)
 *           └── .dad65929 (消息列表)
 *                 ├── ._9663006 (用户消息组)
 *                 │     └── .d29f3d7d.ds-message
 *                 │           └── .fbb737a4         ← 用户文本
 *                 ├── ._4f9bf79 (AI 回复组)
 *                 │     └── .ds-message
 *                 │           ├── .ds-think-content
 *                 │           │     └── .ds-markdown ← thinking
 *                 │           └── .ds-markdown       ← 主回复
 *                 └── ...
 *
 *   代码块：.md-code-block > .md-code-block-banner (.d813de27 = 语言) + pre
 */

import { BaseAdapter } from './base'
import type { ChatMessage, ChatPlatform } from '@/types/chat'

export class DeepSeekAdapter extends BaseAdapter {
  platform: ChatPlatform = 'deepseek'

  isConversationPage(): boolean {
    return /chat\.deepseek\.com/.test(window.location.href)
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/a\/chat\/s\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  getTitle(): string {
    // 顶栏标题元素
    const titleEl = document.querySelector('.afa34042')
    if (titleEl?.textContent?.trim()) {
      return this.cleanText(titleEl.textContent)
    }

    const pageTitle = document.title.replace(/\s*[-–—]\s*DeepSeek\s*$/i, '').trim()
    if (pageTitle && pageTitle !== 'DeepSeek') return pageTitle

    // 第一条用户消息
    const firstUser = document.querySelector('.fbb737a4')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /**
   * DeepSeek 专用 Markdown 提取
   * 处理 .md-code-block 代码块、.token 语法高亮 span、ds-markdown 结构
   */
  protected override extractMarkdown(element: Element | null): string {
    if (!element) return ''

    const clone = element.cloneNode(true) as Element

    // 1. 处理 DeepSeek 代码块：.md-code-block 包含 banner(语言) + pre
    clone.querySelectorAll('.md-code-block').forEach((block) => {
      const langEl = block.querySelector('.d813de27')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      // 移除 banner（语言标签 + 复制按钮）
      block.querySelectorAll('.md-code-block-banner-wrap').forEach((b) => b.remove())
      const pre = block.querySelector('pre')
      const codeText = pre?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 剩余 pre > code
    clone.querySelectorAll('pre code').forEach((code) => {
      const lang = code.className.match(/language-(\w+)/)?.[1] || ''
      const text = code.textContent || ''
      code.parentElement!.replaceWith(`\n\`\`\`${lang}\n${text}\n\`\`\`\n`)
    })

    // 3. 行内代码
    clone.querySelectorAll('code').forEach((c) => c.replaceWith(`\`${c.textContent}\``))

    // 4. 链接
    clone.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href')
      const text = a.textContent
      if (href && text) a.replaceWith(`[${text}](${href})`)
    })

    // 5. 块级元素
    clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      const level = parseInt(h.tagName[1])
      h.prepend('#'.repeat(level) + ' ')
      h.append('\n\n')
    })
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
    clone.querySelectorAll('p').forEach((p) => p.append('\n\n'))
    clone.querySelectorAll('hr').forEach((hr) => hr.replaceWith('\n---\n'))
    clone.querySelectorAll('li').forEach((li) => {
      const parent = li.parentElement
      const prefix = parent?.tagName === 'OL' ? '1. ' : '- '
      li.prepend(prefix)
      li.append('\n')
    })
    clone.querySelectorAll('b, strong').forEach((b) => {
      b.prepend('**')
      b.append('**')
    })

    // 6. 表格处理（DeepSeek 回复中常见）
    clone.querySelectorAll('.ds-scroll-area table, table').forEach((table) => {
      // 移除外层滚动容器的干扰元素
      const scrollGutters = table.closest('.ds-scroll-area')?.querySelectorAll('.ds-scroll-area__gutters')
      scrollGutters?.forEach((g) => g.remove())
    })

    const raw = clone.textContent || ''
    return raw
      .replace(/\u200B/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
      .trim()
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 消息列表容器
    const container = document.querySelector('.dad65929')
    if (!container) return messages

    // 遍历直接子元素，按顺序区分用户/AI
    const children = container.children

    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      // ── 用户消息：._9663006 包含 .d29f3d7d.ds-message ──
      if (child.classList.contains('_9663006')) {
        const userTextEl = child.querySelector('.fbb737a4')
        const text = userTextEl ? this.extractText(userTextEl) : ''
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

      // ── AI 回复：._4f9bf79 包含 .ds-message ──
      if (child.classList.contains('_4f9bf79')) {
        // thinking 内容
        let thinking: string | undefined
        const thinkEl = child.querySelector('.ds-think-content .ds-markdown')
        if (thinkEl) {
          thinking = this.extractText(thinkEl).trim() || undefined
        }

        // 主回复：直接子级 .ds-markdown（排除 thinking 内的）
        const allMarkdowns = child.querySelectorAll(':scope > .ds-message > .ds-markdown')
        let content = ''
        if (allMarkdowns.length > 0) {
          // 取最后一个 .ds-markdown（thinking 之后的主回复）
          const mainMarkdown = allMarkdowns[allMarkdowns.length - 1]
          content = this.extractMarkdown(mainMarkdown)
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
        continue
      }
    }

    return messages
  }
}