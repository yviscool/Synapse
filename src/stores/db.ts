import Dexie, { type Table } from 'dexie'
import type Fuse from 'fuse.js'
import type { Prompt, PromptVersion, Category, Tag, Settings } from '@/types/prompt'
import { MSG, type PerformSearchResult } from '@/utils/messaging'
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

// All database write operations and their corresponding notifications are now handled
// by the Repository pattern in `repository.ts`.
// This ensures that notifications are only sent *after* a transaction is complete,
// preventing race conditions and "Transaction committed too early" errors.

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

// The setSettings function has been removed.
// All settings modifications must go through the repository.

/**
 * Defines the parameters for querying prompts.
 */
export interface QueryPromptsParams {
  searchQuery?: string
  category?: string // Legacy from content script, will be merged into categoryNames
  categoryNames?: string[]
  tagNames?: string[]
  favoriteOnly?: boolean
  sortBy?: 'updatedAt' | 'createdAt' | 'title'
  page?: number
  limit?: number
}

/**
 * Extends the Prompt type to include Fuse.js match details for highlighting.
 */
export type PromptWithMatches = Prompt & {
  matches?: readonly Fuse.FuseResultMatch[]
}

/**
 * Defines the structure of the returned data from queryPrompts.
 */
export interface QueryPromptsResult {
  prompts: PromptWithMatches[];
  total: number;
}

/**
 * Performs an advanced, paginated query for prompts, leveraging Fuse.js for efficient
 * fuzzy searching and Dexie for filtering and retrieval.
 *
 * @param params - The query parameters.
 * @returns A promise that resolves to an object containing the prompts for the page and the total count of matching prompts.
 */
export async function queryPrompts(params: QueryPromptsParams = {}): Promise<QueryPromptsResult> {
  const {
    searchQuery,
    category,
    categoryNames: initialCategoryNames,
    tagNames,
    favoriteOnly,
    sortBy = 'updatedAt',
    page = 1,
    limit = 20,
  } = params

  const offset = (page - 1) * limit
  let filteredPrompts: PromptWithMatches[] = []

  if (searchQuery) {
    // 1. Delegate search to the background script
    const response = await chrome.runtime.sendMessage({
      type: MSG.PERFORM_SEARCH,
      data: { query: searchQuery },
    })

    if (!response.ok || !response.data) {
      console.error('Failed to perform search via background script:', response.error)
      return { prompts: [], total: 0 }
    }

    const searchResults = response.data as PerformSearchResult[]
    if (searchResults.length === 0) {
      return { prompts: [], total: 0 }
    }

    const resultIds = searchResults.map(res => res.item.id)
    const matchesMap = new Map(searchResults.map(res => [res.item.id, res.matches]))

    // 2. Fetch only the matching prompts from Dexie
    const promptsFromDb = await db.prompts.where('id').anyOf(resultIds).toArray()

    // Create a map for quick reordering based on search score
    const promptsMap = new Map(promptsFromDb.map(p => [p.id, p]))

    // 3. Reorder the prompts according to Fuse.js relevance score and attach matches
    filteredPrompts = resultIds
      .map((id) => {
        const prompt = promptsMap.get(id)
        if (!prompt) return null
        return { ...prompt, matches: matchesMap.get(id) }
      })
      .filter(Boolean) as PromptWithMatches[]
  }
  else {
    // No search query, start with a Dexie collection sorted as requested
    let collection = db.prompts.orderBy(sortBy)
    if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
      collection = collection.reverse()
    }
    filteredPrompts = await collection.toArray()
  }

  // 4. Resolve name-based filters to IDs before applying them
  const categoryNames = [...(initialCategoryNames || [])]
  if (category && category !== '全部') {
    categoryNames.push(category)
  }

  let categoryIds: string[] | undefined
  if (categoryNames.length > 0) {
    // Use a Set to handle potential duplicates
    const uniqueNames = [...new Set(categoryNames)]
    const categories = await db.categories.where('name').anyOf(uniqueNames).toArray()
    categoryIds = categories.map(c => c.id)
  }

  let tagIds: string[] | undefined
  if (tagNames && tagNames.length > 0) {
    const tags = await db.tags.where('name').anyOf(tagNames).toArray()
    tagIds = tags.map(t => t.id)
  }

  // 5. Apply additional filters (favorite, categories, tags) on the (potentially search-filtered) list
  const filterConditions: ((p: Prompt) => boolean)[] = []
  if (favoriteOnly) {
    filterConditions.push(p => !!p.favorite)
  }
  if (categoryIds && categoryIds.length > 0) {
    filterConditions.push(p => categoryIds.some(catId => p.categoryIds.includes(catId)))
  }
  if (tagIds && tagIds.length > 0) {
    filterConditions.push(p => tagIds.every(tagId => p.tagIds.includes(tagId)))
  }

  if (filterConditions.length > 0) {
    filteredPrompts = filteredPrompts.filter(p => filterConditions.every(cond => cond(p)))
  }

  // 5. Apply pagination
  const total = filteredPrompts.length
  const paginatedPrompts = filteredPrompts.slice(offset, offset + limit)

  return { prompts: paginatedPrompts, total }
}
