<template>
  <div class="w-[320px] flex flex-col overflow-hidden rounded-lg bg-white font-sans text-gray-800 shadow-2xl dark:bg-gray-900 dark:text-gray-200">
    <!-- Header: Brand -->
    <div class="flex items-center justify-center py-5">
      <h1
        class="text-xl font-bold bg-clip-text text-transparent relative inline-block"
        style="background-image: linear-gradient(135deg, #00d5ff 0%, #00a6ff 12%, #0066ff 24%, #3b3bff 34%, #6a00ff 46%, #8b00ff 56%, #ff00b8 66%, #ff1744 76%, #ff7a00 88%, #ffc107 100%);"
      >
        Synapse
        <span class="pointer-events-none absolute rounded-full bg-white" style="width: 0.6rem; height: 0.6rem; top: -0.3rem; left: -0.3rem; box-shadow: 0 0 10px rgba(255,255,255,0.9);"></span>
        <span class="pointer-events-none absolute rounded-full bg-white" style="width: 0.6rem; height: 0.6rem; bottom: -0.3rem; right: -0.3rem; box-shadow: 0 0 10px rgba(255,255,255,0.9);"></span>
        <span class="pointer-events-none absolute" style="left: -0.5rem; bottom: -0.2rem">
          <span class="absolute rounded-full" style="width: 0.35rem; height: 0.35rem; left: -0.15rem; bottom: 0; background-color: #5b21b6; opacity: 0.95;"></span>
          <span class="absolute rounded-full" style="width: 0.25rem; height: 0.25rem; left: -0.45rem; bottom: 0.3rem; background-color: #7c3aed; opacity: 0.85;"></span>
          <span class="absolute rounded-full" style="width: 0.18rem; height: 0.18rem; left: -0.65rem; bottom: 0.65rem; background-color: #a78bfa; opacity: 0.8;"></span>
        </span>
      </h1>
    </div>

    <div class="h-px bg-gray-200 dark:bg-gray-700/50"></div>

    <!-- Activity Feed -->
    <div class="flex flex-col px-3 py-3">
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {{ t('popup.recentActivity') }}
      </h2>
      <div v-if="activities.length" class="flex flex-col gap-1">
        <button
          v-for="(item, i) in activities"
          :key="item.id"
          class="activity-item flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          :style="{ '--stagger': `${i * 40}ms` }"
          @click="openRoute(item.route)"
        >
          <div class="mt-0.5 text-sm" :class="item.iconClass">{{ item.icon }}</div>
          <div class="flex-1 overflow-hidden">
            <div class="truncate text-sm">{{ item.label }}</div>
            <div class="truncate text-xs text-gray-400 dark:text-gray-500">
              {{ item.sub }}
            </div>
          </div>
        </button>
      </div>
      <div v-else class="flex flex-col items-center py-6 text-center text-gray-400">
        <div class="i-carbon-activity text-2xl mb-2 opacity-40"></div>
        <p class="text-sm">{{ t('popup.noActivity') }}</p>
        <p class="mt-1 text-xs opacity-70">{{ t('popup.noActivityHint') }}</p>
      </div>
    </div>

    <div class="h-px bg-gray-200 dark:bg-gray-700/50"></div>

    <!-- Shortcuts Cheatsheet -->
    <div class="flex flex-col gap-1.5 px-4 py-3">
      <div class="flex items-center justify-between text-xs">
        <kbd class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ hotkeyOpen }}</kbd>
        <span class="text-gray-400 dark:text-gray-500">{{ t('popup.shortcuts.promptSelector') }}</span>
      </div>
      <div class="flex items-center justify-between text-xs">
        <kbd class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">Ctrl+Shift+S</kbd>
        <span class="text-gray-400 dark:text-gray-500">{{ t('popup.shortcuts.quickSave') }}</span>
      </div>
      <div class="flex items-center justify-between text-xs">
        <kbd class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">Right-click</kbd>
        <span class="text-gray-400 dark:text-gray-500">{{ t('popup.shortcuts.rightClick') }}</span>
      </div>
    </div>

    <div class="h-px bg-gray-200 dark:bg-gray-700/50"></div>

    <!-- Dashboard Button -->
    <div class="flex justify-center px-4 py-3">
      <button
        @click="openRoute('options.html')"
        class="w-full rounded-lg bg-blue-500 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
      >
        {{ t('popup.openDashboard') }} →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { db, getSettings } from '@/stores/db'
