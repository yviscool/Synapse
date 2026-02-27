import type { FuseResultMatch } from "fuse.js";
import type { Prompt } from "@/types/prompt";
import { db, type PromptSearchIndex } from "./db";
import {
  normalizeSearchText,
  collectSearchTokens,
  fetchTagNameMap as fetchTagNameMapGeneric,
  buildSearchIndexRecord,
} from "@/utils/searchIndexUtils";
import { compareLocalizedText } from "@/utils/intl";
import { getDefaultCategoryAliases, isDefaultCategory } from "@/utils/categoryUtils";

const ALL_CATEGORY_NAMES = new Set(["全部", "all"]);
const SEARCH_MAX_QUERY_TOKENS = 12;
const SEARCH_MAX_CANDIDATES = 500;
const CJK_TOKEN_RE = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u;
const SEARCH_SCORE_BY_MATCH_LEVEL = [0, 3, 6, 8] as const;
const PROMPT_INDEX_TOKENIZER_VERSION = 3;

let ensureSearchIndexPromise: Promise<void> | null = null;
let hasVerifiedSearchIndex = false;

function isCjkToken(token: string): boolean {
  return CJK_TOKEN_RE.test(token);
}

function extractQueryTokens(
  query: string,
  options: { includeSingleCjk?: boolean } = {},
): string[] {
  const normalizedQuery = normalizeSearchText(query);
  const rawTokens = collectSearchTokens(query, SEARCH_MAX_QUERY_TOKENS);
  if (normalizedQuery.length === 1) {
    return [...new Set(rawTokens)].filter(Boolean);
  }

  const includeSingleCjk = options.includeSingleCjk ?? false;
  return rawTokens.filter((token) => {
    if (!token) return false;
    if (isCjkToken(token)) {
      return includeSingleCjk || token.length >= 2;
    }
    return token.length >= 2;
  });
}

export function buildPromptSearchIndexRecord(
  prompt: Prompt,
  tagNameMap: Map<string, string>,
): PromptSearchIndex {
  return {
    ...(buildSearchIndexRecord({
      id: prompt.id,
      idField: "promptId",
      title: prompt.title,
      content: prompt.content,
      tagIds: prompt.tagIds,
      tagNameMap,
      updatedAt: prompt.updatedAt || Date.now(),
    }) as unknown as PromptSearchIndex),
    tokenizerVersion: PROMPT_INDEX_TOKENIZER_VERSION,
  };
}

async function fetchPromptTagNameMap(tagIds?: string[]): Promise<Map<string, string>> {
  return fetchTagNameMapGeneric(db.tags, tagIds);
}

async function ensurePromptSearchIndexReady(): Promise<void> {
  if (hasVerifiedSearchIndex) {
    return;
  }

  if (ensureSearchIndexPromise) {
    await ensureSearchIndexPromise;
    return;
  }

  ensureSearchIndexPromise = (async () => {
    const [promptCount, indexCount, sampleRecord] = await Promise.all([
      db.prompts.count(),
      db.prompt_search_index.count(),
      db.prompt_search_index.limit(1).first(),
    ]);

    if (promptCount === 0) {
      if (indexCount > 0) {
        await db.prompt_search_index.clear();
      }
      hasVerifiedSearchIndex = true;
      return;
    }

    const indexVersionMatches = sampleRecord?.tokenizerVersion === PROMPT_INDEX_TOKENIZER_VERSION;
    if (indexCount !== promptCount || !indexVersionMatches) {
      await rebuildPromptSearchIndex();
    }

    hasVerifiedSearchIndex = true;
  })();

  try {
    await ensureSearchIndexPromise;
  } finally {
    ensureSearchIndexPromise = null;
  }
}
export async function upsertPromptSearchIndex(
  prompt: Prompt,
  tagNameMap?: Map<string, string>,
): Promise<void> {
  if (!prompt.id) return;
  const resolvedTagMap = tagNameMap || (await fetchPromptTagNameMap(prompt.tagIds));
  const record = buildPromptSearchIndexRecord(prompt, resolvedTagMap);
  await db.prompt_search_index.put(record);
}

