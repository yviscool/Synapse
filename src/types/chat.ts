/**
 * Chat 对话管理模块类型定义
 * 用于采集、保存、预览、管理各 AI 平台的对话记录
 */

/** 支持的 AI 平台 */
export type ChatPlatform =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'aistudio'
  | 'inception'
  | 'deepseek'
  | 'kimi'
  | 'doubao'
  | 'qianwen'
  | 'yuanbao'
  | 'grok'
  | 'copilot'
  | 'minimax'
  | 'zai'
  | 'other'

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system'

/** 附件类型 */
export interface ChatAttachment {
  id: string
  type: 'image' | 'file' | 'code'
  name?: string
  url?: string
  mimeType?: string
  content?: string  // base64 或文本内容
  size?: number
}

/** 内容格式 */
export type ContentFormat = 'html' | 'markdown' | 'text'

/** 消息内容结构 - 支持编辑回溯 */
export interface MessageContent {
  original: string            // 原始采集内容
  rendered?: string           // 渲染后的 HTML (用于展示)
  edited?: string             // 用户编辑后的内容
  format: ContentFormat       // 内容格式
}

/** 单条消息 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string | MessageContent  // 兼容旧格式，新格式使用 MessageContent
  timestamp?: number
  thinking?: string           // AI 思考过程
  attachments?: ChatAttachment[]
  metadata?: Record<string, unknown>

  // 编辑状态
  isEdited?: boolean          // 是否被编辑过
  isDeleted?: boolean         // 软删除标记
  editedAt?: number           // 编辑时间
}

/** 获取消息的显示内容 */
export function getMessageContent(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content
  }
  return message.content.edited || message.content.original
}

/** 获取消息的原始内容 */
export function getOriginalContent(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content
  }
  return message.content.original
}

/** 对话记录 */
export interface ChatConversation {
  id: string
  platform: ChatPlatform
  externalId?: string         // 平台原始对话 ID
  title: string
  link?: string               // 原始页面链接
  messages: ChatMessage[]
  starred: boolean
  tagIds: string[]
  note?: string               // 用户备注
  createdAt: number
  updatedAt: number
  collectedAt?: number        // 采集时间
  messageCount: number

  // 同步状态
  syncEnabled?: boolean       // 是否启用实时同步
  lastSyncAt?: number         // 最后同步时间
  syncStatus?: 'idle' | 'syncing' | 'error'  // 同步状态
}

/** 对话标签 */
export interface ChatTag {
  id: string
  name: string
  color?: string
}

/** 对话搜索索引 */
export interface ChatSearchIndex {
  conversationId: string
  tokens: string[]
  titleTokens: string[]
  tagTokens: string[]
  updatedAt: number
}

/** 消息级搜索索引 */
export interface ChatMessageSearchIndex {
  id: string
  conversationId: string
  platform: ChatPlatform
  role: MessageRole
  messageIndex: number
  messageId?: string
  title: string
  content: string
  normalizedTitle: string
  normalizedContent: string
  tokens: string[]
  tagIds: string[]
  starred: boolean
  createdAt: number
  updatedAt: number
  collectedAt: number
  tokenizerVersion?: number
}

/** 查询参数 */
export interface QueryChatsParams {
  searchQuery?: string
  platforms?: ChatPlatform[]
  tagIds?: string[]
  starredOnly?: boolean
  dateRange?: {
    start?: number
    end?: number
  }
  sortBy?: 'updatedAt' | 'createdAt' | 'collectedAt' | 'title' | 'messageCount'
  page?: number
  limit?: number
}

/** 查询结果 */
export interface QueryChatsResult {
  conversations: ChatConversation[]
  total: number
}

/** 消息级搜索参数 */
export interface QueryChatMessageHitsParams {
  searchQuery: string
  platforms?: ChatPlatform[]
  tagIds?: string[]
  starredOnly?: boolean
  dateRange?: {
    start?: number
    end?: number
  }
  page?: number
  limit?: number
}

/** 消息级命中项 */
export interface ChatMessageHit {
  id: string
  conversationId: string
  platform: ChatPlatform
  role: MessageRole
  messageIndex: number
  title: string
  content: string
  tagIds: string[]
  starred: boolean
  createdAt: number
  updatedAt: number
  collectedAt: number
  score: number
}

/** 消息级搜索结果 */
export interface QueryChatMessageHitsResult {
  hits: ChatMessageHit[]
  total: number
}

/** 平台配置 */
export interface PlatformConfig {
  id: ChatPlatform
  name: string
  icon: string
  iconUrl?: string
  color: string
  urlPatterns: RegExp[]
}

/** 导出格式 */
export type ExportFormat = 'json' | 'markdown' | 'txt' | 'html' | 'pdf'

/** 导出选项 */
export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeTimestamps?: boolean
  includeThinking?: boolean
}

// ============================================
// 统一面板相关类型
// ============================================

/** 同步状态 */
export interface SyncState {
  enabled: boolean            // 是否启用实时同步
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncAt?: number         // 最后同步时间
  messageCount: number        // 已采集消息数
  error?: string              // 错误信息
}
