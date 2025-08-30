import { db, getSettings } from '@/stores/db'
import type { Prompt, Category, Tag } from '@/types'
import {
  MSG,
  type RequestMessage,
  type ResponseMessage,
  type GetPromptsPayload,
  type PromptDTO,
  type DataUpdatedPayload,
} from '@/utils/messaging'

chrome.runtime.onMessage.addListener((msg: RequestMessage, sender, sendResponse) => {
  const { type, data } = msg

  if (type === MSG.GET_PROMPTS) {
    handleGetPrompts(data)
      .then(res => sendResponse({ ok: true, ...res }))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true // Keep the message channel open for async response
  }

  if (type === MSG.GET_CATEGORIES) {
    db.categories.toArray()
      .then(data => sendResponse({ ok: true, data }))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true
  }

  if (type === MSG.GET_SETTINGS) {
    getSettings()
      .then(data => sendResponse({ ok: true, data }))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true
  }

  if (type === MSG.DATA_UPDATED) {
    // Broadcast to all content scripts that data has changed
    broadcastToTabs(msg)
    return false // No response needed
  }
})

async function handleGetPrompts(
  payload?: GetPromptsPayload,
): Promise<{ data: PromptDTO[]; version: string }> {
  const [prompts, categories, tags] = await Promise.all([
    db.prompts.toArray(),
    db.categories.toArray(),
    db.tags.toArray(),
  ])

  const categoryMap = new Map(categories.map(c => [c.id, c.name]))
  const tagMap = new Map(tags.map(t => [t.id, t.name]))

  let filteredPrompts = prompts

  // Filtering logic
  if (payload?.q) {
    const q = payload.q.toLowerCase()
    filteredPrompts = filteredPrompts.filter(p => {
      const tagNames = p.tagIds.map(tid => tagMap.get(tid) || '').join(' ')
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        tagNames.toLowerCase().includes(q)
      )
    })
  }

  if (payload?.category && payload.category !== '全部') {
    const catId = categories.find(c => c.name === payload.category)?.id
    if (catId) {
      filteredPrompts = filteredPrompts.filter(p => p.categoryIds.includes(catId))
    } else if (payload.category === '未分类') {
      filteredPrompts = filteredPrompts.filter(p => p.categoryIds.length === 0)
    }
  }

  // Map to DTO
  const data: PromptDTO[] = filteredPrompts.map(p => ({
    id: p.id,
    title: p.title,
    content: p.content,
    // For simplicity, we assign the first category name. Multi-category can be handled if needed.
    categoryName: p.categoryIds.length > 0 ? categoryMap.get(p.categoryIds[0]) || '未分类' : '未分类',
    tags: p.tagIds.map(tid => tagMap.get(tid) || '').filter(Boolean),
  }))

  const latestUpdate = prompts.reduce((max, p) => Math.max(max, p.updatedAt), 0)
  const version = latestUpdate.toString()

  return { data, version }
}

async function broadcastToTabs(msg: RequestMessage<DataUpdatedPayload>) {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, msg)
      }
      catch (e) {
        // console.warn(`Could not send message to tab ${tab.id}`, e)
      }
    }
  }
}