export async function bulkUpsertPromptSearchIndex(
  prompts: Prompt[],
): Promise<void> {
  if (prompts.length === 0) return;
  const tagIds = prompts.flatMap((prompt) => prompt.tagIds || []);
  const tagNameMap = await fetchPromptTagNameMap(tagIds);
  const records = prompts.map((prompt) =>
    buildPromptSearchIndexRecord(prompt, tagNameMap),
  );
  await db.prompt_search_index.bulkPut(records);
}

export async function removePromptSearchIndex(
  promptIds: string | string[],
): Promise<void> {
  const ids = Array.isArray(promptIds) ? promptIds : [promptIds];
  if (ids.length === 0) return;
  await db.prompt_search_index.bulkDelete(ids);
}

export async function rebuildPromptSearchIndex(): Promise<void> {
  const [prompts, tags] = await Promise.all([
    db.prompts.toArray(),
    db.tags.toArray(),
  ]);
  const tagNameMap = new Map(tags.map((tag) => [tag.id, tag.name]));
  const records = prompts.map((prompt) =>
    buildPromptSearchIndexRecord(prompt, tagNameMap),
  );
  await db.prompt_search_index.clear();
  if (records.length > 0) {
    await db.prompt_search_index.bulkPut(records);
  }
}
function findMatchIndices(
  text: string,
  terms: string[],
  maxMatches: number,
): [number, number][] {
  if (!text || terms.length === 0) return [];

  const lowerText = text.toLowerCase();
  const hits: [number, number][] = [];

  for (const rawTerm of terms) {
    const term = rawTerm.toLowerCase();
    if (!term) continue;

    let from = 0;
    while (from < lowerText.length) {
      const idx = lowerText.indexOf(term, from);
      if (idx === -1) break;
      hits.push([idx, idx + term.length - 1]);
      from = idx + term.length;
      if (hits.length >= maxMatches * 2) break;
    }

    if (hits.length >= maxMatches * 2) break;
  }

  if (hits.length === 0) return [];

  hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: [number, number][] = [];
  for (const [start, end] of hits) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1] + 1) {
      merged.push([start, end]);
      if (merged.length >= maxMatches) break;
      continue;
    }
    last[1] = Math.max(last[1], end);
  }

  return merged;
}

function buildPromptMatches(
  prompt: Prompt,
  normalizedQuery: string,
  queryTokens: string[],
): readonly FuseResultMatch[] | undefined {
  const terms = [...new Set([normalizedQuery, ...queryTokens])].filter(Boolean);
  if (terms.length === 0) return undefined;
  const titleIndices = findMatchIndices(prompt.title, terms, 12);
  const contentIndices = findMatchIndices(prompt.content, terms, 24);
  if (titleIndices.length === 0 && contentIndices.length === 0) {
    return undefined;
  }

  const matches: FuseResultMatch[] = [];
  if (titleIndices.length > 0) {
    matches.push({
      key: "title",
      value: prompt.title,
      indices: titleIndices,
    } as FuseResultMatch);
  }
  if (contentIndices.length > 0) {
    matches.push({
      key: "content",
      value: prompt.content,
      indices: contentIndices,
    } as FuseResultMatch);
  }

  return matches;
}

function normalizeCategoryNames(
  legacyCategory?: string,
  categoryNames: string[] = [],
): string[] {
  const normalized = new Set<string>();

  for (const name of categoryNames) {
    const trimmed = name.trim();
    if (trimmed) normalized.add(trimmed);
  }

  if (legacyCategory) {
    const trimmed = legacyCategory.trim();
    if (trimmed && !ALL_CATEGORY_NAMES.has(trimmed.toLowerCase())) {
      normalized.add(trimmed);
    }
  }

  return [...normalized];
}

function normalizeCategoryToken(token: string): string {
  return token.trim().toLowerCase();
}

