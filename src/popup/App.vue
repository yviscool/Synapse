<template>
  <div
    class="relative w-[420px] max-h-[550px] flex flex-col overflow-hidden rounded-lg bg-white font-sans text-gray-800 shadow-2xl dark:bg-gray-900 dark:text-gray-200"
    @keydown="handleKeydown"
    @mousemove="isKeyboardNavigating = false"
  >
    <div
      v-if="closingState.active"
      class="absolute z-20 bg-blue-500/10 backdrop-blur-sm"
      :style="{
        top: `${closingState.top}px`,
        left: `${closingState.left}px`,
        width: `${closingState.width}px`,
        height: `${closingState.height}px`,
        transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      }"
      :class="{
        '!top-0 !left-0 !w-full !h-full !rounded-none': closingState.active
      }"
    >
      <div class="flex h-full w-full items-center justify-center">
        <div
          class="i-carbon-checkmark-outline text-5xl text-blue-500 transition-all duration-300 ease-in-out"
          :class="{
            'opacity-100 scale-100 delay-200': closingState.active,
            'opacity-0 scale-50': !closingState.active
          }"
        ></div>
      </div>
    </div>

    <div
      class="flex flex-1 flex-col overflow-y-auto transition-opacity duration-300"
      :class="{ 'opacity-0': closingState.active || isNavigatingAway }"
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
            @click="openOptionsPage"
            class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="设置"
          >
            <div class="i-carbon-settings text-xl"></div>
          </button>
        </div>
      </div>
      <div class="px-2 pb-2">
        <div v-if="searchQuery">
          <ul>
            <li
              :ref="el => setListItemRef(0, el)"
              :class="['flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors', { 'bg-blue-500/10': highlightIndex === 0 }]"
              @click="createNewPromptFromSearch"
              @mouseenter="!isKeyboardNavigating && (highlightIndex = 0)"
            >
              <div class="i-carbon-add-alt text-lg text-blue-500"></div>
              <div class="font-medium">新建 “<span class="truncate font-bold">{{ searchQuery }}</span>”</div>
            </li>
            <li
              v-for="(prompt, index) in filteredPrompts"
              :key="`search-${prompt.id}`"
              :ref="el => setListItemRef(index + 1, el)"
              :class="['group cursor-pointer rounded-lg p-3 transition-colors', { 'bg-blue-500/10': index + 1 === highlightIndex }]"
              @click="selectItem(prompt, $event.currentTarget as HTMLElement)"
              @mouseenter="!isKeyboardNavigating && (highlightIndex = index + 1)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 overflow-hidden">
                  <div class="truncate font-semibold">{{ prompt.title }}</div>
                  <div class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{{ prompt.content }}</div>
                </div>
                <button @click.stop="editItem(prompt)" class="ml-2 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="编辑">
                  <div class="i-carbon-edit text-lg"></div>
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="space-y-3">
          <section v-if="favoritePrompts.length">
            <h2 class="mb-1 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <div class="i-carbon-favorite-filled text-yellow-500"></div>
              我的收藏
            </h2>
            <ul>
              <li
                v-for="(prompt, index) in favoritePrompts"
                :key="`fav-${prompt.id}`"
                :ref="el => setListItemRef(index, el)"
                :class="['group cursor-pointer rounded-lg p-3 transition-colors', { 'bg-blue-500/10': index === highlightIndex }]"
                @click="selectItem(prompt, $event.currentTarget as HTMLElement)"
                @mouseenter="!isKeyboardNavigating && (highlightIndex = index)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 overflow-hidden">
                    <div class="truncate font-semibold">{{ prompt.title }}</div>
                    <div class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{{ prompt.content }}</div>
                  </div>
                  <button @click.stop="editItem(prompt)" class="ml-2 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="编辑">
                    <div class="i-carbon-edit text-lg"></div>
                  </button>
                </div>
              </li>
            </ul>
          </section>
          <section v-if="recentPrompts.length">
            <h2 class="mb-1 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <div class="i-carbon-time"></div>
              最近使用
            </h2>
            <ul>
              <li
                v-for="(prompt, index) in recentPrompts"
                :key="`rec-${prompt.id}`"
                :ref="el => setListItemRef(favoritePrompts.length + index, el)"
                :class="['group cursor-pointer rounded-lg p-3 transition-colors', { 'bg-blue-500/10': favoritePrompts.length + index === highlightIndex }]"
                @click="selectItem(prompt, $event.currentTarget as HTMLElement)"
                @mouseenter="!isKeyboardNavigating && (highlightIndex = favoritePrompts.length + index)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 overflow-hidden">
                    <div class="truncate font-semibold">{{ prompt.title }}</div>
                    <div class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{{ prompt.content }}</div>
                  </div>
                  <button @click.stop="editItem(prompt)" class="ml-2 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="编辑">
                    <div class="i-carbon-edit text-lg"></div>
                  </button>
                </div>
              </li>
            </ul>
          </section>
          <div v-if="!favoritePrompts.length && !recentPrompts.length" class="py-8 text-center text-gray-500">
            <p class="text-lg font-semibold">这里空空如也</p>
            <p class="mt-2 text-sm">试试搜索或创建你的第一个 Prompt！</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, onBeforeUpdate, watch } from 'vue'
import { db } from '@/stores/db'
import type { Prompt } from '@/types'
import { MSG } from '@/utils/messaging'

