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
 * 验证 Prompt 对象是否可以安全存储
 */
export function validatePrompt(prompt: any): string | null {
  if (!prompt || typeof prompt !== 'object') {
    return '无效的 Prompt 对象'
  }
  
  if (!prompt.id || typeof prompt.id !== 'string') {
    return 'ID 必须是字符串'
  }
  
  if (!prompt.title || typeof prompt.title !== 'string') {
    return '标题必须是字符串'
  }
  
  if (typeof prompt.content !== 'string') {
    return '内容必须是字符串'
  }
  
  if (!Array.isArray(prompt.categoryIds)) {
    return 'categoryIds 必须是数组'
  }
  
  if (!Array.isArray(prompt.tagIds)) {
    return 'tagIds 必须是数组'
  }
  
  if (typeof prompt.favorite !== 'boolean') {
    return 'favorite 必须是布尔值'
  }
  
  if (typeof prompt.createdAt !== 'number' || isNaN(prompt.createdAt)) {
    return 'createdAt 必须是有效的数字'
  }
  
  if (typeof prompt.updatedAt !== 'number' || isNaN(prompt.updatedAt)) {
    return 'updatedAt 必须是有效的数字'
  }

  if (prompt.lastUsedAt !== undefined && (typeof prompt.lastUsedAt !== 'number' || isNaN(prompt.lastUsedAt))) {
    return 'lastUsedAt 必须是有效的数字或 undefined'
  }
  
  return null // 验证通过
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