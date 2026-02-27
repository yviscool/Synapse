/**
 * 通用搜索索引工具
 * 从 db.ts 和 chatRepository.ts 提取的公共搜索函数
 */

import type { Table } from "dexie";

export const SEARCH_MAX_SOURCE_LENGTH = 12000;
export const SEARCH_MAX_TOKENS = 1200;
const WORD_PREFIX_MIN_LENGTH = 2;
const WORD_PREFIX_MAX_LENGTH = 24;

// 允许技术关键词保留符号，例如 c++、c#、node.js、next.js、foo_bar
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}._#+-]*/gu;
const CJK_SEGMENT_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;
const CJK_TOKEN_RE = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u;

export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface CollectSearchTokenOptions {
  includeWordPrefixes?: boolean;
}

export function collectSearchTokens(
  text: string,
  maxTokens: number,
  options: CollectSearchTokenOptions = {},
): string[] {
  const source = normalizeSearchText(text).slice(0, SEARCH_MAX_SOURCE_LENGTH);
  if (!source) return [];
  const includeWordPrefixes = options.includeWordPrefixes ?? false;

  const tokens = new Set<string>();
  const pushToken = (token: string) => {
    if (!token || token.length > 32 || tokens.size >= maxTokens) return;
    tokens.add(token);
  };

  const words = source.match(WORD_RE) || [];
  for (const word of words) {
    if (word.length >= 2 || /^\d$/.test(word)) {
      pushToken(word);
    }
    if (includeWordPrefixes && word.length > WORD_PREFIX_MIN_LENGTH && !CJK_TOKEN_RE.test(word)) {
      const maxPrefixLength = Math.min(word.length - 1, WORD_PREFIX_MAX_LENGTH);
      for (let prefixLength = WORD_PREFIX_MIN_LENGTH; prefixLength <= maxPrefixLength; prefixLength++) {
        pushToken(word.slice(0, prefixLength));
        if (tokens.size >= maxTokens) break;
      }
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

export async function fetchTagNameMap(
  table: Table<{ id: string; name: string }, string>,
  tagIds?: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueTagIds = [...new Set(tagIds || [])].filter(Boolean);

  const tags = uniqueTagIds.length
    ? await table.where("id").anyOf(uniqueTagIds).toArray()
    : await table.toArray();

  tags.forEach((tag) => map.set(tag.id, tag.name));
  return map;
}

export interface BuildSearchIndexConfig {
  id: string;
  idField: string;
  title: string;
  content: string;
  tagIds: string[];
  tagNameMap: Map<string, string>;
  updatedAt: number;
}

export function buildSearchIndexRecord(config: BuildSearchIndexConfig): Record<string, unknown> {
  const tagText = config.tagIds
    .map((tagId) => config.tagNameMap.get(tagId))
    .filter(Boolean)
    .join(" ");

  const titleTokens = collectSearchTokens(config.title, 256, {
    includeWordPrefixes: true,
  });
  const contentTokens = collectSearchTokens(config.content, 1024, {
    includeWordPrefixes: true,
  });
  const tagTokens = collectSearchTokens(tagText, 128, {
    includeWordPrefixes: true,
  });

  const mergedTokenSet = new Set<string>([
    ...titleTokens,
    ...contentTokens,
    ...tagTokens,
  ]);
  const tokens = [...mergedTokenSet].slice(0, SEARCH_MAX_TOKENS);
  const tokenSet = new Set(tokens);

  return {
    [config.idField]: config.id,
    tokens,
    titleTokens: titleTokens.filter((token) => tokenSet.has(token)),
    tagTokens: tagTokens.filter((token) => tokenSet.has(token)),
    updatedAt: config.updatedAt || Date.now(),
  };
}
