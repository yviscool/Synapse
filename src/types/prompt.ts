import type { LocalePreference } from "./i18n"

export interface Category {
  id: string
  name: string
  sort?: number
  icon?: string
}

export interface Tag {
  id: string
  name: string
}

/** 版本类型 */
export type VersionType = 'initial' | 'edit' | 'revert'

export interface PromptVersion {
  id: string
  promptId: string
  versionNumber: number        // 递增版本号 (v1, v2, v3...)
  content: string
  title: string                // 该版本的标题
  note?: string
  type: VersionType           // 版本类型
  createdAt: number
}

export interface Prompt {
  id: string
  title: string
  content: string
  categoryIds: string[]
  tagIds: string[]
  favorite?: boolean
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export interface Settings {
  id: 'global'
  hotkeyOpen: string
  enableSlash: boolean
  enableSites: Record<string, boolean>
  panelPos: { x: number; y: number } | null
  theme: 'light' | 'dark' | 'auto'
  outlineEnabled: boolean
  locale: LocalePreference,

  // Cloud Sync Settings
  syncProvider?: 'google-drive' | 'onedrive'
  syncEnabled: boolean
  lastSyncTimestamp?: number
  userProfile?: {
    name: string
    email: string
    picture?: string
  }
}
