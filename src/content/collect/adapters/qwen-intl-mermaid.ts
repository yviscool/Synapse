import { extractMermaidCandidate } from './shared/mermaid'

export function parseQwenIntlMermaidBlocksFromText(text: string): string[] {
  const results: string[] = []
  const fenceRegex = /```([^\n`]*)\r?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = fenceRegex.exec(text)) !== null) {
    const lang = (match[1] || '').trim().toLowerCase()
    const body = match[2] || ''
    const candidate = extractMermaidCandidate(body)
    if (lang === 'mermaid' && candidate) {
      results.push(candidate)
      continue
    }
    if (candidate) results.push(candidate)
  }

  if (results.length === 0) {
    const loose = extractMermaidCandidate(text)
    if (loose) results.push(loose)
  }

  return results
}

export function extractQwenIntlMermaidFromReactPayload(block: Element): string | undefined {
  const roots: Element[] = []
  let cur: Element | null = block
  for (let i = 0; i < 8 && cur; i++) {
    roots.push(cur)
    cur = cur.parentElement
  }

  const seenObjects = new Set<object>()
  const candidateTexts: string[] = []

  const visitAny = (value: unknown, depth: number): void => {
    if (value == null || depth > 7) return
    if (typeof value === 'string') {
      if (value.length > 10) candidateTexts.push(value)
      return
    }
    if (typeof value !== 'object') return
    const obj = value as object
    if (seenObjects.has(obj)) return
    seenObjects.add(obj)

    if (Array.isArray(obj)) {
      for (const item of obj) visitAny(item, depth + 1)
      return
    }

    const plain = obj as Record<string, unknown>
    for (const [k, v] of Object.entries(plain)) {
      if (k === 'children' || k === 'content' || k === 'text' || k === 'value' || k === 'markdown' || k === 'source' || k === 'code') {
        visitAny(v, depth + 1)
        continue
      }
      if (k.startsWith('memoized') || k.startsWith('pending') || k.startsWith('child') || k.startsWith('sibling') || k.startsWith('alternate') || k.startsWith('props') || k.startsWith('state')) {
        visitAny(v, depth + 1)
      }
    }
  }

  for (const root of roots) {
    const keys = Object.keys(root).filter((k) =>
      k.startsWith('__reactProps$')
      || k.startsWith('__reactFiber$')
      || k.startsWith('__reactContainer$'),
    )
    for (const key of keys) {
      try {
        const payload = (root as unknown as Record<string, unknown>)[key]
        visitAny(payload, 0)
      } catch {
        // ignore
      }
    }
  }

  for (const text of candidateTexts) {
    const blocks = parseQwenIntlMermaidBlocksFromText(text)
    if (blocks.length > 0) return blocks[0]

    const candidate = extractMermaidCandidate(text)
    if (candidate) return candidate
  }

  return undefined
}

export function detectQwenIntlCodeLanguage(block: Element, fallback = ''): string {
  const headerLang =
    block.querySelector('.qwen-markdown-code-header > div:first-child')?.textContent
    || block.querySelector('.qwen-markdown-code-header')?.firstChild?.textContent
    || ''

  const normalized = (headerLang || fallback)
    .trim()
    .toLowerCase()
    .replace(/^language-/, '')
    .split(/\s+/)[0]

  return normalized
}

export function extractQwenIntlCodeFromLines(root: Element): string {
  const lineNodes = root.querySelectorAll('.view-lines .view-line, .cm-line')
  if (lineNodes.length === 0) return ''

  const lines = Array.from(lineNodes).map((line) =>
    (line.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, ''),
  )

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.join('\n').trimEnd()
}

export function extractQwenIntlCodeText(block: Element): string {
  const directCandidates = [
    ...Array.from(block.querySelectorAll('pre code')),
    ...Array.from(block.querySelectorAll('code')),
    ...Array.from(block.querySelectorAll('textarea')),
  ]
  for (const el of directCandidates) {
    const text = (el.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .trimEnd()
    if (text.trim()) return text
  }

  const lineCode = extractQwenIntlCodeFromLines(block)
  if (lineCode.trim()) return lineCode

  const body = block.querySelector('.qwen-markdown-code-body') || block
  const bodyClone = body.cloneNode(true) as Element
  bodyClone.querySelectorAll(
    'svg, style, [class*="header"], [class*="action"], [role="img"], button',
  ).forEach((el) => el.remove())

  return (bodyClone.textContent || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
}

export function getQwenIntlMermaidCodeBlocks(root: Element): Element[] {
  const blocks = Array.from(root.querySelectorAll('.qwen-markdown-code'))
  return blocks.filter((block) => {
    const body = block.querySelector('.qwen-markdown-code-body')
    const className = (body?.getAttribute('class') || block.getAttribute('class') || '').toLowerCase()
    return className.includes('mermaid') || !!block.querySelector('.qwen-markdown-mermaid-chart, svg.flowchart')
  })
}
