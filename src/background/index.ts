import { db, getSettings } from '@/stores/db'
import { queryPrompts } from '@/stores/promptSearch'
import { repository } from '@/stores/repository'
import { chatRepository } from '@/stores/chatRepository'
import { getOriginalContent, type ChatMessage } from '@/types/chat'
import {
  MSG,
  type RequestMessage,
  type GetPromptsPayload,
  type PromptDTO,
  type DataUpdatedPayload,
  type ChatSavePayload,
  type OpenOptionsPayload,
} from '@/utils/messaging'

// --- Initialize Background ---
console.log('[Background] Script loaded. Setting up repository listeners.')

// 显式打开数据库，确保 schema 升级在消息处理之前完成
db.open().catch(e => console.error('[Background] Failed to open database:', e))

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

// Async message handlers — each returns a result that gets wrapped in { ok: true, ...result }
const asyncHandlers: Partial<Record<string, (data: any, sender: chrome.runtime.MessageSender) => Promise<any>>> = {
  [MSG.GET_PROMPTS]: (d) => handleGetPrompts(d),
  [MSG.GET_CATEGORIES]: () => db.categories.toArray().then(data => ({ data })),
  [MSG.GET_SETTINGS]: () => getSettings().then(data => ({ data })),
  [MSG.OPEN_OPTIONS]: (d) => openOptionsPage(d),
  [MSG.CHAT_SAVE]: (d) => handleChatSave(d),
  [MSG.CHAT_COLLECT_FRAME_SNAPSHOTS]: (_d, sender) => handleCollectFrameSnapshots(sender),
}

chrome.runtime.onMessage.addListener((msg: RequestMessage, sender, sendResponse) => {
  const { type, data } = msg

  // Async handlers: resolve → sendResponse, keep channel open
  const handler = asyncHandlers[type]
  if (handler) {
    handler(data, sender)
      .then(res => sendResponse({ ok: true, ...res }))
      .catch(e => sendResponse({ ok: false, error: e.message }))
    return true
  }

  // Sync / fire-and-forget handlers
  if (type === MSG.DATA_UPDATED) {
    const payload = data as DataUpdatedPayload | undefined
    if (!payload || payload.scope === 'all' || payload.scope === 'categories' || payload.scope === 'tags') {
      promptLookupCache = null
    }
    broadcastToTabs(msg as RequestMessage<DataUpdatedPayload>)
    return false
  }

  if (type === MSG.UPDATE_PROMPT_LAST_USED) {
    const payload = data as { promptId?: string } | undefined
    if (payload?.promptId) {
      db.prompts.update(payload.promptId, { lastUsedAt: Date.now() })
        .catch(e => console.error('Failed to update lastUsedAt:', e))
    }
    return false
  }
})

type FrameSnapshot = {
  url: string
  title: string
  content: string
  html?: string
}

async function handleCollectFrameSnapshots(sender: chrome.runtime.MessageSender): Promise<{ data: FrameSnapshot[] }> {
  const tabId = sender.tab?.id
  if (!tabId) return { data: [] }

  const results = await new Promise<chrome.scripting.InjectionResult<FrameSnapshot | null>[]>((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId, allFrames: true },
        func: () => {
          const host = window.location.hostname
          if (!host.endsWith('.web-sandbox.oaiusercontent.com')) {
            return null
          }

          const selectors = [
            '#extended-response-markdown-content',
            '[data-test-id="message-content"] .markdown-main-panel',
            'main article',
            'article',
            'main',
          ]

          let root: Element | null = null
          for (const selector of selectors) {
            root = document.querySelector(selector)
            if (root) break
          }
          if (!root) root = document.body

          const clone = root.cloneNode(true) as Element
          clone.querySelectorAll('script, style, noscript, template, svg, canvas, button').forEach((el) => el.remove())

          const normalize = (text: string): string => {
            return text
              .replace(/\u200B/g, '')
              .replace(/\u00A0/g, ' ')
              .replace(/\r\n?/g, '\n')
              .replace(/[ \t]+\n/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim()
          }

          const content = normalize(clone.textContent || '').slice(0, 200000)
          if (!content) return null

          let html = String(clone.innerHTML || '').trim()
          if (html.length > 400000) html = html.slice(0, 400000)

          const title = normalize(
            document.querySelector('h1, h2, h3')?.textContent
            || document.title
            || '',
          ).slice(0, 400)

          return {
            url: window.location.href,
            title,
            content,
            html,
          }
        },
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(injectionResults || [])
      },
    )
  })

  const data = results
    .map(item => item.result)
    .filter((item): item is FrameSnapshot => !!item && !!item.content)

  console.debug('[Background] frame snapshots', {
    tabId,
    injectedFrames: results.length,
    capturedFrames: data.length,
  })

  return { data }
}

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

