/**
 * 实时同步引擎
 * 基于 MutationObserver 监听 DOM 变化，自动采集对话内容
 *
 * 对话切换防腐策略（自包含在 doSync 内部，不依赖任何外部时序）：
 * 1. URL 变化时，无条件跳过首次采集，将当前内容指纹记为"脏基线"
 * 2. 后续采集中，只有内容指纹与脏基线不同（DOM 真正更新）才允许保存
 * 3. Observer / checkTimer 会自然重试，直到 DOM 刷新为新对话内容
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collect, canCollect, getCurrentPlatformInfo } from '@/content/collect'
import { getSiteConfig } from '@/content/site-configs'
import { MSG } from '@/utils/messaging'
import type { SyncState, ChatConversation, ChatMessage } from '@/types/chat'

type NavigationApi = {
  addEventListener: (type: 'navigatesuccess', listener: () => void) => void
  removeEventListener: (type: 'navigatesuccess', listener: () => void) => void
}

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
  checkInterval: 5000,
  maxRetries: 3,
  onSyncSuccess: () => {},
  onSyncError: () => {},
}

export const STORAGE_KEY_SYNC_ENABLED = 'synapse-realtime-sync-enabled'

// ── 模块级状态：跨组件重建存活 ──
// SynapsePanel 使用 :key="url"，每次导航都会销毁重建，
// 组件内部状态全部丢失。这些变量必须在模块作用域才能跨重建保持记忆。
let lastCollectedUrl = ''
let lastCollectedHash = ''
let lastSavedKey = ''  // url + ':' + hash，已成功保存的内容标识，用于去重
let lastConversationId: string | null = null

function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function buildFallbackConversationId(platform: string, url: string): string {
  const u = new URL(url)
  const normalized = `${u.origin}${u.pathname}`.toLowerCase()
  return `auto:${platform}:${hashString(normalized)}`
}

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
  let urlPollTimer: number | null = null
  let navDelayTimer: number | null = null
  let retryCount = 0
  let lastUrl = window.location.href
  let navigationSuccessHandler: (() => void) | null = null
  let unmounted = false

  // 计算属性
  const isEnabled = computed(() => syncState.value.enabled)
  const isSyncing = computed(() => syncState.value.status === 'syncing')
  const canSync = computed(() => canCollect())

  /**
   * 生成内容指纹（标题 + 消息），用于检测变化
   * 标题纳入哈希，确保标题更新也能触发重新同步
   */
  function hashContent(title: string, messages: ChatMessage[]): string {
    const content = title + '||' + messages
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
      // 检测对话 ID 变化，强制全量同步
      const platformInfo = getCurrentPlatformInfo()
      if (platformInfo.conversationId && platformInfo.conversationId !== lastConversationId) {
        lastConversationId = platformInfo.conversationId
      }

      const result = await collect({ isAutoSync: true })

      if (!result.success || !result.conversation) {
        throw new Error(result.error || '采集失败')
      }

      const messages = result.conversation.messages || []
      const currentTitle = result.conversation.title || ''
      const contentHash = hashContent(currentTitle, messages)
      const currentUrl = window.location.href
      const saveKey = currentUrl + ':' + contentHash
      const config = getSiteConfig()
      const requireExternalId = Boolean(config?.conversationIdPattern)
      const platform = result.conversation.platform || platformInfo.platform || 'other'

      console.log(`[SyncEngine] doSync: ${messages.length} msgs, hash=${contentHash}, lastHash=${lastCollectedHash}, lastSaved=${lastSavedKey.slice(-12)}`)

      // ── 防腐 + 去重，两层检查 ──

      if (lastCollectedUrl && currentUrl !== lastCollectedUrl) {
        // URL 刚变化：记录脏基线，跳过本次
        // SPA 切换瞬间 DOM 大概率还是旧内容
        lastCollectedUrl = currentUrl
        lastCollectedHash = contentHash
        console.log('[SyncEngine] skip: URL changed (dirty baseline)')
        syncState.value.status = 'idle'
        return
      }

      if (!lastCollectedUrl) {
        lastCollectedUrl = currentUrl
      }

      if (contentHash === lastCollectedHash) {
        // 内容与脏基线相同 → 可能 DOM 还没更新（Gemini），也可能本来就是正确内容（DeepSeek）
        // 用 lastSavedKey 判断：如果这个 URL+内容 已经保存过就跳过，否则放行
        if (saveKey === lastSavedKey) {
          console.log('[SyncEngine] skip: same content already saved')
          syncState.value.status = 'idle'
          return
        }
        // 未保存过 → 放行（DeepSeek：DOM 更新快，脏基线就是正确内容）
      }

      // 内容已变化 或 未保存过 → 更新快照
      lastCollectedHash = contentHash

      // 仅对“本应从 URL 提取 externalId”的平台做强校验。
      // 对无 conversationIdPattern 的平台，使用 URL 派生稳定 id，避免静默跳过与重复新建。
      if (!result.conversation.externalId) {
        if (requireExternalId) {
          lastCollectedHash = '' // 回退，URL 稳定后仍能触发保存
          console.log('[SyncEngine] skip: missing externalId on id-required site')
          syncState.value.status = 'idle'
          return
        }

        if (!result.conversation.id) {
          result.conversation.id = buildFallbackConversationId(platform, currentUrl)
        }
      }

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
        lastSavedKey = saveKey
        syncState.value.status = 'success'
        syncState.value.messageCount = Math.ceil(messages.length / 2)
        syncState.value.lastSyncAt = Date.now()
        syncState.value.error = undefined
        retryCount = 0
        console.log(`[SyncEngine] saved: ${messages.length} msgs`)
        opts.onSyncSuccess(result.conversation)

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
      console.error(`[SyncEngine] error:`, errorMsg)
      syncState.value.status = 'error'
      syncState.value.error = errorMsg

      retryCount++
      if (retryCount < opts.maxRetries) {
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

  function debouncedSync() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(doSync, opts.debounceDelay)
  }

  /**
   * 启动 MutationObserver
   * 带重试查找 observeTarget，避免 SPA 切换后 fallback 到 document.body
   */
  function startObserver() {
    stopObserver()

    const config = getSiteConfig()
    const targetSelector = config?.observeTarget

    const attachObserver = (target: Node) => {
      observer = new MutationObserver(() => {
        if (!syncState.value.enabled) return
        debouncedSync()
      })
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    if (!targetSelector) {
      attachObserver(document.body)
      return
    }

    const target = document.querySelector(targetSelector)
    if (target) {
      attachObserver(target)
      return
    }

    // 目标元素未就绪，重试查找（SPA 切换后 DOM 可能还没渲染）
    let attempts = 0
    const retryInterval = window.setInterval(() => {
      attempts++
      const el = document.querySelector(targetSelector)
      if (el || attempts >= 30) {
        clearInterval(retryInterval)
        attachObserver(el || document.body)
      }
    }, 100)
  }

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
   * 对话切换：重挂 Observer
   * 防腐逻辑完全由 doSync 内部处理
   */
  function reinit() {
    retryCount = 0

    // 重挂 Observer 到新的 DOM 节点
    stopObserver()
    if (syncState.value.enabled) {
      startObserver()
    }
  }

  function startCheckTimer() {
    if (checkTimer) return
    checkTimer = window.setInterval(() => {
      if (syncState.value.enabled && syncState.value.status !== 'syncing') {
        doSync()
      }
    }, opts.checkInterval)
  }

  function stopCheckTimer() {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  function enable() {
    if (!canSync.value) return
    syncState.value.enabled = true
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: true })
    startObserver()
    startCheckTimer()
    doSync()
  }

  function disable() {
    syncState.value.enabled = false
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: false })
    stopObserver()
    stopCheckTimer()
  }

  function toggle() {
    if (syncState.value.enabled) {
      disable()
    } else {
      enable()
    }
  }

  async function manualSync() {
    await doSync()
  }

  function checkUrlChange() {
    if (unmounted) return
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      console.log('[SyncEngine] URL changed, reinitializing...')
      lastUrl = currentUrl
      reinit()
    }
  }

  // 生命周期：启动对话切换检测
  onMounted(() => {
    if ('navigation' in window) {
      const navigation = (window as Window & { navigation?: NavigationApi }).navigation
      if (navigation) {
        navigationSuccessHandler = () => {
          if (navDelayTimer) clearTimeout(navDelayTimer)
          navDelayTimer = window.setTimeout(() => {
            navDelayTimer = null
            checkUrlChange()
          }, 200)
        }
        navigation.addEventListener('navigatesuccess', navigationSuccessHandler)
      }
    } else {
      urlPollTimer = window.setInterval(checkUrlChange, 1000)
    }
  })

  onUnmounted(() => {
    unmounted = true
    stopObserver()
    stopCheckTimer()

    if (navDelayTimer) {
      clearTimeout(navDelayTimer)
      navDelayTimer = null
    }

    const navigation = (window as Window & { navigation?: NavigationApi }).navigation
    if (navigation && navigationSuccessHandler) {
      navigation.removeEventListener('navigatesuccess', navigationSuccessHandler)
      navigationSuccessHandler = null
    }

    if (urlPollTimer) {
      clearInterval(urlPollTimer)
      urlPollTimer = null
    }
  })

  return {
    syncState,
    isEnabled,
    isSyncing,
    canSync,
    enable,
    disable,
    toggle,
    manualSync,
  }
}

export type SyncEngineInstance = ReturnType<typeof useSyncEngine>
