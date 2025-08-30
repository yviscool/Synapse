import type { PromptItem } from '~/types'
import type { StorageAdapter } from './base'

export class LocalStorageAdapter implements StorageAdapter {
  private readonly PREFIX = 'prompt-manager:'

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(this.getKey(key))
      const value = result[this.getKey(key)]
      return value !== undefined ? value : null
    } catch (error) {
      console.error('Failed to get from local storage:', error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.getKey(key)]: value })
    } catch (error) {
      console.error('Failed to set to local storage:', error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(this.getKey(key))
    } catch (error) {
      console.error('Failed to remove from local storage:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys()
      if (keys.length > 0) {
        await chrome.storage.local.remove(keys.map(k => this.getKey(k)))
      }
    } catch (error) {
      console.error('Failed to clear local storage:', error)
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      const result = await chrome.storage.local.get(null)
      return Object.keys(result)
        .filter(key => key.startsWith(this.PREFIX))
        .map(key => key.replace(this.PREFIX, ''))
    } catch (error) {
      console.error('Failed to get keys from local storage:', error)
      return []
    }
  }

  private getKey(key: string): string {
    return `${this.PREFIX}${key}`
  }
}

export class LocalStorage {
  private static instance: LocalStorage
  private readonly STORAGE_KEY = 'prompts'
  private adapter: LocalStorageAdapter

  static getInstance(): LocalStorage {
    if (!LocalStorage.instance) {
      LocalStorage.instance = new LocalStorage()
    }
    return LocalStorage.instance
  }

  constructor() {
    this.adapter = new LocalStorageAdapter()
  }

  async getPrompts(): Promise<PromptItem[]> {
    const prompts = await this.adapter.get<PromptItem[]>(this.STORAGE_KEY)
    return prompts || []
  }

  async savePrompts(prompts: PromptItem[]): Promise<void> {
    await this.adapter.set(this.STORAGE_KEY, prompts)
  }

  async addPrompt(prompt: PromptItem): Promise<void> {
    const prompts = await this.getPrompts()
    prompts.push(prompt)
    await this.savePrompts(prompts)
  }

  async updatePrompt(id: string, updates: Partial<PromptItem>): Promise<void> {
    const prompts = await this.getPrompts()
    const index = prompts.findIndex(p => p.id === id)
    if (index !== -1) {
      prompts[index] = { ...prompts[index], ...updates }
      await this.savePrompts(prompts)
    }
  }

  async deletePrompt(id: string): Promise<void> {
    const prompts = await this.getPrompts()
    const filtered = prompts.filter(p => p.id !== id)
    await this.savePrompts(filtered)
  }

  async clearAll(): Promise<void> {
    await this.adapter.clear()
  }
}