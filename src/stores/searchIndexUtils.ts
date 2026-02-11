/**
 * 通用搜索索引工具
 * 从 db.ts 和 chatRepository.ts 提取的公共搜索函数
 */

export const SEARCH_MAX_SOURCE_LENGTH = 12000;
export const SEARCH_MAX_TOKENS = 1200;

const LATIN_WORD_RE = /[a-z0-9]+/g;
const CJK_SEGMENT_RE = /[\u3400-\u9fff]+/g;

export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function collectSearchTokens(text: string, maxTokens: number): string[] {
  const source = normalizeSearchText(text).slice(0, SEARCH_MAX_SOURCE_LENGTH);
  if (!source) return [];

  const tokens = new Set<string>();
  const pushToken = (token: string) => {
    if (!token || token.length > 32 || tokens.size >= maxTokens) return;
    tokens.add(token);
  };

  const latinWords = source.match(LATIN_WORD_RE) || [];
  for (const word of latinWords) {
    if (word.length >= 2 || /^\d$/.test(word)) {
      pushToken(word);
    }
    if (tokens.size >= maxTokens) break;
  }

  if (tokens.size >= maxTokens) return [...tokens];

  const cjkSegments = source.match(CJK_SEGMENT_RE) || [];
  outer: for (const segment of cjkSegments) {
    for (let i = 0; i < segment.length; i++) {
      pushToken(segment[i]);
      if (tokens.size >= maxTokens) break outer;
    }
    for (let n = 2; n <= 3; n++) {
      if (segment.length < n) continue;
      for (let i = 0; i <= segment.length - n; i++) {
        pushToken(segment.slice(i, i + n));
        if (tokens.size >= maxTokens) break outer;
      }
    }
    if (segment.length <= 8) {
      pushToken(segment);
      if (tokens.size >= maxTokens) break;
    }
  }

  return [...tokens];
}
