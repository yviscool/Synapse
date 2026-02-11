/**
 * Chat 对话管理模块类型定义
 * 用于采集、保存、预览、管理各 AI 平台的对话记录
 */

/** 支持的 AI 平台 */
export type ChatPlatform =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'kimi'
  | 'doubao'
  | 'yuanbao'
  | 'grok'
  | 'copilot'
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

/** 单条消息 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp?: number
  thinking?: string           // AI 思考过程
  attachments?: ChatAttachment[]
  metadata?: Record<string, any>
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

/** 平台配置 */
export interface PlatformConfig {
  id: ChatPlatform
  name: string
  icon: string
  color: string
  urlPatterns: RegExp[]
}

/** 导出格式 */
export type ExportFormat = 'json' | 'markdown' | 'txt' | 'html'

/** 导出选项 */
export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeTimestamps?: boolean
  includeThinking?: boolean
}
