import type { OutlineItem } from '../types'
import { getIntelligentIcon, smartTruncate } from '../utils'

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function resolveScanRoot(target: HTMLElement): HTMLElement {
  if (target.matches('.ds-virtual-list-visible-items')) return target
  return target.querySelector<HTMLElement>('.ds-virtual-list-visible-items') || target
}

function collectCandidateItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter((child): child is HTMLElement => {
    return child instanceof HTMLElement && !!child.querySelector('.ds-message')
  })
}

function isAssistantItem(item: HTMLElement): boolean {
  return !!item.querySelector(':scope > .ds-message > .ds-markdown, :scope .ds-markdown')
}

function extractUserText(item: HTMLElement): string {
  const explicitText = item.querySelector<HTMLElement>('.fbb737a4')
  if (explicitText) return normalizeText(explicitText.textContent || '')

  const message = item.querySelector<HTMLElement>(':scope > .ds-message') || item.querySelector<HTMLElement>('.ds-message')
  if (!message) return ''

  const primaryBlock = Array.from(message.children).find((child): child is HTMLElement => {
    return child instanceof HTMLElement
      && !child.matches('.ds-markdown, .ds-theme')
      && normalizeText(child.textContent || '').length > 0
  })

  return normalizeText((primaryBlock || message).textContent || '')
}

export function scanDeepSeekOutline(target: HTMLElement | null): OutlineItem[] {
  if (!target) return []

  const root = resolveScanRoot(target)
  const items: OutlineItem[] = []

  collectCandidateItems(root).forEach((item) => {
    if (isAssistantItem(item)) return

    const title = extractUserText(item)
    if (!title) return

    items.push({
      id: items.length,
      title: smartTruncate(title, 50),
      icon: getIntelligentIcon(title),
      element: item,
    })
  })

  return items
}
