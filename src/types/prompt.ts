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

export interface PromptVersion {
  id: string
  promptId: string
  content: string
  note?: string
  parentVersionId?: string | null
  createdAt: number
}

export interface Prompt {
  id: string
  title: string
  content: string
  categoryIds: string[]
  tagIds: string[]
  currentVersionId?: string
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
}