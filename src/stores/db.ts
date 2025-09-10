import Dexie, { Table } from 'dexie'
import type { Prompt, PromptVersion, Category, Tag, Settings } from '@/types/prompt'
import { createSafePrompt } from '@/utils/promptUtils'

export class APMDB extends Dexie {
  prompts!: Table<Prompt, string>
  prompt_versions!: Table<PromptVersion, string>
  categories!: Table<Category, string>
  tags!: Table<Tag, string>
  settings!: Table<Settings, string>

  constructor() {
    super('apm')
    this.version(1).stores({
      prompts: 'id, title, tagIds, updatedAt, favorite, createdAt',
      prompt_versions: 'id, promptId, createdAt',
      categories: 'id, name, sort, icon',
      tags: 'id, name',
      settings: 'id',
    })
    // Version 2: Add multi-entry indexes for efficient filtering
    this.version(2).stores({
      prompts: 'id, title, *categoryIds, *tagIds, updatedAt, favorite, createdAt',
    })
  }
}

export const db = new APMDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  hotkeyOpen: 'Alt+K',
  enableSlash: true,
  enableSites: {},
  panelPos: null,
  theme: 'auto',
  outlineEnabled: true,
  // Sync settings
  syncEnabled: false,
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('global')
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return s
}

export async function setSettings(patch: Partial<Settings>) {
  const cur = await getSettings()
  await db.settings.put({ ...cur, ...patch })
}


/**
 * Merges prompts into specific categories and adds additional tags.
 * @param promptsToImport - Array of prompts from the imported file.
 * @param targetCategoryIds - The IDs of the categories to merge into.
 * @param additionalTagsFromModal - A list of strings for extra tags to add from the modal.
 * @returns An object with counts of imported and skipped prompts.
 */
export async function mergePrompts(
  promptsToImport: Prompt[],
  targetCategoryIds: string[],
  additionalTagsFromModal: string[],
): Promise<{ importedCount: number; skippedCount: number }> {
  return db.transaction('rw', db.prompts, db.tags, async () => {
    const existingTitles = new Set((await db.prompts.toArray()).map(p => p.title))
    const newPrompts: Prompt[] = []

    // 1. Collect ALL unique tag names from all sources
    const allTagNames = new Set<string>()
    additionalTagsFromModal.forEach(t => allTagNames.add(t))
    promptsToImport.forEach((p) => {
      if (Array.isArray(p.tagIds)) {
        // We assume the tagIds from the file are actually tag names
        p.tagIds.forEach(tagName => allTagNames.add(String(tagName)))
      }
    })

    // 2. Resolve all tag names to IDs in a batch
    const tagNameToIdMap = new Map<string, string>()
    const tagNamesArray = [...allTagNames]

    if (tagNamesArray.length > 0) {
      const existingTags = await db.tags.where('name').anyOf(tagNamesArray).toArray()
      existingTags.forEach(tag => tagNameToIdMap.set(tag.name, tag.id))

      for (const name of tagNamesArray) {
        if (!tagNameToIdMap.has(name)) {
          const newTag = { id: crypto.randomUUID(), name }
          await db.tags.add(newTag)
          tagNameToIdMap.set(name, newTag.id)
        }
      }
    }

    // 3. Process each prompt
    for (const p of promptsToImport) {
      if (!p.title || existingTitles.has(p.title)) {
        continue
      }

      // Resolve tag names from the file to IDs
      const tagIdsFromFile: string[] = []
      if (Array.isArray(p.tagIds)) {
        p.tagIds.forEach((tagName) => {
          const id = tagNameToIdMap.get(String(tagName))
          if (id) tagIdsFromFile.push(id)
        })
      }

      // Resolve tag names from the modal input to IDs
      const tagIdsFromModal: string[] = additionalTagsFromModal.map(name => tagNameToIdMap.get(name)).filter(Boolean) as string[]

      // Combine them
      const finalTagIds = [...new Set([...tagIdsFromFile, ...tagIdsFromModal])]

      const newPrompt = createSafePrompt({
        title: p.title,
        content: p.content,
        categoryIds: targetCategoryIds,
        tagIds: finalTagIds, // Use the resolved IDs
        favorite: false,
      })
      newPrompt.id = crypto.randomUUID()

      newPrompts.push(newPrompt)
      existingTitles.add(newPrompt.title)
    }

    if (newPrompts.length > 0) {
      await db.prompts.bulkAdd(newPrompts)
    }

    return {
      importedCount: newPrompts.length,
      skippedCount: promptsToImport.length - newPrompts.length,
    }
  })
}

/**
 * Defines the parameters for querying prompts.
 */
export interface QueryPromptsParams {
  searchQuery?: string;
  category?: string; // Storing category ID
  tags?: string[]; // Storing tag IDs
  favoriteOnly?: boolean;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  page?: number;
  limit?: number;
}

/**
 * Defines the structure of the returned data from queryPrompts.
 */
export interface QueryPromptsResult {
  prompts: Prompt[];
  total: number;
}

/**
 * Performs an advanced, paginated query for prompts.
 * It leverages IndexedDB indexes for sorting and then applies filters efficiently
 * before retrieving a single page of data from the database.
 *
 * @param params - The query parameters.
 * @returns A promise that resolves to an object containing the prompts for the page and the total count of matching prompts.
 */
export async function queryPrompts(params: QueryPromptsParams = {}): Promise<QueryPromptsResult> {
  const {
    searchQuery,
    category,
    tags,
    favoriteOnly,
    sortBy = 'updatedAt',
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;

  // Start with a collection sorted in the desired order via index.
  let collection = db.prompts.orderBy(sortBy);

  if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
    collection = collection.reverse();
  }

  const filterConditions: ((p: Prompt) => boolean)[] = [];

  if (favoriteOnly) {
    filterConditions.push(p => !!p.favorite);
  }

  if (category) {
    filterConditions.push(p => p.categoryIds.includes(category));
  }

  if (tags && tags.length > 0) {
    filterConditions.push(p => tags.every(tagId => p.tagIds.includes(tagId)));
  }

  let finalCollection = collection;

  if (filterConditions.length > 0) {
    finalCollection = collection.filter(prompt => filterConditions.every(cond => cond(prompt)));
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    const tagMap = new Map((await db.tags.toArray()).map(t => [t.id, t.name]));

    finalCollection = finalCollection.filter(p => {
      const tagNames = (p.tagIds || []).map(tid => tagMap.get(tid) || '').join(' ').toLowerCase();
      return p.title.toLowerCase().includes(query) ||
             p.content.toLowerCase().includes(query) ||
             tagNames.includes(query);
    });
  }

  const total = await finalCollection.count();
  const prompts = await finalCollection.offset(offset).limit(limit).toArray();

  return { prompts, total };
}