// --- Refs & State ---
const searchQuery = ref('')
const allPrompts = ref<Prompt[]>([])
const highlightIndex = ref(-1)
const searchInputRef = ref<HTMLInputElement | null>(null)
const listItemsRef = ref<HTMLElement[]>([])
const isKeyboardNavigating = ref(false)
const isNavigatingAway = ref(false) // [JOBS] New state for consistent navigation exits.

const closingState = ref({
  active: false,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
})

// --- Setup & Lifecycle ---
onMounted(async () => {
  searchInputRef.value?.focus()
  try {
    await db.open()
    const promptsFromDB = await db.prompts.toArray()
    allPrompts.value = promptsFromDB.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  } catch (e) {
    console.error("Failed to load prompts from DB:", e)
  }
  chrome.runtime.onMessage.addListener(handleMessage)
})

onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handleMessage)
})

onBeforeUpdate(() => {
  listItemsRef.value = []
})

// --- Computed Properties ---
const filteredPrompts = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return allPrompts.value.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.content.toLowerCase().includes(query)
  )
})

const favoritePrompts = computed(() => {
  return allPrompts.value.filter(p => p.favorite).slice(0, 5)
})

const recentPrompts = computed(() => {
  const favoriteIds = new Set(favoritePrompts.value.map(p => p.id))
  return allPrompts.value
    .filter(p => p.lastUsedAt && !favoriteIds.has(p.id))
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    .slice(0, 5)
})

const activeList = computed(() => {
  if (searchQuery.value) return filteredPrompts.value
  return [...favoritePrompts.value, ...recentPrompts.value]
})

// --- Actions & Methods ---
function handleMessage(msg: any) {
  if (msg?.type === MSG.DATA_UPDATED) {
    db.prompts.toArray().then(prompts => {
      allPrompts.value = prompts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    })
  }
}

// --- [JOBS] REBUILT: Decoupled from mouse events. Accepts the element directly. Pure, simple, reliable.
async function selectItem(prompt: Prompt, element: HTMLElement) {
  if (!element) return; // Guard against errors

  const rect = element.getBoundingClientRect();
  closingState.value = {
    active: true,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };

  try {
    await navigator.clipboard.writeText(prompt.content);
    await db.prompts.update(prompt.id, { lastUsedAt: Date.now(), updatedAt: Date.now() });

    // The magical animation is 500ms. We close shortly after.
    setTimeout(() => window.close(), 600);
  } catch (e) {
    console.error("Failed to copy or update prompt:", e);
    closingState.value.active = false; // If it fails, gracefully return to normal.
  }
}

// --- [JOBS] NEW: A single, graceful way to handle all navigation-based exits.
function closeWithNavigation(callback: () => void) {
    isNavigatingAway.value = true;
    setTimeout(() => {
        callback();
        window.close();
    }, 300); // 300ms is enough for a quick, clean fade.
}

function createNewPromptFromSearch() {
  closeWithNavigation(() => {
    const url = `options.html?action=new&title=${encodeURIComponent(searchQuery.value)}`;
    chrome.tabs.create({ url: chrome.runtime.getURL(url) });
  });
}

function editItem(prompt: Prompt) {
  closeWithNavigation(() => {
    const url = `options.html?action=edit&id=${prompt.id}`;
    chrome.tabs.create({ url: chrome.runtime.getURL(url) });
  });
}

function openOptionsPage() {
  closeWithNavigation(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  });
}

const setListItemRef = (index: number, el: any) => {
  if (el) {
    listItemsRef.value[index] = el as HTMLElement;
  }
}

// --- [JOBS] REBUILT: Logic is simplified. No hacks. Keyboard is a first-class citizen.
function handleKeydown(e: KeyboardEvent) {
  isKeyboardNavigating.value = true
  const list = activeList.value
  const totalItems = searchQuery.value ? list.length + 1 : list.length;
  if (totalItems === 0 && e.key !== 'Escape') return;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      if (highlightIndex.value > 0) {
        highlightIndex.value--
      } else if (!searchQuery.value && highlightIndex.value > -1) {
        // Allow ArrowUp to deselect in non-search view
        highlightIndex.value = -1;
      }
      break;

    case 'ArrowDown':
      e.preventDefault()
      if (highlightIndex.value < totalItems - 1) {
        highlightIndex.value++
      }
      break;

    case 'Enter':
      e.preventDefault()
      if (highlightIndex.value === -1) return; // Do nothing if nothing is selected

      const selectedEl = listItemsRef.value[highlightIndex.value];
      if (!selectedEl) return; // Safety check

      if (searchQuery.value) {
        if (highlightIndex.value === 0) {
          createNewPromptFromSearch()
        } else {
          const prompt = list[highlightIndex.value - 1];
          if (prompt) selectItem(prompt, selectedEl)
        }
      } else {
        const prompt = list[highlightIndex.value];
        if (prompt) selectItem(prompt, selectedEl)
      }
      break;

    case 'Escape':
      window.close()
      break;
  }
}

// --- Watchers ---
watch(searchQuery, (query) => {
  // In search mode, the first item ("Create") should always be the default focus.
  highlightIndex.value = query ? 0 : -1
})

watch(highlightIndex, (newIndex) => {
  if (newIndex === -1) {
    searchInputRef.value?.focus();
  } else {
    nextTick(() => {
      const activeItem = listItemsRef.value[newIndex];
      activeItem?.scrollIntoView({ block: 'nearest' });
    });
  }
}, { flush: 'post' });
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
</style>