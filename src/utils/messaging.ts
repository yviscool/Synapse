import type { Category, Settings } from '@/types'
import type { FuseResultMatch } from 'fuse.js'
import type { ChatConversation, ChatPlatform } from '@/types/chat'

export const MSG = {
  // Panel/UI
  OPEN_PANEL: 'APM/OPEN_PANEL',

  // Data Sync
  GET_PROMPTS: 'APM/GET_PROMPTS',
  GET_CATEGORIES: 'APM/GET_CATEGORIES',
  GET_SETTINGS: 'APM/GET_SETTINGS',
  DATA_UPDATED: 'APM/DATA_UPDATED',
  UPDATE_PROMPT_LAST_USED: 'APM/UPDATE_PROMPT_LAST_USED',

  // Chat Collection
  CHAT_COLLECT: 'APM/CHAT_COLLECT',
  CHAT_CAN_COLLECT: 'APM/CHAT_CAN_COLLECT',
  CHAT_SAVE: 'APM/CHAT_SAVE',
  CHAT_GET_PLATFORM_INFO: 'APM/CHAT_GET_PLATFORM_INFO',
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

// Chat Collection Payloads
export interface ChatCollectResult {
  success: boolean
  conversation?: Partial<ChatConversation>
  error?: string
}

export interface ChatPlatformInfo {
  platform: ChatPlatform | null
  canCollect: boolean
  conversationId: string | null
}

export interface ChatSavePayload {
  conversation: Partial<ChatConversation>
  tags?: string[]
}

// A generic message type for use in listeners
export type RuntimeMessage<T = any> = RequestMessage<T>
