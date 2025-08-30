// 重新导出所有类型
export * from './prompt'
export * from './chrome.d'

// 扩展现有的 PromptItem 类型以兼容现有代码
export interface PromptItem {
  id: string
  title: string
  content: string
  category?: string
  tags?: string[]
  favorite?: boolean
  useCount?: number
  createdAt: Date
  updatedAt: Date
}

// 存储配置类型
export interface StorageConfig {
  type: 'local' | 'supabase' | 'mongodb'
  options?: {
    supabase?: {
      url: string
      key: string
    }
    mongodb?: {
      connectionString: string
      database: string
    }
  }
}

// 应用设置类型
export interface AppSettings {
  storage: StorageConfig
  shortcuts: {
    openPanel: string
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    panelPosition: { x: number; y: number } | null
  }
  features: {
    enableSlash: boolean
    enableOutline: boolean
    enableCapture: boolean
  }
}