import type { Category, Settings } from '@/types'
import type { SearchablePrompt } from '@/services/SearchService'
import type Fuse from 'fuse.js'

export const MSG = {
  // Panel/UI
  OPEN_PANEL: 'APM/OPEN_PANEL',

  // Data Sync
  GET_PROMPTS: 'APM/GET_PROMPTS',
  GET_CATEGORIES: 'APM/GET_CATEGORIES',
  GET_SETTINGS: 'APM/GET_SETTINGS',
  DATA_UPDATED: 'APM/DATA_UPDATED',
  UPDATE_PROMPT_LAST_USED: 'APM/UPDATE_PROMPT_LAST_USED',
  PERFORM_SEARCH: 'APM/PERFORM_SEARCH', // New message type for searching
} as const

export type MessageType = typeof MSG[keyof typeof MSG]

export interface RequestMessage<T = any> {
  type: MessageType
  data?: T
}

export interface ResponseMessage<T = any> {
  ok: boolean
  data?: T
  error?: string
  version?: string
}

// Data Transfer Object for content script prompts, now with optional matches for highlighting
export interface PromptDTO {
  id: string
  title: string
  content: string
  categoryName?: string
  tags: string[]
  matches?: readonly Fuse.FuseResultMatch[]
}

export interface GetPromptsPayload {
  q?: string
  category?: string
  categoryNames?: string[]
  tagNames?: string[]
  page?: number
  limit?: number
}

export interface DataUpdatedPayload {
  scope: 'prompts' | 'categories' | 'tags' | 'settings'
  version: string
}

export interface UpdatePromptLastUsedPayload {
  promptId: string
}

export interface PerformSearchPayload {
  query: string
}

// Define a serializable version of the search result for messaging
export interface PerformSearchResult {
  item: SearchablePrompt
  refIndex: number
  score?: number
  matches?: readonly Fuse.FuseResultMatch[]
}

// A generic message type for use in listeners
export type RuntimeMessage<T = any> = RequestMessage<T>