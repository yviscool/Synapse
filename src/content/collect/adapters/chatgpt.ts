/**
 * ChatGPT 平台适配器
 *
 * DOM 结构（2026-02）：
 *   [data-message-author-role="user"|"assistant"]
 *     └── .markdown.prose  ← 回复内容
 *           ├── p / h3 / ul / hr                    ← 普通内容
 *           ├── div[class*="tableContainer"]         ← 表格包装
 *           │     └── div[class*="tableWrapper"]
 *           │           ├── table
 *           │           └── div.sticky (复制按钮)
 *           └── pre                                  ← 代码块（CodeMirror）
 *                 └── ... > .cm-editor > .cm-scroller > .cm-content
 *                             └── span + br (逐行代码)
 */

import { BaseAdapter } from './base'
import type { ChatMessage } from '@/types/chat'

const MERMAID_RE = /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i

export class ChatGPTAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    const pageTitle = document.title.replace(' | ChatGPT', '').replace('ChatGPT', '').trim()
    if (pageTitle && pageTitle !== 'ChatGPT') return pageTitle

    const firstUserMessage = document.querySelector('[data-message-author-role="user"]')
    if (firstUserMessage) {
      const text = this.extractText(firstUserMessage)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  protected override preprocessClone(clone: Element): void {
    // 1. CodeMirror 代码块（新版 ChatGPT 使用 cm-editor 渲染代码）
    clone.querySelectorAll('pre').forEach((pre) => {
      const cmContent = pre.querySelector('.cm-content')
      if (!cmContent) return

      // 提取语言标签：遍历 pre 内叶子 div（无子元素），取第一个短文本
      let lang = ''
      for (const div of Array.from(pre.querySelectorAll('div'))) {
        if (div.contains(cmContent)) continue          // 跳过代码编辑器祖先
        if (div.querySelector('button, svg, div')) continue // 跳过含按钮/嵌套 div
        const text = div.textContent?.trim()
        if (text && text.length < 30) { lang = text.toLowerCase(); break }
      }

      // 提取代码：<br> → 换行，再取 textContent
      cmContent.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      const codeText = cmContent.textContent || ''

      // 按内容检测 mermaid（语言标签可能缺失或为通用名）
      if (MERMAID_RE.test(codeText.trim())) lang = 'mermaid'

      pre.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 表格转 Markdown
    clone.querySelectorAll('table').forEach((table) => {
      const rows: string[][] = []
      table.querySelectorAll('tr').forEach((tr) => {
        const cells: string[] = []
        tr.querySelectorAll('th, td').forEach((cell) => {
          cells.push((cell.textContent || '').trim().replace(/\|/g, '\\|'))
        })
        if (cells.length > 0) rows.push(cells)
      })

      if (rows.length === 0) return

      const colCount = Math.max(...rows.map((r) => r.length))
      const mdLines: string[] = []
      const header = rows[0].concat(Array(Math.max(0, colCount - rows[0].length)).fill(''))
      mdLines.push('| ' + header.join(' | ') + ' |')
      mdLines.push('| ' + header.map(() => '---').join(' | ') + ' |')
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].concat(Array(Math.max(0, colCount - rows[i].length)).fill(''))
        mdLines.push('| ' + row.join(' | ') + ' |')
      }

      // 替换最外层表格容器，避免复制按钮文本泄漏
      const wrapper = table.closest('[class*="tableContainer"]') || table
      wrapper.replaceWith('\n' + mdLines.join('\n') + '\n')
    })
  }

  collectMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const messageElements = document.querySelectorAll('[data-message-author-role]')

    messageElements.forEach((el) => {
      const role = el.getAttribute('data-message-author-role')
      if (role !== 'user' && role !== 'assistant') return

      const contentEl = el.querySelector('.markdown, .whitespace-pre-wrap')
      if (!contentEl) return

      const content = this.extractMarkdown(contentEl)
      if (!content) return

      messages.push({
        id: this.generateMessageId(),
        role: role as 'user' | 'assistant',
        content,
        timestamp: Date.now(),
      })
    })

    return messages
  }
}
