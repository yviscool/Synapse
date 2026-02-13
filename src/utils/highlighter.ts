import type { FuseResultMatch } from 'fuse.js'

/**
 * Generates an HTML string with <mark> tags highlighting the matched segments of a string.
 * This utility is designed to work with the 'matches' array provided by Fuse.js.
 *
 * @param text The original text that was searched.
 * @param matches The `matches` array from a Fuse.js search result.
 * @param key The specific key ('title', 'content', etc.) to look for in the matches array.
 * @returns An HTML string with matched characters wrapped in <mark> tags.
 */
export function generateHighlightedHtml(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): string {
  if (!matches || matches.length === 0) {
    return escapeHtml(text) // Return escaped text if no matches
  }

  const keyMatches = matches.find(m => m.key === key)
  if (!keyMatches || !keyMatches.indices || keyMatches.indices.length === 0) {
    return escapeHtml(text)
  }

  return renderHighlightedByIndices(text, keyMatches.indices)
}

/**
 * Generates highlighted HTML by a plain search query string.
 * This is useful for list UIs that only have raw query text but no Fuse matches.
 */
export function generateHighlightedHtmlByQuery(
  text: string,
  query: string | undefined | null,
): string {
  const normalizedQuery = query?.trim() || ''
  if (!normalizedQuery)
    return escapeHtml(text)

  const indices = buildMatchIndicesByQuery(text, normalizedQuery)
  if (indices.length === 0)
    return escapeHtml(text)

  return renderHighlightedByIndices(text, indices)
}

/**
 * Similar to `generateHighlightedHtml` but only renders a short snippet.
 * This reduces expensive full-text HTML generation for very long content.
 */
export function generateHighlightedPreviewHtml(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
  maxLength = 240,
): string {
  if (maxLength <= 0)
    return ''

  const keyMatches = matches?.find(m => m.key === key)
  const hasMatch = Boolean(keyMatches && keyMatches.indices && keyMatches.indices.length > 0)

  if (!hasMatch) {
    return escapeHtml(truncateText(text, maxLength))
  }

  const indices = (keyMatches!.indices || []) as ReadonlyArray<readonly [number, number]>
  let bestMatch = indices[0]
  for (const idx of indices) {
    if ((idx[1] - idx[0]) > (bestMatch[1] - bestMatch[0])) {
      bestMatch = idx
    }
  }
  const leadContext = Math.floor(maxLength * 0.35)
  let start = Math.max(0, bestMatch[0] - leadContext)
  let end = Math.min(text.length, start + maxLength)

  if (end - start < maxLength) {
    start = Math.max(0, end - maxLength)
  }

  const snippet = text.slice(start, end)
  const snippetLength = snippet.length
  const shiftedIndices = indices
    .map(([s, e]) => [s - start, e - start] as [number, number])
    .filter(([s, e]) => e >= 0 && s < snippetLength)
    .map(([s, e]) => [Math.max(0, s), Math.min(snippetLength - 1, e)] as [number, number])

  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return `${prefix}${renderHighlightedByIndices(snippet, shiftedIndices)}${suffix}`
}

/**
 * Generates highlighted preview HTML by a plain search query string.
 */
export function generateHighlightedPreviewHtmlByQuery(
  text: string,
  query: string | undefined | null,
  maxLength = 240,
): string {
  if (maxLength <= 0)
    return ''

  const normalizedQuery = query?.trim() || ''
  if (!normalizedQuery) {
    return escapeHtml(truncateText(text, maxLength))
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = normalizedQuery.toLowerCase()
  const firstMatchIndex = lowerText.indexOf(lowerQuery)
  if (firstMatchIndex < 0) {
    return escapeHtml(truncateText(text, maxLength))
  }

  const leadContext = Math.floor(maxLength * 0.35)
  let start = Math.max(0, firstMatchIndex - leadContext)
  let end = Math.min(text.length, start + maxLength)

  if (end - start < maxLength) {
    start = Math.max(0, end - maxLength)
  }

  const snippet = text.slice(start, end)
  const snippetIndices = buildMatchIndicesByQuery(snippet, normalizedQuery)

  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return `${prefix}${renderHighlightedByIndices(snippet, snippetIndices)}${suffix}`
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength)}...`
}

function renderHighlightedByIndices(
  text: string,
  indices: ReadonlyArray<readonly [number, number]>,
): string {
  const parts: string[] = []
  let lastIndex = 0

  indices.forEach(([start, end]) => {
    if (start > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, start)))
    }
    parts.push(`<mark>${escapeHtml(text.substring(start, end + 1))}</mark>`)
    lastIndex = end + 1
  })

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)))
  }

  return parts.join('')
}

function buildMatchIndicesByQuery(
  text: string,
  query: string,
): Array<[number, number]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery)
    return []

  const lowerText = text.toLowerCase()
  const lowerQuery = normalizedQuery.toLowerCase()
  const indices: Array<[number, number]> = []
  let searchFrom = 0

  while (searchFrom < lowerText.length) {
    const start = lowerText.indexOf(lowerQuery, searchFrom)
    if (start < 0)
      break
    const end = start + lowerQuery.length - 1
    indices.push([start, end])
    searchFrom = end + 1
  }

  return indices
}

/**
 * A simple utility to escape HTML special characters to prevent XSS.
 * @param str The string to escape.
 * @returns The escaped string.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