async function resolveCategoryIds(
  categoryNames: string[],
  directCategoryIds: string[] = [],
): Promise<string[] | undefined> {
  const directIds = [...new Set(directCategoryIds.map((id) => id.trim()).filter(Boolean))];
  const normalizedNames = categoryNames
    .map(normalizeCategoryToken)
    .filter((name) => name && !ALL_CATEGORY_NAMES.has(name));

  if (directIds.length === 0 && normalizedNames.length === 0) {
    return undefined;
  }

  if (normalizedNames.length === 0) {
    return directIds;
  }

  const categories = await db.categories.toArray();
  const aliasMap = new Map<string, string>();

  const addAlias = (alias: string, categoryId: string) => {
    const key = normalizeCategoryToken(alias);
    if (!key) return;
    aliasMap.set(key, categoryId);
  };

  for (const category of categories) {
    addAlias(category.id, category.id);
    addAlias(category.name, category.id);

    if (isDefaultCategory(category.id)) {
      const aliases = getDefaultCategoryAliases(category.id);
      aliases.forEach((alias) => addAlias(alias, category.id));
    }
  }

  const resolvedByName = new Set<string>();
  normalizedNames.forEach((name) => {
    const id = aliasMap.get(name);
    if (id) resolvedByName.add(id);
  });

  const merged = [...new Set([...directIds, ...resolvedByName])];
  return merged;
}

function sortPromptsInMemory(
  prompts: PromptWithMatches[],
  sortBy: "updatedAt" | "createdAt" | "title" | "relevance",
): PromptWithMatches[] {
  if (sortBy === "relevance") {
    return prompts.slice();
  }

  const sorted = prompts.slice();

  sorted.sort((a, b) => {
    if (sortBy === "title") {
      return compareLocalizedText(a.title, b.title);
    }
    return (b[sortBy] || 0) - (a[sortBy] || 0);
  });

  return sorted;
}

async function searchPromptsByIndex(
  normalizedQuery: string,
  queryTokens: string[],
): Promise<Prompt[]> {
  if (!normalizedQuery || queryTokens.length === 0) {
    return [];
  }

  await ensurePromptSearchIndexReady();
  const indexRows = await db.prompt_search_index
    .where("tokens")
    .anyOf(queryTokens)
    .distinct()
    .toArray();
  if (indexRows.length === 0) {
    return [];
  }

  const queryTokenIndexMap = new Map<string, number>();
  queryTokens.forEach((token, index) => {
    queryTokenIndexMap.set(token, index);
  });

  const baseScoreMap = new Map<string, number>();
  for (const row of indexRows) {
    const matchLevels = new Uint8Array(queryTokens.length);

    for (const token of row.tokens) {
      const tokenIndex = queryTokenIndexMap.get(token);
      if (tokenIndex !== undefined && matchLevels[tokenIndex] < 1) {
        matchLevels[tokenIndex] = 1;
      }
    }
    for (const token of row.tagTokens) {
      const tokenIndex = queryTokenIndexMap.get(token);
      if (tokenIndex !== undefined && matchLevels[tokenIndex] < 2) {
        matchLevels[tokenIndex] = 2;
      }
    }
    for (const token of row.titleTokens) {
      const tokenIndex = queryTokenIndexMap.get(token);
      if (tokenIndex !== undefined && matchLevels[tokenIndex] < 3) {
        matchLevels[tokenIndex] = 3;
      }
    }

    let score = 0;
    for (const matchLevel of matchLevels) {
      score += SEARCH_SCORE_BY_MATCH_LEVEL[matchLevel];
    }

    if (score > 0) {
      baseScoreMap.set(row.promptId, (baseScoreMap.get(row.promptId) || 0) + score);
    }
  }

  if (baseScoreMap.size === 0) {
    return [];
  }

  const candidateIds = [...baseScoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SEARCH_MAX_CANDIDATES)
    .map(([promptId]) => promptId);

  const prompts = await db.prompts.where("id").anyOf(candidateIds).toArray();
  const promptMap = new Map(prompts.map((prompt) => [prompt.id, prompt]));

  const ranked = candidateIds
    .map((promptId) => {
      const prompt = promptMap.get(promptId);
      if (!prompt) return null;

      let score = baseScoreMap.get(promptId) || 0;
      const titleText = normalizeSearchText(prompt.title);
      const contentText = normalizeSearchText(prompt.content);

      if (titleText.includes(normalizedQuery)) score += 15;
      if (contentText.includes(normalizedQuery)) score += 6;

      return { score, prompt };
    })
    .filter(Boolean) as Array<{ score: number; prompt: Prompt }>;

  ranked.sort(
    (a, b) =>
      b.score - a.score || (b.prompt.updatedAt || 0) - (a.prompt.updatedAt || 0),
  );

  return ranked.map((item) => item.prompt);
}
async function fetchPromptsWithoutSearch(
  sortBy: "updatedAt" | "createdAt" | "title",
  categoryIds?: string[],
  tagIds?: string[],
): Promise<PromptWithMatches[]> {
  if (categoryIds && categoryIds.length > 0) {
    const prompts = await db.prompts.where("categoryIds").anyOf(categoryIds).toArray();
    return sortPromptsInMemory(prompts, sortBy);
  }

  if (tagIds && tagIds.length > 0) {
    const prompts = await db.prompts.where("tagIds").anyOf(tagIds).toArray();
    return sortPromptsInMemory(prompts, sortBy);
  }

  let collection = db.prompts.orderBy(sortBy);
  if (sortBy === "updatedAt" || sortBy === "createdAt") {
    collection = collection.reverse();
  }
  return collection.toArray();
}

