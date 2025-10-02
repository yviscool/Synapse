import type { Prompt } from '@/types/prompt'
import { nanoid } from 'nanoid'

/**
 * 创建一个安全的、可序列化的 Prompt 对象
 */
export function createSafePrompt(data: Partial<Prompt>): Prompt {
  const now = Date.now()
  
  return {
    id: data.id || nanoid(),
    title: String(data.title || '').trim(),
    content: String(data.content || '').trim(),
    categoryIds: Array.isArray(data.categoryIds) 
      ? data.categoryIds.filter(id => typeof id === 'string' && id.length > 0)
      : [],
    tagIds: Array.isArray(data.tagIds) 
      ? data.tagIds.filter(id => typeof id === 'string' && id.length > 0)
      : [],
    favorite: Boolean(data.favorite),
    createdAt: Number(data.createdAt) || now,
    updatedAt: Number(data.updatedAt) || now,
    lastUsedAt: Number(data.lastUsedAt) || undefined
  }
}

/**
 * 深拷贝 Prompt 对象，确保数据安全
 */
export function clonePrompt(prompt: Prompt): Prompt {
  return createSafePrompt({
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
    categoryIds: [...prompt.categoryIds],
    tagIds: [...prompt.tagIds],
    favorite: prompt.favorite,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    lastUsedAt: prompt.lastUsedAt
  })
}