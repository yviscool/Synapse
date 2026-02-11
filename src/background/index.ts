import { nanoid } from 'nanoid'
import { db, getSettings, queryPrompts } from '@/stores/db'
import { repository } from '@/stores/repository'
import { chatRepository } from '@/stores/chatRepository'
import {
  MSG,
  type RequestMessage,
  type GetPromptsPayload,
  type PromptDTO,
  type DataUpdatedPayload,
  type ChatSavePayload,
} from '@/utils/messaging'

// --- Initialize Background ---
console.log('[Background] Script loaded. Setting up repository listeners.')

type PromptLookupCache = {
  categoryMap: Map<string, string>
  tagMap: Map<string, string>
}

let promptLookupCache: PromptLookupCache | null = null

async function getPromptLookupCache(forceRefresh = false): Promise<PromptLookupCache> {
  if (promptLookupCache && !forceRefresh) {
    return promptLookupCache
  }

  const [categories, tags] = await Promise.all([
    db.categories.toArray(),
    db.tags.toArray(),
  ])

  promptLookupCache = {
    categoryMap: new Map(categories.map(c => [c.id, c.name])),
    tagMap: new Map(tags.map(t => [t.id, t.name])),
  }

  return promptLookupCache
}

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
    const payload = msg.data as DataUpdatedPayload | undefined
    if (!payload || payload.scope === 'all' || payload.scope === 'categories' || payload.scope === 'tags') {
      promptLookupCache = null
    }
    // This is a generic update message; broadcast to open tabs.
    broadcastToTabs(msg)
    return false // No response needed
  }

  if (type === MSG.UPDATE_PROMPT_LAST_USED) {
    db.prompts.update(data.promptId, { lastUsedAt: Date.now() })
      .catch(e => console.error('Failed to update lastUsedAt:', e))
    return false // No need to wait
  }

  // Chat Collection: Save conversation
  if (type === MSG.CHAT_SAVE) {
    handleChatSave(data as ChatSavePayload)
      .then(res => sendResponse(res))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true
  }
})

async function handleGetPrompts(
  payload?: GetPromptsPayload,
): Promise<{ data: PromptDTO[]; total: number; version: string }> {
  // Map `q` to `searchQuery` and keep category-only filtering behavior when no query is provided.
  const { q, ...restPayload } = payload || {}
  const queryResult = await queryPrompts({
    ...restPayload,
    searchQuery: q,
    category: q ? undefined : restPayload.category,
  })
  const prompts = queryResult.prompts
  const total = queryResult.total

  // Map to DTOs, preserving matches data
  const { categoryMap, tagMap } = await getPromptLookupCache()

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

// --- Chat Collection ---

/**
 * 保存采集的对话
 */
async function handleChatSave(payload: ChatSavePayload): Promise<{ ok: boolean; error?: string }> {
  const { conversation, tags = [] } = payload

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return { ok: false, error: '对话内容为空' }
  }

  // 检查是否已存在相同的对话（通过 externalId）
  if (conversation.externalId && conversation.platform) {
    const existing = await chatRepository.getConversationByExternalId(
      conversation.platform,
      conversation.externalId
    )
    if (existing) {
      // 更新现有对话
      const { ok, error } = await chatRepository.updateConversation(existing.id, {
        ...conversation,
        updatedAt: Date.now(),
      })
      if (ok) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Synapse',
          message: '对话已更新！',
        })
      }
      return { ok, error: error?.message }
    }
  }

  // 创建新对话
  const { ok, error } = await chatRepository.saveConversation(conversation, tags)

  if (ok) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: `已采集 ${conversation.messageCount || conversation.messages?.length || 0} 条消息！`,
    })
  }

  return { ok, error: error?.message }
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