import { getPlatformConfig } from '@/utils/chatPlatform'
import { MSG, type DataUpdatedPayload, type RequestMessage } from '@/utils/messaging'
import type { ChatPlatform } from '@/types/chat'
import { resolveLocalePreference } from '@/utils/locale'

const { t, locale } = useI18n()

const hotkeyOpen = ref('Alt+K')

// --- Activity types ---
interface ActivityItem {
  id: string
  icon: string
  iconClass: string
  label: string
  sub: string
  time: number
  route: string
}

const activities = ref<ActivityItem[]>([])

// --- Time formatting ---
function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('popup.timeAgo.justNow')
  if (mins < 60) return t('popup.timeAgo.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('popup.timeAgo.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('popup.timeAgo.daysAgo', { n: days })
}

async function setLocale() {
  const settings = await getSettings()
  hotkeyOpen.value = settings.hotkeyOpen || 'Alt+K'
  locale.value = resolveLocalePreference(settings.locale)
}
// --- Load activity feed ---
async function loadActivities() {
  const [allPrompts, chats, snippets] = await Promise.all([
    db.prompts.toArray(),
    db.chat_conversations.orderBy('updatedAt').reverse().limit(5).toArray(),
    db.snippets.orderBy('updatedAt').reverse().limit(5).toArray(),
  ])

  const prompts = allPrompts
    .filter(p => !!p.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    .slice(0, 5)

  const items: ActivityItem[] = []

  for (const p of prompts) {
    items.push({
      id: `prompt-${p.id}`,
      icon: '📝',
      iconClass: '',
      label: t('popup.activity.usedPrompt', { title: p.title }),
      sub: timeAgo(p.lastUsedAt!),
      time: p.lastUsedAt!,
      route: 'options.html#/prompts',
    })
  }

  for (const c of chats) {
    const platform = getPlatformConfig(c.platform as ChatPlatform)
    items.push({
      id: `chat-${c.id}`,
      icon: '💬',
      iconClass: '',
      label: t('popup.activity.capturedChat', { title: c.title }),
      sub: `${platform.name} · ${timeAgo(c.updatedAt)}`,
      time: c.updatedAt,
      route: 'options.html#/chat',
    })
  }

  for (const s of snippets) {
    items.push({
      id: `snippet-${s.id}`,
      icon: '</>',
      iconClass: 'font-mono text-xs',
      label: t('popup.activity.savedSnippet', { title: s.title }),
      sub: timeAgo(s.updatedAt),
      time: s.updatedAt,
      route: 'options.html#/tools',
    })
  }

  items.sort((a, b) => b.time - a.time)
  activities.value = items.slice(0, 5)
}

// --- Navigation ---
function openRoute(route: string) {
  chrome.tabs.create({ url: chrome.runtime.getURL(route) })
}

// --- Message handler ---
function handleMessage(msg: RequestMessage<unknown>) {
  if (msg?.type === MSG.DATA_UPDATED) {
    const payload = msg.data as DataUpdatedPayload | undefined
    if (!payload) return
    const { scope } = payload
    if (scope === 'settings') {
      setLocale()
    } else {
      loadActivities()
    }
  }
}

// --- Lifecycle ---
onMounted(async () => {
  await db.open()
  await setLocale()
  await loadActivities()
  chrome.runtime.onMessage.addListener(handleMessage)
})

onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handleMessage)
})
</script>

<style>
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.activity-item {
  animation: slideIn 200ms ease-out both;
  animation-delay: var(--stagger, 0ms);
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
