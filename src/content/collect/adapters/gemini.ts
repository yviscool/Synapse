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
 *                                               ├── .horizontal-scroll-wrapper  ← 表格包装
 *                                               │     └── .table-block-component
 *                                               │           └── response-element > table-block > table
 *                                               ├── generated-image     ← AI 生成图片
 *                                               │     └── single-image > .image-container > img.image
 *                                               └── span.math-inline[data-math]  ← KaTeX 公式
 */

import { BaseAdapter } from './base'
import type { CollectResult, CollectOptions } from './base'
import type { ChatMessage } from '@/types/chat'

// 模块级 thinking 缓存：按 container id 存储已展开过的 thinking 文本
// 自动同步时 thinking 折叠无 DOM，从缓存读取；手动采集或用户展开时写入缓存
const thinkingCache = new Map<string, string>()

export class GeminiAdapter extends BaseAdapter {
  override getTitle(): string {
    const base = super.getTitle()
    if (base !== '未命名对话') return base

    const pageTitle = document.title
      .replace(/\s*[-–—]\s*(Google\s+)?Gemini\s*$/i, '')
      .trim()
    if (pageTitle) return pageTitle

    const firstQuery = document.querySelector('user-query .query-text')
    if (firstQuery) {
      const text = this.extractText(firstQuery)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return '未命名对话'
  }

  /** 检测代码内容是否为 mermaid 图表语法 */
  private isMermaidContent(code: string): boolean {
    const trimmed = code.trim()
    return /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i.test(trimmed)
  }

  /**
   * Gemini 专用预处理
   * 处理 KaTeX .math-inline/.math-display + code-block + table-block + response-element
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
      const langEl =
        block.querySelector('.code-block-decoration span') ||
        block.querySelector('[class*="code-block-decoration"] span') ||
        block.querySelector('code-block-decoration span')

      const codeEl =
        block.querySelector('pre code') ||
        block.querySelector('code[data-test-id="code-content"]') ||
        block.querySelector('code')

      const classLang = codeEl?.className.match(/\blanguage-([a-z0-9#+-]+)/i)?.[1] || ''
      const rawLang = (langEl?.textContent?.trim() || classLang).toLowerCase()
      const codeText = codeEl?.textContent || ''

      // Gemini 有时用通用标签（如"代码段"）而非实际语言名，需按内容检测 mermaid
      const lang = this.isMermaidContent(codeText) ? 'mermaid' : rawLang

      block
        .querySelectorAll('.code-block-decoration, [class*="code-block-decoration"], code-block-decoration')
        .forEach((d) => d.remove())
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 3. 表格转 Markdown（table-block 自定义元素内的 <table>）
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

      // 表头
      const header = rows[0].concat(Array(Math.max(0, colCount - rows[0].length)).fill(''))
      mdLines.push('| ' + header.join(' | ') + ' |')
      mdLines.push('| ' + header.map(() => '---').join(' | ') + ' |')

      // 数据行
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].concat(Array(Math.max(0, colCount - rows[i].length)).fill(''))
        mdLines.push('| ' + row.join(' | ') + ' |')
      }

      // 替换最外层包装容器（table-block / horizontal-scroll-wrapper）
      const wrapper = table.closest('table-block') || table.closest('.horizontal-scroll-wrapper') || table
      wrapper.replaceWith('\n' + mdLines.join('\n') + '\n')
    })

    // 4. Gemini 生成图片（generated-image / single-image 自定义元素）
    clone.querySelectorAll('generated-image').forEach((genImg) => {
      const img = genImg.querySelector('img')
      if (img) {
        const src = img.getAttribute('src') || ''
        const alt = (img.getAttribute('alt') || 'image').replace(/^的图片$/, 'image')
        genImg.replaceWith(`\n![${alt}](${src})\n`)
      } else {
        genImg.remove()
      }
    })

    // 5. 清理 response-element 空壳
    clone.querySelectorAll('response-element').forEach((el) => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
      el.remove()
    })
  }

  /**
   * 只展开尚未缓存的折叠思考区域
   * 已缓存的跳过 → 首次短暂闪烁一次，之后零闪烁
   */
  private expandUncachedThoughts(): HTMLElement[] {
    const expanded: HTMLElement[] = []
    document.querySelectorAll('.conversation-container').forEach((container) => {
      if (container.id && thinkingCache.has(container.id)) return

      const mt = container.querySelector('model-thoughts')
      if (!mt) return
      if (!mt.querySelector('[data-test-id="thoughts-content"]')) {
        const btn = mt.querySelector('[data-test-id="thoughts-header-button"]') as HTMLElement
        if (btn) {
          btn.click()
          expanded.push(btn)
        }
      }
    })
    return expanded
  }

  /**
   * 恢复折叠状态
   */
  private collapseThoughts(buttons: HTMLElement[]): void {
    buttons.forEach((btn) => btn.click())
  }

  /**
   * 覆写 collect：
   * 自动展开未缓存的 thinking → 采集 → 折叠 → 写入缓存
   * 已缓存的不展开，无 UI 闪烁。每个 thinking 只展开一次。
   */
  override async collect(_options?: CollectOptions): Promise<CollectResult> {
    const expandedBtns = this.expandUncachedThoughts()
    if (expandedBtns.length) {
      await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 150)))
    }

    const result = super.collect()

    if (expandedBtns.length) {
      this.collapseThoughts(expandedBtns)
    }

    return result
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
        // thinking 内容：优先从 DOM 读取，折叠时回退到缓存
        let thinking: string | undefined
        const thoughtsEl = modelResponse.querySelector('model-thoughts')
        if (thoughtsEl) {
          const parts: string[] = []
          thoughtsEl.querySelectorAll('.markdown').forEach((md) => {
            const t = this.extractText(md).trim()
            if (t) parts.push(t)
          })
          if (parts.length) {
            thinking = parts.join('\n\n')
            // 写入缓存（用户展开或手动采集时）
            if (container.id) thinkingCache.set(container.id, thinking)
          } else if (container.id) {
            // 折叠状态，从缓存读取
            thinking = thinkingCache.get(container.id)
          }
        }

        // 主回复内容 — 限定在 .model-response-text 内，避免匹配到 thinking 的 .markdown
        const responseEl =
          modelResponse.querySelector('.model-response-text .markdown-main-panel') ||
          modelResponse.querySelector('.model-response-text .markdown') ||
          modelResponse.querySelector('message-content .markdown')
        const content = responseEl ? this.extractMarkdown(responseEl) : ''

        // 提取图片附件
        const attachments: import('@/types/chat').ChatAttachment[] = []
        modelResponse.querySelectorAll('generated-image img.image, single-image img.image').forEach((img) => {
          const src = img.getAttribute('src')
          if (src) {
            attachments.push({
              id: this.generateMessageId(),
              type: 'image',
              url: src,
              name: (img.getAttribute('alt') || 'image').replace(/^的图片$/, 'image'),
            })
          }
        })

        if (content.trim() || attachments.length) {
          messages.push({
            id: this.generateMessageId(),
            role: 'assistant',
            content: content.trim(),
            timestamp: Date.now(),
            ...(thinking ? { thinking } : {}),
            ...(attachments.length ? { attachments } : {}),
          })
        }
      }
    })

    return messages
  }
}
