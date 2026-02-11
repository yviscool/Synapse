/**
 * AI 平台对话采集适配器基类
 * 定义统一的采集接口，各平台继承实现
 */

import type { ChatMessage, ChatPlatform, ChatConversation } from '@/types/chat'

export interface CollectResult {
  success: boolean
  conversation?: Partial<ChatConversation>
  error?: string
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
  collect(): CollectResult
}

/**
 * 适配器基类
 */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract platform: ChatPlatform

  abstract isConversationPage(): boolean
  abstract getConversationId(): string | null
  abstract getTitle(): string
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

  /**
   * 执行完整采集
   */
  collect(): CollectResult {
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
        title: this.getTitle() || '未命名对话',
        link: window.location.href,
        messages,
        messageCount: messages.length,
        collectedAt: Date.now(),
      }

      return { success: true, conversation }
    } catch (error) {
      console.error(`[${this.platform}] 采集失败:`, error)
      return { success: false, error: (error as Error).message }
    }
  }
}
