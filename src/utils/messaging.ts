import type { Category, Settings } from '@/types'
import type { FuseResultMatch } from 'fuse.js'

export const MSG = {
  // Panel/UI
  OPEN_PANEL: 'APM/OPEN_PANEL',

  // Data Sync
  GET_PROMPTS: 'APM/GET_PROMPTS',
  GET_CATEGORIES: 'APM/GET_CATEGORIES',
  GET_SETTINGS: 'APM/GET_SETTINGS',
  DATA_UPDATED: 'APM/DATA_UPDATED',
  UPDATE_PROMPT_LAST_USED: 'APM/UPDATE_PROMPT_LAST_USED',
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
  matches?: readonly FuseResultMatch[]
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

// A generic message type for use in listeners
export type RuntimeMessage<T = any> = RequestMessage<T>
