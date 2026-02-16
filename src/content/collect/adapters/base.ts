/**
 * AI 平台对话采集适配器基类
 * 定义统一的采集接口，各平台继承实现
 *
 * 通用逻辑（isConversationPage / getConversationId / getTitle）
 * 由基类根据 SiteConfig 提供默认实现，子类可 override 补充 fallback。
 */

import type { ChatMessage, ChatPlatform, ChatConversation } from '@/types/chat'
import type { SiteConfig } from '../../site-configs'

/** 默认对话标题（所有适配器共用） */
export const DEFAULT_TITLE = '未命名对话'

export interface CollectResult {
  success: boolean
  conversation?: Partial<ChatConversation>
  error?: string
}

export interface CollectOptions {
  /** 是否为自动同步（自动同步时跳过展开 thinking 等 UI 操作） */
  isAutoSync?: boolean
}

export interface PlatformAdapter {
  /** 平台标识 */
  platform: ChatPlatform

  /** 检测当前页面是否为该平台的对话页面 */
  isConversationPage(): boolean

  /** 获取当前对话的外部 ID */
  getConversationId(): string | null

  /** 获取对话标题 */
  getTitle(): string

  /** 采集所有消息 */
  collectMessages(): ChatMessage[]

  /** 执行完整采集 */
  collect(options?: CollectOptions): CollectResult | Promise<CollectResult>
}

/**
 * 适配器基类
 */
export abstract class BaseAdapter implements PlatformAdapter {
  platform: ChatPlatform
  protected config: SiteConfig

  constructor(config: SiteConfig) {
    this.config = config
    this.platform = config.platform
  }

  /** 通用实现：用 config.urlPattern 判定 */
  isConversationPage(): boolean {
    return this.config.urlPattern.test(window.location.href)
  }

  /** 通用实现：用 config.conversationIdPattern 从 URL 提取 */
  getConversationId(): string | null {
    if (!this.config.conversationIdPattern) return null
    const match = window.location.href.match(this.config.conversationIdPattern)
    return match ? match[1] : null
  }

  /** 通用实现：按 config.titleSelector 数组逐个尝试，子类可 override 补充 fallback */
  getTitle(): string {
    if (this.config.titleSelector) {
      for (const selector of this.config.titleSelector) {
        const el = document.querySelector(selector)
        if (el?.textContent?.trim()) {
          return this.cleanText(el.textContent)
        }
      }
    }

    // fallback: 页面标题
    const pageTitle = document.title
      .replace(/\s*[-–—|·]\s*.*$/, '')
      .trim()
    if (pageTitle && pageTitle.length > 2) return pageTitle

    return DEFAULT_TITLE
  }

  abstract collectMessages(): ChatMessage[]

  /**
   * 生成消息 ID
   */
  protected generateMessageId(): string {
    return crypto.randomUUID()
  }

  /**
   * 清理文本内容
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\u200B/g, '') // 零宽空格
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 从 DOM 元素提取文本
   */
  protected extractText(element: Element | null): string {
    if (!element) return ''
    return this.cleanText(element.textContent || '')
  }

  /**
   * 平台特有的 DOM 预处理钩子
   * 子类 override 此方法处理平台特有元素（如自定义代码块、KaTeX 公式等）
   */
  protected preprocessClone(_clone: Element): void {}

  /**
   * HTML table → Markdown table
   * 通用实现，子类在 preprocessClone 中调用
   */
  protected tableToMarkdown(table: Element): string {
    const rows: string[][] = []
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: string[] = []
      tr.querySelectorAll('th, td').forEach((cell) => {
        cells.push((cell.textContent || '').trim().replace(/\|/g, '\\|'))
      })
      if (cells.length > 0) rows.push(cells)
    })

    if (rows.length === 0) return ''

    const colCount = Math.max(...rows.map((r) => r.length))
    const pad = (row: string[]) => row.concat(Array(Math.max(0, colCount - row.length)).fill(''))
    const mdLines: string[] = []

    mdLines.push('| ' + pad(rows[0]).join(' | ') + ' |')
    mdLines.push('| ' + pad(rows[0]).map(() => '---').join(' | ') + ' |')
    for (let i = 1; i < rows.length; i++) {
      mdLines.push('| ' + pad(rows[i]).join(' | ') + ' |')
    }

    return '\n' + mdLines.join('\n') + '\n'
  }

  /**
   * 提取 Markdown 格式内容（保留代码块等）
   * 公共流程：preprocessClone → pre>code → code → a → h1-h6 → br/p/hr/li/b → 清理
   */
  protected extractMarkdown(element: Element | null): string {
    if (!element) return ''

    const clone = element.cloneNode(true) as Element

    // 1. 平台特有预处理
    this.preprocessClone(clone)

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

    // 5. 标题
    clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      const level = parseInt(h.tagName[1])
      h.prepend('#'.repeat(level) + ' ')
      h.append('\n\n')
    })

    // 6. 块级元素
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

    // 7. 清理文本
    const raw = (clone.textContent || '')
      .replace(/\u200B/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ')

    const lines = raw.split('\n')
    const output: string[] = []
    let inFence = false
    let lastLineBlank = false

    for (const line of lines) {
      // 代码围栏内不做 trim/collapse，保留缩进与空行
      if (/^\s*```/.test(line)) {
        output.push(line.trim())
        inFence = !inFence
        lastLineBlank = false
        continue
      }

      if (inFence) {
        output.push(line.replace(/\s+$/g, ''))
        continue
      }

      const cleaned = line.replace(/[ \t]+/g, ' ').trim()
      if (!cleaned) {
        if (!lastLineBlank) {
          output.push('')
          lastLineBlank = true
        }
        continue
      }

      output.push(cleaned)
      lastLineBlank = false
    }

    return output.join('\n').trim()
  }

  /**
   * 执行完整采集
   */
  collect(_options?: CollectOptions): CollectResult | Promise<CollectResult> {
    try {
      if (!this.isConversationPage()) {
        return { success: false, error: '当前页面不是对话页面' }
      }

      const messages = this.collectMessages()
      if (messages.length === 0) {
        return { success: false, error: '未找到任何消息' }
      }

      const conversation: Partial<ChatConversation> = {
        platform: this.platform,
        externalId: this.getConversationId() || undefined,
        title: this.getTitle() || DEFAULT_TITLE,
        link: window.location.href,
        messages,
        messageCount: Math.ceil(messages.length / 2),
        collectedAt: Date.now(),
      }

      return { success: true, conversation }
    } catch (error) {
      console.error(`[${this.platform}] 采集失败:`, error)
      return { success: false, error: (error as Error).message }
    }
  }
}
