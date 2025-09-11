import type Fuse from 'fuse.js'

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
  matches: readonly Fuse.FuseResultMatch[] | undefined,
  key: string,
): string {
  if (!matches || matches.length === 0) {
    return escapeHtml(text) // Return escaped text if no matches
  }

  const keyMatches = matches.find(m => m.key === key)
  if (!keyMatches || !keyMatches.indices || keyMatches.indices.length === 0) {
    return escapeHtml(text)
  }

  const indices = keyMatches.indices
  const parts: string[] = []
  let lastIndex = 0

  // Fuse.js provides [start, end] indices of matched segments.
  // We iterate through them, slicing the string and wrapping matches in <mark>.
  indices.forEach(([start, end]) => {
    // Add the text part before the match
    if (start > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, start)))
    }
    // Add the highlighted part
    parts.push(`<mark class="bg-yellow-200/80 rounded-sm px-0.5">${escapeHtml(text.substring(start, end + 1))}</mark>`)
    lastIndex = end + 1
  })

  // Add the remaining part of the string
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)))
  }

  return parts.join('')
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
