import { StorageManager } from './base'
import { LocalStorageAdapter } from './local'

// 默认使用本地存储，后续可以接入 Supabase / MongoDB
const adapter = new LocalStorageAdapter()
export const storage = new StorageManager(adapter)

// 导出适配器类型，方便后续扩展
export { StorageManager } from './base'
export { LocalStorageAdapter } from './local'
export type { StorageAdapter, StorageConfig } from './base'