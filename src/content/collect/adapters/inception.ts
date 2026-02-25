/**
 * Inception (chat.inceptionlabs.ai) 平台适配器
 *
 * DOM 结构（2026-02）：
 *   section[aria-labelledby="chat-conversation"]
 *     └── ul[role="log"]
 *           └── div[role="listitem"]
 *                 ├── .user-message
 *                 │     └── .chat-user .rounded-3xl
 *                 └── .chat-assistant
 *                       └── #response-content-container .markdown-prose
 *
 * 说明：
 * - 该站点消息区域包含大量悬浮按钮/菜单节点，需在采集前剔除。
 * - Mermaid 常为渲染态 SVG，若无源码则写入占位，避免把 SVG 样式噪声采入正文。
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class InceptionAdapter extends BaseAdapter {
  private startsWithMermaidSyntax(code: string): boolean {
    const normalized = code.trim().replace(/^(?:%%\{[\s\S]*?\}%%\s*)+/i, '').trimStart()
    return /^(?:graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|gantt\b|pie\b|gitgraph\b|journey\b|mindmap\b|timeline\b|quadrantChart\b|sankey\b|xychart(?:-beta)?\b|block-beta\b|packet-beta\b|architecture-beta\b|kanban\b)/i.test(normalized)
  }

  private sanitizeCode(text: string): string {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\r\n?/g, '\n')
      .trim()
  }

  private extractMermaidCode(container: Element): string {
    const candidates = [
      ...Array.from(container.querySelectorAll('pre code.language-mermaid, code.language-mermaid')),
      ...Array.from(container.querySelectorAll('[data-mermaid-source], [data-source], [data-code], [data-clipboard-text], textarea')),
      ...Array.from(container.querySelectorAll('pre code, code')),
    ]

    for (const el of candidates) {
      const values = [
        this.sanitizeCode(el.textContent || ''),
        this.sanitizeCode(el.getAttribute('data-mermaid-source') || ''),
        this.sanitizeCode(el.getAttribute('data-source') || ''),
        this.sanitizeCode(el.getAttribute('data-code') || ''),
        this.sanitizeCode(el.getAttribute('data-clipboard-text') || ''),
      ]
      for (const value of values) {
        if (value && this.startsWithMermaidSyntax(value)) return value
      }
    }

    return ''
  }

  protected override preprocessClone(clone: Element): void {
    // 表格转 Markdown，避免采集到排序/复制按钮文本。
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (md) table.replaceWith(md)
    })

    // Mermaid 渲染块：优先提取源码，否则写占位，防止 SVG style 噪声污染正文。
    const mermaidTargets = new Set<Element>()
    clone.querySelectorAll('svg.flowchart, svg[id^="mermaid-"], [class*="mermaid"]').forEach((el) => {
      const target = el.closest(
        '[class*="markdown-mermaid"], [class*="mermaid"], figure, [dir="ltr"], [id^="response-content-container"]',
      ) || el
      mermaidTargets.add(target as Element)
    })
    for (const target of mermaidTargets) {
      const code = this.extractMermaidCode(target)
      if (code) {
        target.replaceWith(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`)
      } else {
        target.replaceWith('\n```mermaid\n%% Mermaid 图表（渲染态，页面未暴露源码）\n```\n')
      }
    }

    clone.querySelectorAll(
      'button, [role="button"], [aria-haspopup="menu"], .buttons, .copy-response-button, .regenerate-response-button, .edit-user-message-button, #continue-response-button, [style*="display: none"]',
    ).forEach((el) => el.remove())
    clone.querySelectorAll('svg, style').forEach((el) => el.remove())
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*Inception(?:\s*Labs)?\s*$/i, '')
      .trim()
    if (pageTitle && pageTitle.length > 2) return pageTitle

    const firstUser = document.querySelector('.user-message .chat-user .rounded-3xl, .user-message .chat-user')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const items = document.querySelectorAll(
      'section[aria-labelledby="chat-conversation"] ul[role="log"] > [role="listitem"], ul[role="log"] > [role="listitem"]',
    )

    for (const item of Array.from(items)) {
      // 用户消息
      const userEl = item.querySelector('.user-message')
      if (userEl) {
        const bubble = userEl.querySelector('.chat-user .rounded-3xl') || userEl.querySelector('.chat-user') || userEl
        const content = this.extractText(bubble)
        if (content.trim()) {
          messages.push({
            id: this.generateMessageId(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now(),
          })
        }
        continue
      }

      // AI 消息
      const assistantEl = item.querySelector('.chat-assistant')
      if (!assistantEl) continue

      let thinking: string | undefined
      const thinkingEl = assistantEl.querySelector('.thinking-block blockquote, .thinking-block')
      if (thinkingEl) {
        thinking = this.extractText(thinkingEl).trim() || undefined
      }

      const markdownEl
        = assistantEl.querySelector('#response-content-container > div > .markdown-prose')
          || assistantEl.querySelector('#response-content-container .markdown-prose')
          || assistantEl.querySelector('.markdown-prose')
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

    return messages
  }
}

