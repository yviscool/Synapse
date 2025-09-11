export interface ParsedQuery {
  text: string;
  categoryNames: string[];
  tagNames: string[];
}

/**
 * Parses a search query string to separate plain text from special filters.
 * Special filters are:
 * - Categories: prefixed with `>` (e.g., `>Work`)
 * - Tags: prefixed with `#` (e.g., `#review`)
 *
 * @param query - The raw query string from the search input.
 * @returns A ParsedQuery object containing the separated parts.
 */
export function parseQuery(query: string): ParsedQuery {
  const categoryNames: string[] = [];
  const tagNames: string[] = [];
  let text = '';

  const parts = query.split(/\s+/);
  const remainingParts: string[] = [];

  parts.forEach(part => {
    if (part.startsWith('>')) {
      const categoryName = part.substring(1);
      if (categoryName) {
        categoryNames.push(categoryName);
      }
    } else if (part.startsWith('#')) {
      const tagName = part.substring(1);
      if (tagName) {
        tagNames.push(tagName);
      }
    } else {
      remainingParts.push(part);
    }
  });

  text = remainingParts.join(' ').trim();

  return { text, categoryNames, tagNames };
}
