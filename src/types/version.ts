export interface PromptVersion {
  id: string
  promptId: string
  version: number
  title: string
  content: string
  categoryIds: string[]
  tagIds: string[]
  favorite: boolean
  createdAt: number
  createdBy?: string
  changeNote?: string
  diff?: string
}

export interface VersionHistory {
  promptId: string
  versions: PromptVersion[]
  currentVersion: number
}