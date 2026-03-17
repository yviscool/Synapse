/**
 * Google AI Studio 平台适配器
 *
 * DOM 结构（2026-03）：
 *   .page-title
 *     └── h1.mode-title                                ← 对话标题
 *
 *   ms-chat-turn#turn-{UUID}
 *     └── .chat-turn-container.user | .model           ← turn 仍在 DOM 中，但内容可能被虚拟化清空
 *           ├── [data-turn-role="User"]
 *           │     └── ms-cmark-node.user-chunk          ← 用户消息
 *           └── [data-turn-role="Model"]               ← thinking / 主回复 可能拆成两个连续 turn
 *                 ├── ms-thought-chunk                  ← thinking（可选）
 *                 │     └── .thought-panel
 *                 │           └── ms-text-chunk
 *                 │                 └── ms-cmark-node.cmark-node
 *                 └── ms-text-chunk
 *                       └── ms-cmark-node.cmark-node   ← 主回复
 *
 *   ms-prompt-scrollbar button[aria-controls="turn-*"]
 *     ├── aria-controls                                ← 对应 turn id
 *     └── aria-label                                   ← 用户 turn 标题/文本 fallback
 *
 *   代码块：ms-code-block > mat-expansion-panel
 *             ├── mat-panel-title span                   ← 语言
 *             └── pre > code                             ← 代码内容
 *   行内代码：span.inline-code
 *   响应耗时：.model-run-time-pill
 */

import type { CollectOptions, CollectResult } from './base'
import { BaseAdapter, DEFAULT_TITLE } from './base'
import type { ChatMessage } from '@/types/chat'

interface AIStudioTurnSnapshot {
  role: 'user' | 'assistant'
  userContent?: string
  content?: string
  thinking?: string
  thinkingDuration?: number
}

export class AIStudioAdapter extends BaseAdapter {
  private static readonly VIRTUALIZED_TURN_BUTTON_SELECTOR =
    'ms-prompt-scrollbar button[aria-controls^="turn-"]'

  private preloadedSnapshots: Map<string, AIStudioTurnSnapshot> | null = null

  override async collect(options?: CollectOptions): Promise<CollectResult> {
    if (!this.shouldInteractWithUi(options)) {
      return super.collect(options)
    }

    this.preloadedSnapshots = await this.preloadVirtualizedTurnSnapshots()

    try {
      return await super.collect(options)
    } finally {
      this.preloadedSnapshots = null
    }
  }

  override getTitle(): string {
    const base = super.getTitle()
    if (base !== DEFAULT_TITLE) return base

    return this.resolveTitleFallback({
      removeSuffixPatterns: [/\s*[-–—]\s*(Google\s+)?AI\s*Studio\s*$/i],
      denylist: ['Google AI Studio', 'AI Studio'],
      firstUserSelectors: ['ms-chat-turn .chat-turn-container.user ms-cmark-node.user-chunk'],
    })
  }

  /**
   * AI Studio 专用预处理
   * 处理 ms-code-block + span.inline-code
   */
  protected override preprocessClone(clone: Element): void {
    // 1. ms-code-block：mat-expansion-panel 包含语言标签 + pre > code
    clone.querySelectorAll('ms-code-block').forEach((block) => {
      const langEl = block.querySelector('mat-panel-title span')
      const lang = langEl?.textContent?.trim().toLowerCase() || ''
      block.querySelectorAll('mat-expansion-panel-header').forEach((h) => h.remove())
      const codeEl = block.querySelector('pre code') || block.querySelector('pre')
      const codeText = codeEl?.textContent || ''
      block.replaceWith(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`)
    })

    // 2. 行内代码 span.inline-code（在基类处理 code 之前转换）
    clone.querySelectorAll('span.inline-code').forEach((c) => {
      c.replaceWith(`\`${c.textContent}\``)
    })
  }

  private collectBlocks(nodes: Element[]): string {
    const blocks: string[] = []
    const seen = new Set<string>()

    for (const node of nodes) {
      const text = this.extractMarkdown(node).trim()
      if (!text || seen.has(text)) continue
      seen.add(text)
      blocks.push(text)
    }

    return blocks.join('\n\n').trim()
  }

  private pickLongerText(...candidates: Array<string | undefined>): string | undefined {
    let best = ''

    for (const candidate of candidates) {
      const normalized = candidate?.trim() || ''
      if (normalized.length > best.length) {
        best = normalized
      }
    }

    return best || undefined
  }

  private mergeTextBlocks(...blocks: Array<string | undefined>): string {
    const merged: string[] = []
    const seen = new Set<string>()

    for (const block of blocks) {
      const text = block?.trim() || ''
      if (!text || seen.has(text)) continue
      seen.add(text)
      merged.push(text)
    }

    return merged.join('\n\n').trim()
  }

  private buildUserTurnLabelMap(): Map<string, string> {
    const map = new Map<string, string>()
    const buttons = document.querySelectorAll<HTMLElement>(AIStudioAdapter.VIRTUALIZED_TURN_BUTTON_SELECTOR)

    buttons.forEach((button) => {
      const turnId = button.getAttribute('aria-controls')?.trim()
      const label = this.cleanText(button.getAttribute('aria-label') || '')
      if (!turnId || !label) return
      map.set(turnId, label)
    })

    return map
  }

