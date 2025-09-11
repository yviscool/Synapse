<template>
  <div
    class="relative w-[420px] max-h-[550px] flex flex-col overflow-hidden rounded-lg bg-white font-sans text-gray-800 shadow-2xl dark:bg-gray-900 dark:text-gray-200"
    @keydown="handleKeydown"
    @mousemove="isKeyboardNavigating = false"
  >
    <div
      v-if="isExiting"
      class="absolute z-20 bg-blue-500/10 backdrop-blur-sm"
      :style="{
        top: `${exitState.top}px`,
        left: `${exitState.left}px`,
        width: `${exitState.width}px`,
        height: `${exitState.height}px`,
        transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }"
      :class="{ '!top-0 !left-0 !w-full !h-full !rounded-none': isExiting }"
    >
      <div class="flex h-full w-full items-center justify-center">
        <div
          class="i-carbon-checkmark-outline text-5xl text-blue-500 transition-all duration-300 ease-in-out"
          :class="{
            'opacity-100 scale-100 delay-150': isExiting,
            'opacity-0 scale-50': !isExiting
          }"
        ></div>
      </div>
    </div>

    <div
      class="flex flex-1 flex-col overflow-y-auto transition-opacity duration-200"
      :class="{ 'opacity-0': isExiting }"
    >
      <div class="sticky top-0 z-10 bg-white/80 p-3 backdrop-blur-sm dark:bg-gray-900/80">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <div class="i-carbon-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></div>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="搜索或新建..."
              class="w-full rounded-lg border-2 border-transparent bg-gray-100 py-2 pl-9 pr-4 text-base transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>
          <button
            ref="settingsButtonRef"
            @click="openOptionsPage($event.currentTarget as HTMLElement)"
            class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="设置"
          >
            <div class="i-carbon-settings text-xl"></div>
          </button>
        </div>
      </div>

      <div class="px-2 pb-2">
        <ul v-if="displayList.length">
          <template v-for="(item, index) in displayList" :key="item.key">
            <li v-if="item.type === 'header'" class="mt-3 first:mt-0">
              <h2 class="mb-1 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <div :class="item.icon"></div>
                {{ item.title }}
              </h2>
            </li>

            <li
              v-else-if="item.type === 'action'"
              :ref="el => setListItemRef(index, el)"
              :class="['flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors', { 'bg-blue-500/10': highlightIndex === index }]"
              @click="item.action($event.currentTarget as HTMLElement)"
              @mouseenter="!isKeyboardNavigating && (highlightIndex = index)"
            >
              <div :class="[item.icon, 'text-lg text-blue-500']"></div>
              <div class="font-medium" v-html="item.htmlTitle"></div>
            </li>

            <li
              v-else-if="item.type === 'prompt'"
              :ref="el => setListItemRef(index, el)"
              :class="['group cursor-pointer rounded-lg p-3 transition-colors', { 'bg-blue-500/10': highlightIndex === index }]"
              @click="selectPrompt(item.data, $event.currentTarget as HTMLElement)"
              @mouseenter="!isKeyboardNavigating && (highlightIndex = index)"
            >
               <div class="flex items-center justify-between">
                <div class="flex-1 overflow-hidden">
                  <div class="truncate font-semibold">{{ item.data.title }}</div>
                  <div class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{{ item.data.content }}</div>
                </div>
                <button @click.stop="editPrompt(item.data, $event.currentTarget as HTMLElement)" class="ml-2 rounded-full p-2 text-gray-500 opacity-0 transition-all hover:bg-gray-200/60 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-gray-700/50" aria-label="编辑">
                  <div class="i-carbon-edit text-lg"></div>
                </button>
              </div>
            </li>
          </template>
        </ul>
        <div v-else class="py-8 text-center text-gray-500">
          <p class="text-lg font-semibold">{{ searchQuery ? '未找到结果' : '这里空空如也' }}</p>
          <p class="mt-2 text-sm">{{ searchQuery ? '试试换个关键词，或直接按 Enter 新建。' : '试试搜索或创建你的第一个 Prompt！' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, onBeforeUpdate, watch } from 'vue'
import { db } from '@/stores/db'
import { repository } from '@/stores/repository'
import type { Prompt } from '@/types'
import { MSG } from '@/utils/messaging'

// --- Refs & State ---
const searchQuery = ref('')
const allPrompts = ref<Prompt[]>([])
const highlightIndex = ref(-1)
const searchInputRef = ref<HTMLInputElement | null>(null)
const settingsButtonRef = ref<HTMLButtonElement | null>(null)
const listItemsRef = ref<HTMLElement[]>([])
const isKeyboardNavigating = ref(false)

// [JOBS] SIMPLIFIED: One state to rule all exits.
const isExiting = ref(false)
const exitState = ref({ top: 0, left: 0, width: 0, height: 0 })

// --- Lifecycle & Setup ---
onMounted(async () => {
  searchInputRef.value?.focus()
  await db.open()
  await loadPrompts()
  chrome.runtime.onMessage.addListener(handleMessage)
})

onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handleMessage)
})

