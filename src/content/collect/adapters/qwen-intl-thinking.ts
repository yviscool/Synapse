const THINKING_CARD_SELECTOR_PREFIX = '.splitter-container-right-panel .qwen-chat-thinking-status-card'

export function getQwenIntlThinkingCards(assistantId: string): Element[] {
  return Array.from(
    document.querySelectorAll(
      `${THINKING_CARD_SELECTOR_PREFIX}[data-phase-id^="${assistantId}_"]`,
    ),
  )
}

export function hasQwenIntlThinkingCardContent(cards: Iterable<Element>): boolean {
  for (const card of cards) {
    const content = (card.querySelector('.qwen-markdown')?.textContent || '')
      .replace(/\s+/g, '')
      .trim()
    if (content.length > 0) return true
  }
  return false
}

export function getQwenIntlThinkingTriggers(messageEl: Element): HTMLElement[] {
  const selectors = [
    '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-tool-status-card',
    '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-completed',
    '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-title',
    '.qwen-chat-thinking-tool-status-card-wraper .qwen-chat-thinking-status-card-title-text',
    '.qwen-chat-thinking-tool-status-card-wraper',
  ]

  const triggers: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  for (const selector of selectors) {
    const nodes = Array.from(messageEl.querySelectorAll<HTMLElement>(selector))
    for (const node of nodes) {
      if (seen.has(node)) continue
      seen.add(node)
      triggers.push(node)
    }
  }

  return triggers
}

export function getQwenIntlThinkingCloseButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '.splitter-container-right-panel .qwen-chat-thinking-and-sources-header .anticon',
  ) || document.querySelector<HTMLElement>(
    '.splitter-container-right-panel .qwen-chat-thinking-and-sources-header [role="img"]',
  )
}

export function getQwenIntlAssistantId(messageEl: Element): string | null {
  const id = messageEl.getAttribute('id') || ''
  const match = id.match(/^qwen-chat-message-assistant-(.+)$/)
  return match ? match[1] : null
}

export function isQwenIntlGenericThinkingTitle(title: string): boolean {
  const normalized = title.replace(/\s+/g, '').toLowerCase()
  return normalized === '已经完成思考'
    || normalized === '已完成思考'
    || normalized === 'thinkingcompleted'
}

export function extractQwenIntlThinkingFromRightPanel(
  assistantId: string,
  extractText: (el: Element | null) => string,
  extractMarkdown: (el: Element | null) => string,
): string | undefined {
  const cards = getQwenIntlThinkingCards(assistantId)
  if (cards.length === 0) return undefined

  const chunks: string[] = []
  cards.forEach((card) => {
    const title = extractText(card.querySelector('.qwen-chat-thinking-status-card-title-text'))
    const body = extractMarkdown(card.querySelector('.qwen-markdown')).trim()

    if (title && !isQwenIntlGenericThinkingTitle(title)) {
      chunks.push(body ? `${title}\n${body}` : title)
    } else if (body) {
      chunks.push(body)
    }
  })

  const thinking = chunks.join('\n\n').trim()
  return thinking || undefined
}
