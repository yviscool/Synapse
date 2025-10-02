import { nanoid } from 'nanoid'
import { db, getSettings, queryPrompts } from '@/stores/db'
import { repository } from '@/stores/repository'
import { searchService } from '@/services/SearchService'
import type { Prompt } from '@/types'
import {
  MSG,
  type RequestMessage,
  type ResponseMessage,
  type GetPromptsPayload,
  type PromptDTO,
  type DataUpdatedPayload,
  type PerformSearchPayload,
  type PerformSearchResult,
} from '@/utils/messaging'

// --- Initialize Search Index & Repository Listeners ---
console.log('[Background] Script loaded. Setting up repository listeners.')
searchService.buildIndex().catch(console.error)

/**
 * Handles all data update notifications.
 * This is the single source of truth for reacting to data changes.
 */
// Listener for data changes originating *within* the background script's context
repository.events.on('allChanged', () => {
  // This case happens for minor changes initiated from the background script itself (e.g. future features).
  // It's less critical but good to have. It will fetch from its own DB connection.
  console.log('[Background] Internal data change detected. Rebuilding index from DB.')
  searchService.buildIndex()
})

chrome.runtime.onMessage.addListener((msg: RequestMessage, sender, sendResponse) => {
  const { type, data } = msg

  if (type === MSG.REBUILD_INDEX_WITH_DATA) {
    console.log('[Background] Received data payload to rebuild index.')
    searchService.buildIndex(data)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true // async
  }

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
    // This is a generic update message, we can just broadcast it
    // The specific index rebuild is handled by REBUILD_INDEX_WITH_DATA
    broadcastToTabs(msg)
    return false // No response needed
  }

  if (type === MSG.UPDATE_PROMPT_LAST_USED) {
    db.prompts.update(data.promptId, { lastUsedAt: Date.now() })
      .catch(e => console.error('Failed to update lastUsedAt:', e))
    return false // No need to wait
  }

  if (type === MSG.PERFORM_SEARCH) {
    const { query } = data as PerformSearchPayload
    ;(async () => {
      try {
        const results = await searchService.search(query)
        // We need to cast because the result from searchService is technically Fuse.FuseResult[]
        // but our PerformSearchResult is designed to be structurally compatible and serializable.
        sendResponse({ ok: true, data: results as PerformSearchResult[] })
      }
      catch (error) {
        sendResponse({ ok: false, error: (error as Error).message })
      }
    })()
    return true // Return true to indicate async response
  }

  // --- Indexing Messages (OBSOLETE) ---
  // These are no longer needed. The repository now notifies the background script
  // directly and safely after a transaction is completed.
})

/**
 * A dedicated search function for the background script to avoid re-entrant messaging.
 * It performs a search and then fetches the corresponding data directly from the database.
 */
async function searchPromptsInBackground(query: string) {
  if (!query) {
    return { prompts: [], total: 0 }
  }

  const searchResults = await searchService.search(query)
  if (searchResults.length === 0) {
    return { prompts: [], total: 0 }
  }

  const resultIds = searchResults.map(res => res.item.id)
  const matchesMap = new Map(searchResults.map(res => [res.item.id, res.matches]))

  const promptsFromDb = await db.prompts.where('id').anyOf(resultIds).toArray()

  const promptsMap = new Map(promptsFromDb.map(p => [p.id, p]))

  const filteredPrompts = resultIds
    .map((id) => {
      const prompt = promptsMap.get(id)
      if (!prompt) return null
      return { ...prompt, matches: matchesMap.get(id) }
    })
    .filter(Boolean)

  return { prompts: filteredPrompts, total: filteredPrompts.length }
}


async function handleGetPrompts(
  payload?: GetPromptsPayload,
): Promise<{ data: PromptDTO[]; total: number; version: string }> {
  // 1. Map `q` to `searchQuery` and then call the correct logic
  const { q, ...restPayload } = payload || {}

  let prompts, total
  if (q) {
    // If there is a search query, use the direct background search function
    const searchResult = await searchPromptsInBackground(q)
    prompts = searchResult.prompts
    total = searchResult.total
  } else {
    // Otherwise, use the standard query function (for category filtering, etc.)
    const queryResult = await queryPrompts({ ...restPayload })
    prompts = queryResult.prompts
    total = queryResult.total
  }

  // 2. Map to DTOs, preserving matches data
  const [categories, allTags] = await Promise.all([db.categories.toArray(), db.tags.toArray()])
  const categoryMap = new Map(categories.map(c => [c.id, c.name]))
  const tagMap = new Map(allTags.map(t => [t.id, t.name]))

  const data: PromptDTO[] = prompts.map((p) => {
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      categoryName: p.categoryIds.length > 0 ? categoryMap.get(p.categoryIds[0]) : undefined,
      tags: p.tagIds.map(tid => tagMap.get(tid) || '').filter(Boolean),
      matches: p.matches, // Pass through the matches data
    }
  })

  const latestUpdate = await db.prompts.orderBy('updatedAt').reverse().first()
  const version = latestUpdate?.updatedAt.toString() || Date.now().toString()

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

// --- 快捷保存功能 ---

/**
 * 将选中的文本作为新的提示词保存
 * @param text - 选中的文本内容
 */
async function saveSelectionAsPrompt(text: string) {
  // 如果文本为空或只有空白，则不执行任何操作
  if (!text || !text.trim())
    return

  // 从文本内容生成一个简短的标题
  const title = text.trim().slice(0, 30) + (text.trim().length > 30 ? '...' : '')

  // 调用 repository 中的 savePrompt 方法来保存新的提示词
  // 注意：repository 中并没有 addPrompt 方法，正确的方法是 savePrompt
  // savePrompt 用于创建和更新提示词，当不提供 id 时，它会创建一个新的。
  // 第二个参数是标签名称数组，快捷保存时默认为空。
  const { ok, error } = await repository.savePrompt({
    title,
    content: text,
  }, [])

  if (ok) {
    // 保存成功，创建桌面通知提醒用户
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: '提示词已保存！',
    })
    // repository 的 `withCommitNotification` 包装器会自动处理 DATA_UPDATED 消息的广播
    // 所以这里不再需要手动发送消息。
  }
  else {
    // 保存失败，记录错误并创建通知提醒用户
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