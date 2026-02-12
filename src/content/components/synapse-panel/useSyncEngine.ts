/**
 * 实时同步引擎
 * 基于 MutationObserver 监听 DOM 变化，自动采集对话内容
 */

import { ref, computed, onUnmounted } from 'vue'
import { collect, getAdapter, canCollect } from '@/collect'
import { MSG } from '@/utils/messaging'
import type { SyncState, ChatConversation, ChatMessage } from '@/types/chat'

export interface UseSyncEngineOptions {
  /** 防抖延迟 (ms) */
  debounceDelay?: number
  /** 检查间隔 (ms) */
  checkInterval?: number
  /** 最大重试次数 */
  maxRetries?: number
  /** 同步成功回调 */
  onSyncSuccess?: (conversation: Partial<ChatConversation>) => void
  /** 同步失败回调 */
  onSyncError?: (error: string) => void
}

const DEFAULT_OPTIONS: Required<UseSyncEngineOptions> = {
  debounceDelay: 1000,
  checkInterval: 3000,
  maxRetries: 3,
  onSyncSuccess: () => {},
  onSyncError: () => {},
}

export const STORAGE_KEY_SYNC_ENABLED = 'synapse-realtime-sync-enabled'

export function useSyncEngine(options: UseSyncEngineOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 状态
  const syncState = ref<SyncState>({
    enabled: false,
    status: 'idle',
    messageCount: 0,
  })

  // 内部状态
  let observer: MutationObserver | null = null
  let debounceTimer: number | null = null
  let checkTimer: number | null = null
  let statusResetTimer: number | null = null
  let retryTimer: number | null = null
  let lastMessagesHash = ''
  let retryCount = 0

  // 计算属性
  const isEnabled = computed(() => syncState.value.enabled)
  const isSyncing = computed(() => syncState.value.status === 'syncing')
  const canSync = computed(() => canCollect())

  /**
   * 生成消息内容的简单哈希，用于检测变化
   */
  function hashMessages(messages: ChatMessage[]): string {
    const content = messages
      .map((m) => {
        const text = typeof m.content === 'string'
          ? m.content
          : (m.content.edited || m.content.original || '')
        return `${m.role}:${text.slice(0, 100)}`
      })
      .join('|')
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 执行同步
   */
  async function doSync() {
    if (syncState.value.status === 'syncing') return

    syncState.value.status = 'syncing'

    try {
      const result = collect()

      if (!result.success || !result.conversation) {
        throw new Error(result.error || '采集失败')
      }

      const messages = result.conversation.messages || []
      const newHash = hashMessages(messages)

      // 检查是否有实际变化
      if (newHash === lastMessagesHash) {
        syncState.value.status = 'idle'
        return
      }

      lastMessagesHash = newHash

      // 发送到 background 保存
      const response = await chrome.runtime.sendMessage({
        type: MSG.CHAT_SAVE,
        data: {
          conversation: result.conversation,
          tags: [],
          isAutoSync: true,
        },
      })

      if (response?.ok) {
        syncState.value.status = 'success'
        syncState.value.messageCount = messages.length
        syncState.value.lastSyncAt = Date.now()
        syncState.value.error = undefined
        retryCount = 0
        opts.onSyncSuccess(result.conversation)

        // 短暂显示成功状态后恢复
        if (statusResetTimer) {
          clearTimeout(statusResetTimer)
        }
        statusResetTimer = window.setTimeout(() => {
          statusResetTimer = null
          if (syncState.value.status === 'success') {
            syncState.value.status = 'idle'
          }
        }, 2000)
      } else {
        throw new Error(response?.error || '保存失败')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '同步失败'
      syncState.value.status = 'error'
      syncState.value.error = errorMsg

      retryCount++
      if (retryCount < opts.maxRetries) {
        // 自动重试
        if (retryTimer) {
          clearTimeout(retryTimer)
        }
        retryTimer = window.setTimeout(() => {
          retryTimer = null
          if (syncState.value.enabled) {
            void doSync()
          }
        }, opts.debounceDelay * retryCount)
      } else {
        opts.onSyncError(errorMsg)
        retryCount = 0
      }
    }
  }

  /**
   * 防抖同步
   */
  function debouncedSync() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(doSync, opts.debounceDelay)
  }

  /**
   * 检查是否为消息相关的 DOM 变化
   */
  function isMessageRelatedMutation(mutation: MutationRecord): boolean {
    const adapter = getAdapter()
    if (!adapter) return false

    // 检查新增节点
    const addedNodes = Array.from(mutation.addedNodes)
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        // 检查是否包含消息相关的属性或类名
        if (
          el.hasAttribute?.('data-message-author-role') ||
          el.querySelector?.('[data-message-author-role]') ||
          el.classList?.contains('message') ||
          el.classList?.contains('conversation-turn')
        ) {
          return true
        }
      }
    }

    // 检查文本内容变化（可能是流式输出）
    if (mutation.type === 'characterData') {
      let target = mutation.target as Node
      while (target && target !== document.body) {
        if (target.nodeType === Node.ELEMENT_NODE) {
          const el = target as Element
          if (
            el.hasAttribute?.('data-message-author-role') ||
            el.closest?.('[data-message-author-role]')
          ) {
            return true
          }
        }
        target = target.parentNode as Node
      }
    }

    return false
  }

  /**
   * 启动 MutationObserver
   */
  function startObserver() {
    if (observer) return

    observer = new MutationObserver((mutations) => {
      if (!syncState.value.enabled) return

      const hasRelevantChanges = mutations.some(isMessageRelatedMutation)
      if (hasRelevantChanges) {
        debouncedSync()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  /**
   * 停止 MutationObserver
   */
  function stopObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (statusResetTimer) {
      clearTimeout(statusResetTimer)
      statusResetTimer = null
    }
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  /**
   * 启动定时检查
   */
  function startCheckTimer() {
    if (checkTimer) return

    checkTimer = window.setInterval(() => {
      if (syncState.value.enabled && syncState.value.status !== 'syncing') {
        doSync()
      }
    }, opts.checkInterval)
  }

  /**
   * 停止定时检查
   */
  function stopCheckTimer() {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  /**
   * 启用实时同步
   */
  function enable() {
    if (!canSync.value) return

    syncState.value.enabled = true
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: true })
    startObserver()
    startCheckTimer()

    // 立即执行一次同步
    doSync()
  }

  /**
   * 禁用实时同步
   */
  function disable() {
    syncState.value.enabled = false
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: false })
    stopObserver()
    stopCheckTimer()
  }

  /**
   * 切换同步状态
   */
  function toggle() {
    if (syncState.value.enabled) {
      disable()
    } else {
      enable()
    }
  }

  /**
   * 手动触发同步
   */
  async function manualSync() {
    await doSync()
  }

  // 清理
  onUnmounted(() => {
    stopObserver()
    stopCheckTimer()
  })

  return {
    // 状态
    syncState,
    isEnabled,
    isSyncing,
    canSync,

    // 方法
    enable,
    disable,
    toggle,
    manualSync,
  }
}

export type SyncEngineInstance = ReturnType<typeof useSyncEngine>
