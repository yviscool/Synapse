import { nanoid } from 'nanoid'
import { db, getSettings, queryPrompts } from '@/stores/db'
import type { Prompt } from '@/types'
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

  if (type === MSG.UPDATE_PROMPT_LAST_USED) {
    db.prompts.update(data.promptId, { lastUsedAt: Date.now() })
      .catch(e => console.error('Failed to update lastUsedAt:', e))
    return false // No need to wait
  }
})

async function handleGetPrompts(
  payload?: GetPromptsPayload,
): Promise<{ data: PromptDTO[]; total: number; version: string }> {
  const [categories, allTags] = await Promise.all([db.categories.toArray(), db.tags.toArray()])
  const categoryMap = new Map(categories.map(c => [c.id, c.name]))
  const tagMap = new Map(allTags.map(t => [t.id, t.name]))

  let categoryId: string | undefined
  let isUncategorized = false

  if (payload?.category && payload.category !== '全部') {
    if (payload.category === '未分类') {
      isUncategorized = true
    } else {
      categoryId = categories.find(c => c.name === payload.category)?.id
    }
  }

  // The `queryPrompts` function doesn't support a filter for uncategorized prompts.
  // So we pass the categoryId only if it's not the "uncategorized" case.
  const { prompts, total } = await queryPrompts({
    searchQuery: payload?.q,
    category: isUncategorized ? undefined : categoryId,
    page: payload?.page,
    limit: payload?.limit,
    sortBy: 'updatedAt', // Default sort for content script
  })

  // Post-filter for the "uncategorized" case. This is a workaround.
  const finalPrompts = isUncategorized
    ? prompts.filter(p => p.categoryIds.length === 0)
    : prompts

  const data: PromptDTO[] = finalPrompts.map(p => ({
    id: p.id,
    title: p.title,
    content: p.content,
    categoryName: p.categoryIds.length > 0 ? categoryMap.get(p.categoryIds[0]) || '未分类' : '未分类',
    tags: p.tagIds.map(tid => tagMap.get(tid) || '').filter(Boolean),
  }))

  const latestUpdate = await db.prompts.orderBy('updatedAt').reverse().first()
  const version = latestUpdate?.updatedAt.toString() || Date.now().toString()

  // Note: The `total` count will be inaccurate for the "uncategorized" filter.
  // This is a known limitation of the current implementation.
  return { data, total, version }
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

// --- Quick Save Feature ---

async function saveSelectionAsPrompt(text: string) {
  if (!text || !text.trim())
    return

  try {
    const now = Date.now()
    const title = text.trim().slice(0, 40) + (text.trim().length > 40 ? '...' : '')

    const newPrompt: Prompt = {
      id: nanoid(),
      title,
      content: text,
      categoryIds: [],
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      currentVersionId: null,
    }

    await db.prompts.put(newPrompt)

    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: '提示词已保存！',
    })

    // Notify other parts of the extension to update data
    broadcastToTabs({
      type: MSG.DATA_UPDATED,
      data: { scope: 'prompts', version: Date.now().toString() },
    })
  }
  catch (error) {
    console.error('Failed to save prompt from selection:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: `保存失败: ${(error as Error).message}`,
    })
  }
}

// Setup context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-selection-as-prompt',
    title: '保存为提示词',
    contexts: ['selection'],
  })
})

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'save-selection-as-prompt' && info.selectionText)
    saveSelectionAsPrompt(info.selectionText)
})

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'save_selection' && tab.id) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id, allFrames: true },
        func: () => window.getSelection()?.toString(),
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError)
          return
        }
        for (const frameResult of injectionResults) {
          if (frameResult.result) {
            saveSelectionAsPrompt(frameResult.result)
            break // Save only the first non-empty selection found
          }
        }
      },
    )
  }
})