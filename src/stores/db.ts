import Dexie, { type Table } from 'dexie'
import type Fuse from 'fuse.js'
import type { Prompt, PromptVersion, Category, Tag, Settings } from '@/types/prompt'
import { MSG, type PerformSearchResult } from '@/utils/messaging'
import { createSafePrompt } from '@/utils/promptUtils'
import { searchService } from '@/services/SearchService'

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

// --- Dexie Hooks for real-time sync with SearchService ---

// Update search index when prompts change
db.prompts.hook('creating', (primKey, obj, trans) => {
  searchService.add(obj) // No more N+1 query
})

db.prompts.hook('updating', (modifications, primKey, obj, trans) => {
  searchService.update(obj) // No more N+1 query
})

db.prompts.hook('deleting', (primKey, obj, trans) => {
  searchService.remove(primKey)
})

// Update the tag cache in SearchService when tags change
async function updateTagCacheAndRebuildIndex() {
  const allTags = await db.tags.toArray()
  searchService.updateTagCache(allTags)
  // Rebuild the entire prompt index because tag names might have changed
  await searchService.buildIndex()
}

db.tags.hook('creating', async () => {
  await updateTagCacheAndRebuildIndex()
})
db.tags.hook('updating', async () => {
  await updateTagCacheAndRebuildIndex()
})
db.tags.hook('deleting', async () => {
  await updateTagCacheAndRebuildIndex()
})

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
      // Manually trigger a search index rebuild as bulkAdd does not trigger hooks.
      await searchService.buildIndex()
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

/**
 * Imports data from a backup file, overwriting existing data.
 * This function is designed to be called from the UI.
 * @param importedData - The parsed data from the backup file.
 */
export async function importDataFromBackup(importedData: any): Promise<void> {
  const currentSettings = await getSettings()

  await db.transaction('rw', db.prompts, db.prompt_versions, db.categories, db.tags, db.settings, async () => {
    await db.prompts.clear()
    await db.prompt_versions.clear()
    await db.categories.clear()
    await db.tags.clear()

    if (importedData.prompts) await db.prompts.bulkPut(importedData.prompts)
    if (importedData.prompt_versions) await db.prompt_versions.bulkPut(importedData.prompt_versions)
    if (importedData.categories) await db.categories.bulkPut(importedData.categories)
    if (importedData.tags) await db.tags.bulkPut(importedData.tags)

    const settingsToApply = importedData.settings || DEFAULT_SETTINGS
    // Preserve current sync settings
    settingsToApply.syncEnabled = currentSettings.syncEnabled
    settingsToApply.syncProvider = currentSettings.syncProvider
    settingsToApply.userProfile = currentSettings.userProfile
    settingsToApply.lastSyncTimestamp = currentSettings.lastSyncTimestamp
    await db.settings.put(settingsToApply)
  })

  // Manually trigger a search index rebuild after import.
  await searchService.buildIndex()
}
