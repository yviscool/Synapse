const MERMAID_START_RE = /^(?:graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|gantt\b|pie\b|gitgraph\b|journey\b|mindmap\b|timeline\b|quadrantChart\b|sankey\b|xychart(?:-beta)?\b|block-beta\b|packet-beta\b|architecture-beta\b|kanban\b)/i
const MERMAID_INIT_RE = /^(?:%%\{[\s\S]*?\}%%\s*)+/i

export function startsWithMermaidSyntax(code: string): boolean {
  const trimmed = code.trim()
  const withoutInit = trimmed.replace(MERMAID_INIT_RE, '').trimStart()
  return MERMAID_START_RE.test(withoutInit)
}

export function sanitizeMermaidCode(code: string): string {
  let normalized = code
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()

  normalized = normalized
    .replace(/^```(?:mermaid)?\s*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim()

  const lines = normalized.split('\n')
  if (lines.length > 0 && /^\s*(?:language-)?mermaid\s*$/i.test(lines[0])) {
    lines.shift()
  }

  return lines.join('\n').trim()
}

export function extractMermaidCandidate(text: string): string | undefined {
  const normalized = sanitizeMermaidCode(text || '')
  if (!normalized) return undefined

  if (startsWithMermaidSyntax(normalized)) return normalized

  const lines = normalized.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('%%')) continue
    if (!startsWithMermaidSyntax(line)) continue

    const tail = sanitizeMermaidCode(lines.slice(i).join('\n'))
    if (tail && startsWithMermaidSyntax(tail)) return tail
  }

  return undefined
}