  private collectTurnSnapshots(userTurnLabelMap = this.buildUserTurnLabelMap()): Map<string, AIStudioTurnSnapshot> {
    const snapshots = new Map<string, AIStudioTurnSnapshot>()
    const turns = document.querySelectorAll<HTMLElement>('ms-chat-turn')

    for (const turn of Array.from(turns)) {
      const turnId = turn.id?.trim()
      if (!turnId) continue

      const userContainer = turn.querySelector('.chat-turn-container.user')
      if (userContainer) {
        const userChunk = userContainer.querySelector('ms-cmark-node.user-chunk')
        const userContent = userChunk
          ? this.extractMarkdown(userChunk).trim()
          : userTurnLabelMap.get(turnId)

        snapshots.set(turnId, {
          role: 'user',
          ...(userContent ? { userContent } : {}),
        })
        continue
      }

      const modelContainer = turn.querySelector('.chat-turn-container.model')
      if (!modelContainer) continue

      const thoughtChunk = modelContainer.querySelector('ms-thought-chunk')
      const thinking = thoughtChunk
        ? this.collectBlocks(
            Array.from(thoughtChunk.querySelectorAll('ms-text-chunk ms-cmark-node.cmark-node')),
          )
        : ''

      const contentRoots = Array.from(modelContainer.querySelectorAll('ms-text-chunk'))
        .filter(chunk => !chunk.closest('ms-thought-chunk'))
        .map((chunk) => (
          chunk.querySelector(':scope > ms-cmark-node.cmark-node')
          || chunk.querySelector('ms-cmark-node.cmark-node')
        ))
        .filter((node): node is Element => !!node)

      const content = this.collectBlocks(contentRoots)

      const timePill = turn.querySelector('.model-run-time-pill')
      const durationText = timePill?.textContent?.match(/([\d.]+)s/)?.[1]
      const thinkingDuration = durationText ? parseFloat(durationText) * 1000 : undefined

      snapshots.set(turnId, {
        role: 'assistant',
        ...(content ? { content } : {}),
        ...(thinking ? { thinking } : {}),
        ...(thinkingDuration ? { thinkingDuration } : {}),
      })
    }

    return snapshots
  }

  private mergeSnapshot(
    existing: AIStudioTurnSnapshot | undefined,
    incoming: AIStudioTurnSnapshot,
  ): AIStudioTurnSnapshot {
    return {
      role: incoming.role,
      userContent: this.pickLongerText(existing?.userContent, incoming.userContent),
      content: this.pickLongerText(existing?.content, incoming.content),
      thinking: this.pickLongerText(existing?.thinking, incoming.thinking),
      thinkingDuration: Math.max(existing?.thinkingDuration || 0, incoming.thinkingDuration || 0) || undefined,
    }
  }

  private activateVirtualizedTurn(button: HTMLElement): void {
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    button.click()

    const targetId = button.getAttribute('aria-controls')
    if (!targetId) return

    document.getElementById(targetId)?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    })
  }

  private async preloadVirtualizedTurnSnapshots(): Promise<Map<string, AIStudioTurnSnapshot>> {
    const userTurnLabelMap = this.buildUserTurnLabelMap()
    const merged = new Map<string, AIStudioTurnSnapshot>()
    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>(AIStudioAdapter.VIRTUALIZED_TURN_BUTTON_SELECTOR),
    )

    const mergeCurrentSnapshot = () => {
      const current = this.collectTurnSnapshots(userTurnLabelMap)
      current.forEach((snapshot, turnId) => {
        merged.set(turnId, this.mergeSnapshot(merged.get(turnId), snapshot))
      })
    }

    mergeCurrentSnapshot()

    if (!buttons.length) {
      return merged
    }

    const activeButton = buttons.find(button => button.getAttribute('aria-pressed') === 'true') || null

    for (const button of buttons) {
      this.activateVirtualizedTurn(button)
      await this.nextFrame()
      await this.sleep(120)
      mergeCurrentSnapshot()
    }

    if (activeButton) {
      this.activateVirtualizedTurn(activeButton)
      await this.nextFrame()
      await this.sleep(80)
    }

    return merged
  }

  private buildMessagesFromSnapshots(snapshots: Map<string, AIStudioTurnSnapshot>): ChatMessage[] {
    const messages: ChatMessage[] = []
    const turns = document.querySelectorAll<HTMLElement>('ms-chat-turn')
    let pendingThinking = ''
    let pendingThinkingDuration = 0

    for (const turn of Array.from(turns)) {
      const turnId = turn.id?.trim()
      if (!turnId) continue

      const snapshot = snapshots.get(turnId)
      if (!snapshot) continue

      if (snapshot.role === 'user') {
        pendingThinking = ''
        pendingThinkingDuration = 0

        const userContent = snapshot.userContent?.trim()
        if (!userContent) continue

        messages.push({
          id: this.generateMessageId(),
          role: 'user',
          content: userContent,
          timestamp: Date.now(),
        })
        continue
      }

      const content = snapshot.content?.trim() || ''
      const thinking = this.mergeTextBlocks(pendingThinking, snapshot.thinking)

      const thinkingDuration = Math.max(pendingThinkingDuration, snapshot.thinkingDuration || 0)

      if (!content) {
        if (snapshot.thinking?.trim()) {
          pendingThinking = this.mergeTextBlocks(pendingThinking, snapshot.thinking)
        }
        pendingThinkingDuration = thinkingDuration
        continue
      }

      const metadata: Record<string, unknown> = {}
      if (thinkingDuration > 0) {
        metadata.thinkingDuration = thinkingDuration
      }

      messages.push({
        id: this.generateMessageId(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        ...(thinking ? { thinking } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {}),
      })

      pendingThinking = ''
      pendingThinkingDuration = 0
    }

    return messages
  }

  collectMessages(): ChatMessage[] {
    const snapshots = this.preloadedSnapshots || this.collectTurnSnapshots()
    return this.buildMessagesFromSnapshots(snapshots)
  }
}
