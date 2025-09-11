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
    // This handler must be async to use `then`
    Promise.resolve(searchService.search(query)).then((results) => {
      // We need to cast because the result from searchService is technically Fuse.FuseResult[]
      // but our PerformSearchResult is designed to be structurally compatible and serializable.
      sendResponse({ ok: true, data: results as PerformSearchResult[] })
    }).catch(error => {
      sendResponse({ ok: false, error: error.message })
    })
    return true // Return true to indicate async response
  }

  // --- Indexing Messages (OBSOLETE) ---
  // These are no longer needed. The repository now notifies the background script
  // directly and safely after a transaction is completed.
})

async function handleGetPrompts(
  payload?: GetPromptsPayload,
): Promise<{ data: PromptDTO[]; total: number; version: string }> {
  // 1. Map `q` to `searchQuery` and then call the unified query logic
  const { q, ...restPayload } = payload || {}
  const { prompts, total } = await queryPrompts({ searchQuery: q, ...restPayload })

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

// --- Quick Save Feature ---

async function saveSelectionAsPrompt(text: string) {
  if (!text || !text.trim())
    return

  const title = text.trim().slice(0, 40) + (text.trim().length > 40 ? '...' : '')

  const { ok, error } = await repository.addPrompt({
    title,
    content: text,
  })

  if (ok) {
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: '提示词已保存！',
    })
    // The repository's `withCommitNotification` already handles broadcasting the DATA_UPDATED message,
    // so we don't need to do it here anymore.
  }
  else {
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