async function openOptionsPage(payload?: OpenOptionsPayload): Promise<void> {
  const view = payload?.view
  const allowedViews = new Set(['prompts', 'chat', 'tools'])
  const path = view && allowedViews.has(view)
    ? `options.html#/${view}`
    : 'options.html'
  await chrome.tabs.create({ url: chrome.runtime.getURL(path) })
}

// --- Chat Collection ---

/** Merge new messages with existing, handling lazy-load partial re-collection */
function mergeMessages(
  existingMessages: ChatMessage[],
  newMessages: ChatMessage[],
): { merged: ChatMessage[]; unchanged: boolean } {
  if (existingMessages.length <= newMessages.length) {
    return { merged: newMessages, unchanged: false }
  }

  const offset = existingMessages.length - newMessages.length
  const existingTail = existingMessages.slice(offset)
  const tailUnchanged = existingTail.every((msg, i) =>
    getOriginalContent(msg).slice(0, 200) === getOriginalContent(newMessages[i]).slice(0, 200),
  )

  if (tailUnchanged) {
    return { merged: existingMessages, unchanged: true }
  }

  return { merged: [...existingMessages.slice(0, offset), ...newMessages], unchanged: false }
}

/** Preserve thinking from existing messages that may be missing in re-collected ones */
function preserveThinking(
  messages: ChatMessage[],
  existingMessages: ChatMessage[],
): ChatMessage[] {
  const thinkingByContent = new Map<string, string>()
  for (const msg of existingMessages) {
    if (msg.role === 'assistant' && msg.thinking) {
      thinkingByContent.set(getOriginalContent(msg).slice(0, 200), msg.thinking)
    }
  }
  if (thinkingByContent.size === 0) return messages

  return messages.map(msg => {
    if (msg.role === 'assistant' && !msg.thinking) {
      const cached = thinkingByContent.get(getOriginalContent(msg).slice(0, 200))
      if (cached) return { ...msg, thinking: cached }
    }
    return msg
  })
}

async function handleChatSave(payload: ChatSavePayload): Promise<{ ok: boolean; error?: string }> {
  const { conversation, tags = [] } = payload

  if (!conversation?.messages?.length) {
    return { ok: false, error: chrome.i18n.getMessage('chatSaveEmpty') }
  }

  if (conversation.externalId && conversation.platform) {
    const existing = await chatRepository.getConversationByExternalId(
      conversation.platform,
      conversation.externalId,
    )
    if (existing) {
      const { merged, unchanged } = mergeMessages(existing.messages, conversation.messages)
      if (unchanged) return { ok: true }

      const finalMessages = preserveThinking(merged, existing.messages)

      const { ok, error } = await chatRepository.updateConversation(existing.id, {
        ...conversation,
        messages: finalMessages,
        messageCount: finalMessages.length,
        updatedAt: Date.now(),
      })
      if (ok) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Synapse',
          message: chrome.i18n.getMessage('chatUpdated'),
        })
      }
      return { ok, error: error?.message }
    }
  }

  const { ok, error } = await chatRepository.saveConversation(conversation, tags)

  if (ok) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: chrome.i18n.getMessage('chatCollected', [String(conversation.messageCount || conversation.messages?.length || 0)]),
    })
  }

  return { ok, error: error?.message }
}

// --- 快捷保存功能 ---

async function saveSelectionAsPrompt(text: string) {
  if (!text?.trim()) return

  const trimmed = text.trim()
  const title = trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : '')
  const { ok, error } = await repository.savePrompt({ title, content: text }, [])

  if (ok) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: chrome.i18n.getMessage('promptSaved'),
    })
  }
  else {
    console.error('Failed to save prompt from selection:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Synapse',
      message: chrome.i18n.getMessage('saveFailed', [(error as Error).message]),
    })
  }
}

// Setup context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-selection-as-prompt',
    title: chrome.i18n.getMessage('contextMenuSaveAsPrompt'),
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
  if (command === 'save_selection' && tab?.id) {
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