onBeforeUpdate(() => {
  listItemsRef.value = []
})

// --- Data Handling ---
async function loadPrompts() {
  const promptsFromDB = await db.prompts.toArray()
  allPrompts.value = promptsFromDB.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

function handleMessage(msg: any) {
  if (msg?.type === MSG.DATA_UPDATED) {
    loadPrompts()
  }
}

// --- [JOBS] REBUILT: A single, unified source of truth for what's displayed.
// This eliminates ALL complex logic from the template and keydown handler.
const displayList = computed(() => {
  const list: any[] = []
  const query = searchQuery.value.trim().toLowerCase()

  if (query) {
    // Search Mode
    list.push({
      type: 'action',
      key: 'add-action',
      icon: 'i-carbon-add-alt',
      htmlTitle: `新建 “<span class="truncate font-bold">${searchQuery.value}</span>”`,
      action: createNewPromptFromSearch
    });
    const filtered = allPrompts.value.filter(p =>
      p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query)
    );
    filtered.forEach(p => list.push({ type: 'prompt', key: p.id, data: p }))
  } else {
    // Default View
    const favorites = allPrompts.value.filter(p => p.favorite).slice(0, 5)
    if (favorites.length) {
      list.push({ type: 'header', key: 'fav-header', title: '我的收藏', icon: 'i-carbon-favorite-filled text-yellow-500' })
      favorites.forEach(p => list.push({ type: 'prompt', key: p.id, data: p }))
    }

    const favoriteIds = new Set(favorites.map(p => p.id))
    const recents = allPrompts.value
      .filter(p => p.lastUsedAt && !favoriteIds.has(p.id))
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, 5)

    if (recents.length) {
      list.push({ type: 'header', key: 'rec-header', title: '最近使用', icon: 'i-carbon-time' })
      recents.forEach(p => list.push({ type: 'prompt', key: p.id, data: p }))
    }
  }
  return list
})

// --- [JOBS] REBUILT: One function to handle all exits. It takes the origin element and the action to perform.
function exitWithAnimation(element: HTMLElement, actionCallback: () => void) {
  if (!element || isExiting.value) return
  
  const rect = element.getBoundingClientRect()
  exitState.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  isExiting.value = true

  // The action happens after the animation starts, ensuring a smooth transition.
  setTimeout(() => {
    actionCallback()
    // The window closes after the animation is mostly complete.
    setTimeout(() => window.close(), 300)
  }, 150)
}

// --- Actions ---
async function selectPrompt(prompt: Prompt, element: HTMLElement) {
  exitWithAnimation(element, async () => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      // This is a "soft" update, but we use the repository for consistency.
      // The notification will fire, but it's a small price for correctness.
      await repository.updatePrompt(prompt.id, { lastUsedAt: Date.now() })
    } catch (e) {
      console.error("Failed to copy or update prompt:", e)
    }
  })
}

function editPrompt(prompt: Prompt, element: HTMLElement) {
  exitWithAnimation(element, () => {
    const url = `options.html?action=edit&id=${prompt.id}`
    chrome.tabs.create({ url: chrome.runtime.getURL(url) })
  })
}

function createNewPromptFromSearch(element: HTMLElement) {
  exitWithAnimation(element, () => {
    const url = `options.html?action=new&title=${encodeURIComponent(searchQuery.value)}`
    chrome.tabs.create({ url: chrome.runtime.getURL(url) })
  })
}

function openOptionsPage(element: HTMLElement) {
  exitWithAnimation(element, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
  })
}

// --- Keyboard Navigation ---
const setListItemRef = (index: number, el: any) => {
  if (el) listItemsRef.value[index] = el as HTMLElement
}

// [JOBS] REBUILT: The logic is now breathtakingly simple because it operates on the unified `displayList`.
function handleKeydown(e: KeyboardEvent) {
  isKeyboardNavigating.value = true
  const list = displayList.value
  const totalItems = list.length
  if (totalItems === 0 && e.key !== 'Escape') return

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      if (highlightIndex.value > 0) highlightIndex.value--
      break

    case 'ArrowDown':
      e.preventDefault()
      if (highlightIndex.value < totalItems - 1) highlightIndex.value++
      break

    case 'Enter':
      e.preventDefault()
      const item = list[highlightIndex.value]
      const element = listItemsRef.value[highlightIndex.value]
      if (!item || !element || item.type === 'header') return

      if (item.type === 'prompt') {
        selectPrompt(item.data, element)
      } else if (item.type === 'action') {
        item.action(element)
      }
      break

    case 'Escape':
      window.close()
      break
  }
}

// --- Watchers ---
watch(searchQuery, () => {
  highlightIndex.value = displayList.value.findIndex(item => item.type !== 'header')
}, { flush: 'post' })

watch(highlightIndex, (newIndex) => {
  if (newIndex !== -1) {
    listItemsRef.value[newIndex]?.scrollIntoView({ block: 'nearest' })
  }
}, { flush: 'post' })
</script>

<style>
/* Styles remain unchanged as they were already excellent. */
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
</style>