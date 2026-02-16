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

import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { CollectOptions, CollectResult } from './base'
import type { ChatMessage } from '@/types/chat'

interface MermaidTabSwitch {
  chartTab: HTMLElement
  codeTab: HTMLElement
  block: Element
}

export class DeepSeekAdapter extends BaseAdapter {
  /** 模拟用户点击（mousedown → mouseup → click，冒泡），兼容 React 合成事件 */
  private simulateClick(el: HTMLElement): void {
    const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window }
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
  }

  /**
   * 将 mermaid 代码块从"图表"tab 切换到"代码"tab，确保 pre 元素存在
   * 返回需要恢复状态的切换上下文
   */
  private switchMermaidToCodeTab(): MermaidTabSwitch[] {
    const switched: MermaidTabSwitch[] = []
    document.querySelectorAll('.md-code-block .ds-segmented').forEach((seg) => {
      const tabs = Array.from(seg.querySelectorAll<HTMLElement>('[role="tab"]'))
      if (tabs.length < 2) return

      const chartTab = tabs.find((t) => /图表|chart/i.test((t.textContent || '').trim())) || tabs[0]
      const codeTab = tabs.find((t) => /代码|code/i.test((t.textContent || '').trim())) || tabs[1]
      if (!chartTab || !codeTab) return
      if (this.isTabSelected(codeTab)) return

      this.simulateClick(codeTab)
      switched.push({
        chartTab,
        codeTab,
        block: seg.closest('.md-code-block') || seg,
      })
    })
    return switched
  }

  private restoreMermaidTabs(switched: MermaidTabSwitch[]): void {
    switched.forEach(({ chartTab }) => this.simulateClick(chartTab))
  }

  private isTabSelected(tab: HTMLElement): boolean {
    const ariaSelected = tab.getAttribute('aria-selected')
    const className = tab.className.toLowerCase()
    return ariaSelected === 'true' || className.includes('active') || className.includes('selected')
  }

  /**
   * 等待 mermaid 切换到“代码”tab 且 pre 文本可读。
   * 失败时会重试点击 code tab，避免首轮采集拿到空代码块。
   */
  private async waitForMermaidCodeReady(switched: MermaidTabSwitch[], timeoutMs = 2000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      let ready = true

      for (const item of switched) {
        const selected = this.isTabSelected(item.codeTab)
        const pre = item.block.querySelector('pre')
        const hasCode = !!pre && !!(pre.textContent || '').trim()
        if (!selected || !hasCode) {
          ready = false
          this.simulateClick(item.codeTab)
          break
        }
      }

      if (ready) return
      await new Promise<void>((r) => setTimeout(r, 80))
    }
  }

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    const switched = this.switchMermaidToCodeTab()
    try {
      if (switched.length) {
        // 等待 React 重新渲染，让 pre 元素稳定可读
        await this.waitForMermaidCodeReady(switched)
        await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 50)))
      }

      return super.collect(options)
    } finally {
      if (switched.length) {
        this.restoreMermaidTabs(switched)
      }
    }
  }

  private extractKatexTex(node: Element): string {
    const annotation = node.querySelector('annotation[encoding="application/x-tex"]')
    return (annotation?.textContent || node.textContent || '').trim()
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    const pageTitle = document.title.replace(/\s*[-–—]\s*DeepSeek\s*$/i, '').trim()
    if (pageTitle && pageTitle !== 'DeepSeek') return pageTitle

    const firstUser = document.querySelector('.fbb737a4')
    if (firstUser) {
      const text = this.extractText(firstUser)
      return text.slice(0, 50) + (text.length > 50 ? '...' : '')
    }

    return DEFAULT_TITLE
  }

  /**
   * DeepSeek 专用预处理
   * 处理 .md-code-block 代码块 + 表格转 Markdown
   */
  protected override preprocessClone(clone: Element): void {
    // 0. 还原 KaTeX 公式（优先从 MathML annotation 提取原始 TeX）
    clone.querySelectorAll('.katex-display, .ds-markdown-math').forEach((displayMath) => {
      const tex = this.extractKatexTex(displayMath)
      if (tex) {
        displayMath.replaceWith(`\n$$${tex}$$\n`)
      }
    })

    clone.querySelectorAll('span.katex').forEach((inlineMath) => {
      if (inlineMath.closest('.katex-display, .ds-markdown-math')) return
      const tex = this.extractKatexTex(inlineMath)
      if (tex) {
        inlineMath.replaceWith(`$${tex}$`)
      }
    })

    // 1. 处理 DeepSeek 代码块：.md-code-block 包含 banner(语言) + pre
    clone.querySelectorAll('.md-code-block').forEach((block) => {
      // 检测 mermaid：带有 图表/代码 分栏 tab 的代码块
      const isMermaid = !!block.querySelector('.ds-segmented')

      const langEl = block.querySelector('.d813de27')
      const lang = isMermaid ? 'mermaid' : langEl?.textContent?.trim().toLowerCase() || ''

      // 提取代码文本：从 pre 获取（在移除其他元素之前）
      const pre = block.querySelector('pre')
      let codeText = ''
      if (pre) {
        const lineSpans = pre.querySelectorAll(':scope > span')
        if (lineSpans.length > 0) {
          codeText = Array.from(lineSpans)
            .map((s) => s.textContent || '')
            .join('\n')
        } else {
          codeText = pre.querySelector('code')?.textContent || pre.textContent || ''
        }
      }
      if (!codeText.trim()) {
        codeText = block.querySelector('code')?.textContent || ''
      }

      // 用纯文本替换整个代码块
      const placeholder = clone.ownerDocument.createTextNode(
        `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`,
      )
      block.parentNode?.replaceChild(placeholder, block)
    })

    // 2. 表格转 Markdown（DeepSeek 回复中常见）
    clone.querySelectorAll('table').forEach((table) => {
      // 清理滚动容器装饰元素
      const scrollArea = table.closest('.ds-scroll-area')
      scrollArea?.querySelectorAll('.ds-scroll-area__gutters').forEach((g) => g.remove())

      const md = this.tableToMarkdown(table)
      if (!md) return

      const target = scrollArea || table
      target.replaceWith(md)
    })
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
          thinking = this.extractMarkdown(thinkEl).trim() || undefined
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