async function searchPromptsBySubstring(
  normalizedQuery: string,
): Promise<Prompt[]> {
  if (!normalizedQuery) return [];

  const prompts = await db.prompts.toArray();
  return prompts.filter((prompt) => {
    const title = normalizeSearchText(prompt.title);
    const content = normalizeSearchText(prompt.content);
    return title.includes(normalizedQuery) || content.includes(normalizedQuery);
  });
}

async function resolveTagIdsByNames(tagNames: string[]): Promise<string[]> {
  const normalizedNames = [...new Set(
    tagNames
      .map((name) => normalizeSearchText(name))
      .filter(Boolean),
  )];
  if (normalizedNames.length === 0) return [];

  const tags = await db.tags.toArray();
  const nameSet = new Set(normalizedNames);
  const tagIds = tags
    .filter((tag) => nameSet.has(normalizeSearchText(tag.name)))
    .map((tag) => tag.id);

  return tagIds.length > 0 ? [...new Set(tagIds)] : [];
}

// ============================================
// Public Types & Query API
// ============================================

export interface QueryPromptsParams {
  searchQuery?: string;
  category?: string;
  categoryIds?: string[];
  categoryNames?: string[];
  tagNames?: string[];
  favoriteOnly?: boolean;
  sortBy?: "updatedAt" | "createdAt" | "title" | "relevance";
  page?: number;
  limit?: number;
}

export type PromptWithMatches = Prompt & {
  matches?: readonly FuseResultMatch[];
};

