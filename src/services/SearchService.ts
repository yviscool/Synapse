import Fuse from 'fuse.js'
import type { Prompt } from '@/types'
import { db } from '@/stores/db'

// Define the structure of the item that Fuse.js will index.
// We add tagNames to make them searchable.
export interface SearchablePrompt extends Prompt {
  tagNames?: string[]
}

class SearchService {
  private static instance: SearchService
  private fuse: Fuse<SearchablePrompt> | null = null

  private constructor() {
    // Private constructor to prevent direct instantiation.
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService()
    }
    return SearchService.instance
  }

  // Define Fuse.js options
  private getFuseOptions(): Fuse.I FuseOptions<SearchablePrompt> {
    return {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tagNames', weight: 0.3 },
      ],
      includeScore: true, // Include relevance score
      includeMatches: true, // Include matched indices for highlighting
      threshold: 0.4, // Tune the strictness of the search
      minMatchCharLength: 2,
      ignoreLocation: true,
    }
  }

  /**
   * Builds the search index from a list of prompts.
   * This should be called once when the application starts.
   */
  public async buildIndex(): Promise<void> {
    const prompts = await db.prompts.toArray()
    const tags = await db.tags.toArray()
    const tagMap = new Map(tags.map(t => [t.id, t.name]))

    const searchablePrompts: SearchablePrompt[] = prompts.map(p => ({
      ...p,
      tagNames: p.tagIds.map(id => tagMap.get(id)).filter(Boolean) as string[],
    }))

    this.fuse = new Fuse(searchablePrompts, this.getFuseOptions())
    console.log('Fuse.js index built successfully.')
  }

  /**
   * Searches the index for a given query.
   * @param query - The search term.
   * @returns An array of search results from Fuse.js.
   */
  public search(query: string) {
    if (!this.fuse) {
      console.warn('Fuse.js index has not been built yet.')
      return []
    }
    return this.fuse.search(query)
  }

  /**
   * Adds a new prompt to the index.
   * @param prompt - The prompt to add.
   */
  public add(prompt: SearchablePrompt) {
    this.fuse?.add(prompt)
  }

  /**
   * Updates an existing prompt in the index.
   * This is done by removing the old one and adding the new one.
   * @param prompt - The updated prompt.
   */
  public update(prompt: SearchablePrompt) {
    // Fuse.js doesn't have a direct update, so we remove and re-add.
    this.fuse?.remove(doc => doc.id === prompt.id)
    this.fuse?.add(prompt)
  }

  /**
   * Removes a prompt from the index by its ID.
   * @param promptId - The ID of the prompt to remove.
   */
  public remove(promptId: string) {
    this.fuse?.remove(doc => doc.id === promptId)
  }
}

export const searchService = SearchService.getInstance()
