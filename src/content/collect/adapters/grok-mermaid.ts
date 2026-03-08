import { extractMermaidCandidate } from './shared/mermaid'

export function extractCodeTextFromGrokBlock(block: Element): string {
  const directCandidates = [
    ...Array.from(block.querySelectorAll('pre code')),
    ...Array.from(block.querySelectorAll('code')),
    ...Array.from(block.querySelectorAll('textarea')),
  ]

  for (const node of directCandidates) {
    const text = (node.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .trimEnd()
    if (text.trim()) return text
  }

  const lineNodes = block.querySelectorAll('.view-lines .view-line, .cm-line')
  if (lineNodes.length > 0) {
    const lines = Array.from(lineNodes).map((line) =>
      (line.textContent || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, ''),
    )
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
    const code = lines.join('\n').trimEnd()
    if (code) return code
  }

  const clone = block.cloneNode(true) as Element
  clone.querySelectorAll('svg, style, [role="img"], button').forEach((el) => el.remove())

  return (clone.textContent || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
}

export function isGrokMermaidBlock(block: Element): boolean {
  const className = [
    block.getAttribute('class') || '',
    block.querySelector('pre code')?.getAttribute('class') || '',
    block.querySelector('code')?.getAttribute('class') || '',
  ].join(' ').toLowerCase()

  if (className.includes('mermaid')) return true
  if (block.querySelector('[data-mermaid-source], [data-mode-id="mermaid"], .mermaid, svg.flowchart, svg[id^="mermaid"]')) {
    return true
  }

  const codeText = extractCodeTextFromGrokBlock(block)
  return !!extractMermaidCandidate(codeText)
}

export function extractGrokMermaidCode(block: Element): string {
  const directCandidates = [
    ...Array.from(block.querySelectorAll('pre code.language-mermaid, code.language-mermaid')),
    ...Array.from(block.querySelectorAll('[data-mermaid-source], [data-source], [data-code], [data-clipboard-text], textarea')),
  ]

  for (const node of directCandidates) {
    const values = [
      node.textContent || '',
      node.getAttribute('data-mermaid-source') || '',
      node.getAttribute('data-source') || '',
      node.getAttribute('data-code') || '',
      node.getAttribute('data-clipboard-text') || '',
    ]

    for (const value of values) {
      const candidate = extractMermaidCandidate(value)
      if (candidate) return candidate
    }
  }

  const fallbackCode = extractCodeTextFromGrokBlock(block)
  return extractMermaidCandidate(fallbackCode) || ''
}

export function collectGrokMermaidTargets(clone: Element): Element[] {
  const targets: Element[] = []
  const seen = new Set<Element>()

  const pushTarget = (node: Element | null): void => {
    if (!node || node === clone) return
    if (seen.has(node)) return
    seen.add(node)
    targets.push(node)
  }

  clone.querySelectorAll('code').forEach((code) => {
    const className = (code.getAttribute('class') || '').toLowerCase()
    if (!className.includes('mermaid')) return
    pushTarget(code.closest('pre') || code)
  })

  clone.querySelectorAll(
    '[class*="mermaid"], [data-mermaid-source], [data-mode-id="mermaid"], svg.flowchart, svg[id^="mermaid"]',
  ).forEach((node) => {
    const target
      = node.closest(
        'pre, [class*="code-block"], [class*="codeBlock"], [class*="mermaid"], figure, [data-testid*="code"]',
      )
        || node
    pushTarget(target === clone ? node : target)
  })

  return targets.filter((target) =>
    !targets.some((other) => other !== target && other.contains(target)))
}