export interface QueryPromptsResult {
  prompts: PromptWithMatches[];
  total: number;
}
export async function queryPrompts(
  params: QueryPromptsParams = {},
): Promise<QueryPromptsResult> {
  const {
    searchQuery,
    category,
    categoryIds: initialCategoryIds,
    categoryNames: initialCategoryNames,
    tagNames,
    favoriteOnly,
    sortBy,
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;
  const normalizedSearchQuery = searchQuery ? normalizeSearchText(searchQuery) : "";
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  let queryTokens = searchQuery ? extractQueryTokens(searchQuery) : [];
  const resolvedCategoryNames = normalizeCategoryNames(category, initialCategoryNames);
  const resolvedTagNames =
    tagNames?.map((name) => name.trim()).filter(Boolean) || [];
  const effectiveSortBy: "updatedAt" | "createdAt" | "title" | "relevance" =
    sortBy ?? (hasSearchQuery ? "relevance" : "updatedAt");

  const categoryIds = await resolveCategoryIds(
    resolvedCategoryNames,
    initialCategoryIds || [],
  );
  if (categoryIds && (resolvedCategoryNames.length > 0 || (initialCategoryIds || []).length > 0)) {
    if (categoryIds.length === 0) {
      return { prompts: [], total: 0 };
    }
  }

  let tagIds: string[] | undefined;
  if (resolvedTagNames.length > 0) {
    tagIds = await resolveTagIdsByNames(resolvedTagNames);
    if (tagIds.length === 0) {
      return { prompts: [], total: 0 };
    }
  }

  const databaseSortBy: "updatedAt" | "createdAt" | "title" =
    effectiveSortBy === "relevance"
      ? "updatedAt"
      : effectiveSortBy;

  // 常见热路径：无搜索、无其他过滤时直接走数据库分页，避免全表加载后再切片
  if (
    !searchQuery &&
    !favoriteOnly &&
    (!categoryIds || categoryIds.length === 0) &&
    (!tagIds || tagIds.length === 0)
  ) {
    let collection = db.prompts.orderBy(databaseSortBy);
    if (databaseSortBy === "updatedAt" || databaseSortBy === "createdAt") {
      collection = collection.reverse();
    }

    const [total, prompts] = await Promise.all([
      db.prompts.count(),
      collection.offset(offset).limit(limit).toArray(),
    ]);

    return { prompts, total };
  }

  let filteredPrompts: PromptWithMatches[] = [];
  if (hasSearchQuery) {
    if (queryTokens.length > 0) {
      filteredPrompts = await searchPromptsByIndex(
        normalizedSearchQuery,
        queryTokens,
      ) as PromptWithMatches[];

      if (filteredPrompts.length === 0 && normalizedSearchQuery.length > 1 && searchQuery) {
        const fallbackTokens = extractQueryTokens(searchQuery, {
          includeSingleCjk: true,
        });
        const hasDifferentFallback =
          fallbackTokens.length > 0 &&
          fallbackTokens.join("\u0000") !== queryTokens.join("\u0000");

        if (hasDifferentFallback) {
          filteredPrompts = await searchPromptsByIndex(
            normalizedSearchQuery,
            fallbackTokens,
          ) as PromptWithMatches[];
          queryTokens = fallbackTokens;
        }
      }

    } else {
      filteredPrompts = await searchPromptsBySubstring(normalizedSearchQuery) as PromptWithMatches[];
    }
  } else {
    filteredPrompts = await fetchPromptsWithoutSearch(databaseSortBy, categoryIds, tagIds);
  }

  const filterConditions: ((p: Prompt) => boolean)[] = [];
  if (favoriteOnly) {
    filterConditions.push((p) => !!p.favorite);
  }
  if (categoryIds && categoryIds.length > 0) {
    filterConditions.push((p) =>
      categoryIds.some((catId) => p.categoryIds.includes(catId)),
    );
  }
  if (tagIds && tagIds.length > 0) {
    filterConditions.push((p) =>
      tagIds.every((tagId) => p.tagIds.includes(tagId)),
    );
  }

  if (filterConditions.length > 0) {
    filteredPrompts = filteredPrompts.filter((p) =>
      filterConditions.every((cond) => cond(p)),
    );
  }

  if (hasSearchQuery && effectiveSortBy !== "relevance") {
    filteredPrompts = sortPromptsInMemory(filteredPrompts, effectiveSortBy);
  }

  const total = filteredPrompts.length;
  let paginatedPrompts = filteredPrompts.slice(offset, offset + limit);

  if (hasSearchQuery && normalizedSearchQuery) {
    paginatedPrompts = paginatedPrompts.map((prompt) => ({
      ...prompt,
      matches: buildPromptMatches(prompt, normalizedSearchQuery, queryTokens),
    }));
  }

  return { prompts: paginatedPrompts, total };
}
