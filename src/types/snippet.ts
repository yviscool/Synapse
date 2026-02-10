export type SnippetLanguage =
  | 'html'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'rust'
  | 'go'
  | 'css'
  | 'json'
  | 'markdown'
  | 'sql'
  | 'shell'
  | 'yaml'
  | 'text'

export interface SnippetFolder {
  id: string
  name: string
  parentId: string | null  // null = root level
  order: number
  createdAt: number
}

export interface Snippet {
  id: string
  title: string
  content: string
  language: SnippetLanguage
  folderId: string | null  // null = uncategorized
  tagIds: string[]
  starred: boolean
  createdAt: number
  updatedAt: number
  usedAt: number | null  // last used time
  useCount: number
  // auto-parsed dependencies (for HTML external link detection)
  dependencies?: string[]
}

export interface SnippetTag {
  id: string
  name: string
  color?: string
}

export interface SnippetSearchIndex {
  snippetId: string
  tokens: string[]
  titleTokens: string[]
  tagTokens: string[]
  updatedAt: number
}

// Query parameters for snippet search
export interface QuerySnippetsParams {
  searchQuery?: string
  folderId?: string | null  // null = uncategorized, undefined = all
  tagIds?: string[]
  languages?: SnippetLanguage[]
  starredOnly?: boolean
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'usedAt' | 'useCount'
  page?: number
  limit?: number
}

export interface QuerySnippetsResult {
  snippets: Snippet[]
  total: number
}

// Special folder filter types
export type SpecialFolderType = 'all' | 'starred' | 'recent' | 'uncategorized'
