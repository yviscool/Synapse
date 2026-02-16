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
 *                       └── .agent-chat__speech-text
 *                             └── .hyc-component-text
 *                                   └── .hyc-content-md(.hyc-content-md-done)
 *                                         └── .hyc-common-markdown                        ← 主回复
 *   思考模式（可选）：
 *     .hyc-component-reasoner__think-content .hyc-content-md / .hyc-common-markdown      ← thinking
 *
 * 标题：document.title
 */

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

export class YuanbaoAdapter extends BaseAdapter {
  private isMermaidContent(code: string): boolean {
    const trimmed = code.trim()
    return /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i.test(trimmed)
  }

  /**
   * 元宝 markdown 预处理
   * - .ybc-p 段落补换行
   * - table 转 Markdown
   * - .hyc-common-markdown__code（含 mermaid）转 fenced code
   */
  protected override preprocessClone(clone: Element): void {
    clone
      .querySelectorAll(
        '.hyc-common-markdown__replace-appCard, .hyc-common-markdown__code__hd, .mermaid-svg-container',
      )
      .forEach((el) => el.remove())

    clone.querySelectorAll('.ybc-p').forEach((p) => p.append('\n\n'))

    clone.querySelectorAll('.hyc-common-markdown__table-wrapper').forEach((wrapper) => {
      const table = wrapper.querySelector('table')
      if (!table) {
        wrapper.remove()
        return
      }

      const md = this.tableToMarkdown(table)
      if (md) wrapper.replaceWith(md)
    })
    clone.querySelectorAll('table').forEach((table) => {
      const md = this.tableToMarkdown(table)
      if (md) table.replaceWith(md)
    })

    clone.querySelectorAll('.hyc-common-markdown__code').forEach((block) => {
      const codeEl = block.querySelector('pre code, code')
      if (!codeEl) {
        block.remove()
        return
      }

      const classLang = codeEl.className.match(/\blanguage-([a-z0-9#+-]+)/i)?.[1]?.toLowerCase() || ''
      const codeText = codeEl.textContent || ''
      const isMermaid =
        block.classList.contains('hyc-common-markdown__code-mermaid') ||
        classLang === 'mermaid' ||
        this.isMermaidContent(codeText)

      const lang = isMermaid ? 'mermaid' : classLang
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })
  }

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
          '.hyc-component-reasoner__think-content .hyc-content-md, .hyc-component-reasoner__think-content .hyc-common-markdown',
        )
        if (thinkingEl) {
          thinking = this.extractMarkdown(thinkingEl).trim() || undefined
        }

        // 主回复：优先 reasoner 正文；回退到第一个非 thinking 的 markdown 区域
        const mainReplyEl = speech.querySelector(
          '.hyc-component-reasoner__text .hyc-content-md, .hyc-component-reasoner__text .hyc-common-markdown',
        ) || Array.from(speech.querySelectorAll('.hyc-content-md, .hyc-common-markdown')).find(
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
