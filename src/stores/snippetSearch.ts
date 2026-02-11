import type { Snippet, SnippetSearchIndex } from "@/types/snippet";
import { db } from "./db";
import {
  fetchTagNameMap as fetchTagNameMapGeneric,
  buildSearchIndexRecord,
} from "./searchIndexUtils";

function fetchSnippetTagNameMap(tagIds?: string[]): Promise<Map<string, string>> {
  return fetchTagNameMapGeneric(db.snippet_tags, tagIds);
}

function buildSnippetSearchIndexRecord(
  snippet: Snippet,
  tagNameMap: Map<string, string>,
): SnippetSearchIndex {
  return buildSearchIndexRecord({
    id: snippet.id,
    idField: "snippetId",
    title: snippet.title,
    content: snippet.content,
    tagIds: snippet.tagIds,
    tagNameMap,
    updatedAt: snippet.updatedAt || Date.now(),
  }) as unknown as SnippetSearchIndex;
}

export async function upsertSnippetSearchIndex(
  snippet: Snippet,
  tagNameMap?: Map<string, string>,
): Promise<void> {
  if (!snippet.id) return;
  const resolvedTagMap = tagNameMap || (await fetchSnippetTagNameMap(snippet.tagIds));
  const record = buildSnippetSearchIndexRecord(snippet, resolvedTagMap);
  await db.snippet_search_index.put(record);
}

export async function bulkUpsertSnippetSearchIndex(
  snippets: Snippet[],
): Promise<void> {
  if (snippets.length === 0) return;
  const tagIds = snippets.flatMap((snippet) => snippet.tagIds || []);
  const tagNameMap = await fetchSnippetTagNameMap(tagIds);
  const records = snippets.map((snippet) =>
    buildSnippetSearchIndexRecord(snippet, tagNameMap),
  );
  await db.snippet_search_index.bulkPut(records);
}

export async function removeSnippetSearchIndex(
  snippetIds: string | string[],
): Promise<void> {
  const ids = Array.isArray(snippetIds) ? snippetIds : [snippetIds];
  if (ids.length === 0) return;
  await db.snippet_search_index.bulkDelete(ids);
}

export async function rebuildSnippetSearchIndex(): Promise<void> {
  const [snippets, tags] = await Promise.all([
    db.snippets.toArray(),
    db.snippet_tags.toArray(),
  ]);
  const tagNameMap = new Map(tags.map((tag) => [tag.id, tag.name]));
  const records = snippets.map((snippet) =>
    buildSnippetSearchIndexRecord(snippet, tagNameMap),
  );
  await db.snippet_search_index.clear();
  if (records.length > 0) {
    await db.snippet_search_index.bulkPut(records);
  }
}
