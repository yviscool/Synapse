/**
 * Real-time sync engine.
 * - Uses MutationObserver to watch chat DOM changes.
 * - Applies anti-stale logic during SPA conversation switches.
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDebounceFn, useEventListener, useIntervalFn, useTimeoutFn } from '@vueuse/core'
import { collect, canCollect, getCurrentPlatformInfo } from '@/content/collect'
import { getSiteConfig } from '@/content/site-configs'
import { MSG } from '@/utils/messaging'
import { countConversationTurns, type SyncState, type ChatConversation, type ChatMessage } from '@/types/chat'
import { getNavigationApi } from '@/types/navigation'

export interface UseSyncEngineOptions {
  /** Debounce delay for observer-triggered sync */
  debounceDelay?: number
  /** Polling interval for fallback checks */
  checkInterval?: number
  /** Max retry times after sync errors */
  maxRetries?: number
  /** Callback when sync succeeds */
  onSyncSuccess?: (conversation: Partial<ChatConversation>) => void
  /** Callback when sync fails after retries */
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

// Module-level memory shared across panel remounts.
let lastCollectedUrl = ''
let lastCollectedHash = ''
let lastSavedKey = '' // url + ':' + hash
let lastConversationId: string | null = null

function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash &= hash
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

  const syncState = ref<SyncState>({
    enabled: false,
    status: 'idle',
    messageCount: 0,
  })

  let observer: MutationObserver | null = null
  let retryCount = 0
  let lastUrl = window.location.href
  let stopNavigationSuccessListener: (() => void) | null = null
  let unmounted = false
  let retryAutoSync = true

  const observerRetrySelector = ref<string | null>(null)
  const observerRetryAttempts = ref(0)
  const canSync = ref(canCollect())

  const isEnabled = computed(() => syncState.value.enabled)
  const isSyncing = computed(() => syncState.value.status === 'syncing')

  const refreshCanSync = () => {
    canSync.value = canCollect()
  }

  const { start: startStatusReset, stop: stopStatusReset } = useTimeoutFn(
    () => {
      if (syncState.value.status === 'success') {
        syncState.value.status = 'idle'
      }
    },
    2000,
    { immediate: false },
  )

  const retryDelayMs = ref(opts.debounceDelay)
  const { start: startRetryTimeout, stop: stopRetryTimeout } = useTimeoutFn(
    () => {
      if (syncState.value.enabled && !unmounted) {
        void doSync(retryAutoSync)
      }
    },
    retryDelayMs,
    { immediate: false },
  )

  const { start: startNavDelay, stop: stopNavDelay } = useTimeoutFn(
    () => {
      checkUrlChange()
    },
    200,
    { immediate: false },
  )

  const scheduleAutoSync = useDebounceFn(() => {
    if (!syncState.value.enabled || !canSync.value || unmounted) return
    void doSync(true)
  }, opts.debounceDelay)

  const {
    pause: pauseObserverRetryLoop,
    resume: resumeObserverRetryLoop,
  } = useIntervalFn(
    () => {
      const selector = observerRetrySelector.value
      if (!selector) return
      if (unmounted || !syncState.value.enabled) {
        stopObserverRetry()
        return
      }

      observerRetryAttempts.value += 1
      const el = document.querySelector(selector)
      if (el || observerRetryAttempts.value >= 30) {
        stopObserverRetry()
        attachObserver(el || document.body)
      }
    },
    100,
    { immediate: false },
  )

  const {
    pause: pauseCheckLoop,
    resume: resumeCheckLoop,
    isActive: isCheckLoopActive,
  } = useIntervalFn(
    () => {
      if (!syncState.value.enabled || syncState.value.status === 'syncing') return
      refreshCanSync()
      if (!canSync.value) return
      void doSync(true)
    },
    opts.checkInterval,
    { immediate: false },
  )

  const {
    pause: pauseUrlPollLoop,
    resume: resumeUrlPollLoop,
  } = useIntervalFn(
    () => {
      checkUrlChange()
    },
    1000,
    { immediate: false },
  )

  const {
    pause: pauseCanSyncProbe,
    resume: resumeCanSyncProbe,
  } = useIntervalFn(
    () => {
      refreshCanSync()
    },
    1000,
    { immediate: false },
  )

  function hashContent(title: string, messages: ChatMessage[]): string {
    const content = title + '||' + messages
      .map((m) => {
        const text = typeof m.content === 'string'
          ? m.content
          : (m.content.edited || m.content.original || '')
        return `${m.role}:${text.slice(0, 100)}`
      })
      .join('|')
    return hashString(content)
  }

  function attachObserver(target: Node) {
    if (unmounted) return
    observer = new MutationObserver(() => {
      if (!syncState.value.enabled || !canSync.value) return
      scheduleAutoSync()
    })
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  function startObserverRetry(selector: string) {
    observerRetrySelector.value = selector
    observerRetryAttempts.value = 0
    pauseObserverRetryLoop()
    resumeObserverRetryLoop()
  }

  function stopObserverRetry() {
    observerRetrySelector.value = null
    observerRetryAttempts.value = 0
    pauseObserverRetryLoop()
  }

  function startObserver() {
    if (unmounted) return
    stopObserver()
    refreshCanSync()
    if (!canSync.value) return

    const config = getSiteConfig()
    const targetSelector = config?.observeTarget
    if (!targetSelector) return

    const target = document.querySelector(targetSelector)
    if (target) {
      attachObserver(target)
      return
    }

    // DOM may still be switching after SPA navigation.
    startObserverRetry(targetSelector)
  }

  function stopObserver() {
    observer?.disconnect()
    observer = null
    stopObserverRetry()
  }

  async function doSync(isAutoSync = true) {
    if (syncState.value.status === 'syncing') return

    refreshCanSync()
    if (!canSync.value) {
      syncState.value.status = 'idle'
      return
    }

    syncState.value.status = 'syncing'

    try {
      const platformInfo = getCurrentPlatformInfo()
      if (platformInfo.conversationId && platformInfo.conversationId !== lastConversationId) {
        lastConversationId = platformInfo.conversationId
      }

      const result = await collect({ isAutoSync })
      if (!result.success || !result.conversation) {
        throw new Error(result.error || 'collect failed')
      }

      const messages = result.conversation.messages || []
      const currentTitle = result.conversation.title || ''
      const contentHash = hashContent(currentTitle, messages)
      const currentUrl = window.location.href
      const saveKey = `${currentUrl}:${contentHash}`
      const config = getSiteConfig()
      const requireExternalId = Boolean(config?.conversationIdPattern)
      const platform = result.conversation.platform || platformInfo.platform || 'other'

      if (lastCollectedUrl && currentUrl !== lastCollectedUrl) {
        lastCollectedUrl = currentUrl
        lastCollectedHash = contentHash
        // 仅自动同步首轮跳过，避免 SPA 切换瞬间保存到脏快照。
        // 手动采集是用户显式动作，不应要求点击两次。
        if (isAutoSync) {
          syncState.value.status = 'idle'
          return
        }
      }

      if (!lastCollectedUrl) {
        lastCollectedUrl = currentUrl
      }

      if (contentHash === lastCollectedHash && saveKey === lastSavedKey) {
        syncState.value.status = 'idle'
        return
      }

      lastCollectedHash = contentHash

      if (!result.conversation.externalId) {
        if (requireExternalId) {
          lastCollectedHash = ''
          syncState.value.status = 'idle'
          return
        }

        if (!result.conversation.id) {
          result.conversation.id = buildFallbackConversationId(platform, currentUrl)
        }
      }

      const response = await chrome.runtime.sendMessage({
        type: MSG.CHAT_SAVE,
        data: {
          conversation: result.conversation,
          tags: [],
          isAutoSync,
        },
      })

      if (!response?.ok) {
        throw new Error(response?.error || 'save failed')
      }

      lastSavedKey = saveKey
      syncState.value.status = 'success'
      syncState.value.messageCount = typeof response.messageCount === 'number'
        ? response.messageCount
        : countConversationTurns(messages)
      syncState.value.lastSyncAt = Date.now()
      syncState.value.error = undefined
      retryCount = 0
      stopRetryTimeout()
      opts.onSyncSuccess(result.conversation)

      stopStatusReset()
      startStatusReset()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'sync failed'
      syncState.value.status = 'error'
      syncState.value.error = errorMsg
      stopStatusReset()

      retryCount += 1
      if (retryCount < opts.maxRetries && syncState.value.enabled) {
        retryAutoSync = isAutoSync
        retryDelayMs.value = opts.debounceDelay * retryCount
        stopRetryTimeout()
        startRetryTimeout()
      } else {
        stopRetryTimeout()
        opts.onSyncError(errorMsg)
        retryCount = 0
      }
    }
  }

  function reinit() {
    retryCount = 0
    stopRetryTimeout()
    stopStatusReset()
    stopObserver()
    refreshCanSync()
    if (syncState.value.enabled) {
      startObserver()
    }
  }

  function startCheckTimer() {
    if (isCheckLoopActive.value) return
    resumeCheckLoop()
  }

  function stopCheckTimer() {
    pauseCheckLoop()
  }

  function enable() {
    refreshCanSync()
    if (!canSync.value) return

    syncState.value.enabled = true
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: true })
    startObserver()
    startCheckTimer()
    void doSync(true)
  }

  function disable() {
    syncState.value.enabled = false
    chrome.storage?.local?.set({ [STORAGE_KEY_SYNC_ENABLED]: false })
    stopObserver()
    stopCheckTimer()
    stopRetryTimeout()
    stopStatusReset()
    syncState.value.status = 'idle'
  }

  function toggle() {
    if (syncState.value.enabled) {
      disable()
    } else {
      enable()
    }
  }

  async function manualSync() {
    await doSync(false)
  }

  function checkUrlChange() {
    if (unmounted) return
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      reinit()
    }
  }

  onMounted(() => {
    refreshCanSync()
    resumeCanSyncProbe()

    if ('navigation' in window) {
      const navigation = getNavigationApi()
      if (navigation) {
        stopNavigationSuccessListener = useEventListener(navigation, 'navigatesuccess', () => {
          stopNavDelay()
          startNavDelay()
        })
      } else {
        resumeUrlPollLoop()
      }
    } else {
      resumeUrlPollLoop()
    }
  })

  onUnmounted(() => {
    unmounted = true
    stopObserver()
    stopCheckTimer()
    stopNavDelay()
    stopRetryTimeout()
    stopStatusReset()
    pauseCanSyncProbe()
    pauseUrlPollLoop()
    stopNavigationSuccessListener?.()
    stopNavigationSuccessListener = null
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
