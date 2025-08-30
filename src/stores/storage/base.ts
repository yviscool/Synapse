/**
 * 存储层基础接口定义
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

/**
 * 存储配置
 */
export interface StorageConfig {
  type: 'local' | 'supabase' | 'mongodb'
  options?: Record<string, any>
}

/**
 * 存储管理器
 */
export class StorageManager {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.adapter.set(key, value)
  }

  async remove(key: string): Promise<void> {
    return this.adapter.remove(key)
  }

  async clear(): Promise<void> {
    return this.adapter.clear()
  }

  async keys(): Promise<string[]> {
    return this.adapter.keys()
  }
}