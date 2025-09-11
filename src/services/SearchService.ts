import Fuse from 'fuse.js'
import type { Prompt, Tag } from '@/types'
import { db } from '@/stores/db'

export interface SearchablePrompt extends Prompt {
  tagNames?: string[]
}

// --- Module-level state ---
let fuse: Fuse<SearchablePrompt> | null = null
const tagMap = new Map<string, string>()

// --- Private utility functions ---
function getFuseOptions(): Fuse.IFuseOptions<SearchablePrompt> {
  return {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'content', weight: 0.3 },
      { name: 'tagNames', weight: 0.3 },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
    ignoreLocation: true,
  }
}

function convertToSearchable(prompt: Prompt): SearchablePrompt {
  return {
    ...prompt,
    tagNames: prompt.tagIds.map(id => tagMap.get(id)).filter(Boolean) as string[],
  }
}

// --- Public API ---

/**
 * Updates the internal tag cache. Should be called when tags change in the DB.
 * @param allTags - An array of all tags from the database.
 */
function updateTagCache(allTags: Tag[]): void {
  tagMap.clear()
  for (const tag of allTags) {
    tagMap.set(tag.id, tag.name)
  }
}

/**
 * Builds the search index from scratch.
 * If data is provided, it uses that data. Otherwise, it fetches from the DB.
 * @param data - Optional data payload containing prompts and tags.
 */
async function buildIndex(data?: { prompts: Prompt[], tags: Tag[] }): Promise<void> {
  let promptsToBuild: Prompt[] = []
  let tagsToBuild: Tag[] = []

  if (data) {
    console.log('[SearchService] Building index from provided data payload.')
    promptsToBuild = data.prompts
    tagsToBuild = data.tags
  } else {
    console.log('[SearchService] Building index by fetching from DB.')
    const [promptsFromDb, tagsFromDb] = await Promise.all([
      db.prompts.toArray(),
      db.tags.toArray(),
    ])
    promptsToBuild = promptsFromDb
    tagsToBuild = tagsFromDb
  }

  updateTagCache(tagsToBuild)
  const searchablePrompts = promptsToBuild.map(convertToSearchable)
  fuse = new Fuse(searchablePrompts, getFuseOptions())
  console.log(`[SearchService] Index rebuilt with ${promptsToBuild.length} items.`)
}

/**
 * Searches the index for a given query.
 * @param query - The search term.
 */
function search(query: string) {
  if (!fuse) {
    console.warn('Fuse.js index has not been built yet.')
    return []
  }
  return fuse.search(query)
}

/**
 * Adds a new prompt to the index.
 * @param prompt - The prompt to add.
 */
function add(prompt: Prompt) {
  fuse?.add(convertToSearchable(prompt))
}

/**
 * Updates an existing prompt in the index.
 * @param prompt - The updated prompt.
 */
function update(prompt: Prompt) {
  fuse?.remove(doc => doc.id === prompt.id)
  fuse?.add(convertToSearchable(prompt))
}

/**
 * Removes a prompt from the index by its ID.
 * @param promptId - The ID of the prompt to remove.
 */
function remove(promptId: string) {
  fuse?.remove(doc => doc.id === promptId)
}

// The exported singleton object
export const searchService = {
  buildIndex,
  search,
  add,
  update,
  remove,
  updateTagCache,
}
