<template>
  <div>
    <PromptSelector
      v-if="visible"
      ref="selectorRef"
      :prompts="allPrompts"
      :categories="categoryOptions"
      :selectedCategory="selectedCategory"
      :highlightIndex="highlightIndex"
      :searchQuery="searchQuery"
      :isLoading="isLoading"
      :hasMore="hasMore"
      :totalPrompts="totalPrompts"
      @update:selectedCategory="(v: string) => selectedCategory = v"
      @update:searchQuery="(v: string) => searchQuery = v"
      @select="handleSelect"
      @copy="handleCopy"
      @close="closePanel"
      @load-more="handleLoadMore"
    />
    <UiToast
      v-if="ui.toast"
      :message="ui.toast.message"
      :type="ui.toast.type"
      @close="hideToast"
    />
  </div>
</template>

<script setup lang="ts">
import { ui, useUI } from '@/stores/ui'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import PromptSelector from './components/PromptSelector.vue'
import { findActiveInput, insertAtCursor } from '@/utils/inputAdapter'
import { MSG, type RequestMessage, type ResponseMessage, type PromptDTO } from '@/utils/messaging'

const { showToast, hideToast } = useUI()

const selectorRef = ref<InstanceType<typeof PromptSelector> | null>(null)
const visible = ref(false)

// --- Data & Filter State ---
const allPrompts = ref<PromptDTO[]>([])
const categoryOptions = ref<string[]>(['全部'])
const selectedCategory = ref<string>('全部')
const searchQuery = ref('')
const searchQueryDebounced = ref('')

// --- Pagination State ---
const currentPage = ref(1)
const totalPrompts = ref(0)
const isLoading = ref(false)
const hasMore = computed(() => allPrompts.value.length < totalPrompts.value)
const highlightIndex = ref(0)
let dataVersion = '0'

let opener: ReturnType<typeof findActiveInput> | null = null
let lastActiveEl: Element | null = null

async function fetchData() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const payload = {
      q: searchQueryDebounced.value,
      category: selectedCategory.value,
      page: currentPage.value,
      limit: 50, // Load more items in content script for better scroll experience
    }
    // The response from background script is { ok, data, total, version }
    const res: ResponseMessage<PromptDTO[]> & { total?: number } = await chrome.runtime.sendMessage({ type: MSG.GET_PROMPTS, data: payload })

    if (res.ok && res.data) {
      if (currentPage.value === 1) {
        allPrompts.value = res.data
      } else {
        allPrompts.value.push(...res.data)
      }
      totalPrompts.value = res.total || 0
      dataVersion = res.version || '0'
    }
  } catch (e) {
    console.error('Failed to fetch prompts:', e)
  } finally {
    isLoading.value = false
  }
}

async function fetchCategories() {
  try {
    const res: ResponseMessage<{id: string, name: string}[]> = await chrome.runtime.sendMessage({ type: MSG.GET_CATEGORIES })
    if (res.ok && res.data) {
      categoryOptions.value = ['全部', '未分类', ...res.data.map(c => c.name)]
    }
  } catch (e) {
    console.error('Failed to fetch categories:', e)
  }
}

function resetAndFetch() {
  currentPage.value = 1
  totalPrompts.value = 0
  allPrompts.value = []
  highlightIndex.value = 0
  fetchData()
}

let searchDebounceTimer: number
watch(searchQuery, (val) => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    searchQueryDebounced.value = val
  }, 200)
})

watch([searchQueryDebounced, selectedCategory], () => {
  resetAndFetch()
})

function openPanel() {
  visible.value = true
  lastActiveEl = document.activeElement
  opener = findActiveInput()

  // Reset state
  selectedCategory.value = '全部'
  searchQuery.value = ''
  searchQueryDebounced.value = ''
  
  resetAndFetch()
  fetchCategories()

  setTimeout(() => window.addEventListener('keydown', onKeydown, true), 0)
}

function closePanel() {
  visible.value = false
  window.removeEventListener('keydown', onKeydown, true)
  if (lastActiveEl instanceof HTMLElement) {
    setTimeout(() => lastActiveEl?.focus(), 0)
  }
}

function clampHighlight() {
  const n = allPrompts.value.length
  if (n === 0) highlightIndex.value = 0
  else highlightIndex.value = Math.max(0, Math.min(highlightIndex.value, n - 1))
}

watch(highlightIndex, (newIndex) => {
  selectorRef.value?.scrollToItem(newIndex)
})

function onKeydown(e: KeyboardEvent) {
  if (!visible.value) return
  const key = e.key
  if (key === 'ArrowDown') {
    e.preventDefault(); e.stopPropagation()
    highlightIndex.value++
    clampHighlight()
  } else if (key === 'ArrowUp') {
    e.preventDefault(); e.stopPropagation()
    highlightIndex.value--
    clampHighlight()
  } else if (key === 'Enter') {
    e.preventDefault(); e.stopPropagation()
    const cur = allPrompts.value[highlightIndex.value]
    if (cur) handleSelect(cur)
  } else if (key === 'Tab') {
    e.preventDefault(); e.stopPropagation()
    const idx = categoryOptions.value.indexOf(selectedCategory.value)
    const dir = e.shiftKey ? -1 : 1
    const next = (idx + dir + categoryOptions.value.length) % categoryOptions.value.length
    selectedCategory.value = categoryOptions.value[next]
  } else if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'c') {
    e.preventDefault(); e.stopPropagation()
    const cur = allPrompts.value[highlightIndex.value]
    if (cur) handleCopy(cur)
  } else if (key === 'Escape') {
    e.preventDefault(); e.stopPropagation()
    closePanel()
  }
}

async function handleSelect(p: PromptDTO) {
  try {
    chrome.runtime.sendMessage({ type: MSG.UPDATE_PROMPT_LAST_USED, data: { promptId: p.id } })
    const target = opener || findActiveInput()
    if (!target) {
      try { await navigator.clipboard.writeText(p.content) } catch {}
      return
    }
    if (target.el.value?.toLowerCase().endsWith('/p')) {
      target.el.value = target.el.value.slice(0, -2)
      target.el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    insertAtCursor(target, p.content)
  } finally {
    closePanel()
  }
}

async function handleCopy(p: PromptDTO) {
  chrome.runtime.sendMessage({ type: MSG.UPDATE_PROMPT_LAST_USED, data: { promptId: p.id } })
  try { await navigator.clipboard.writeText(p.content) } catch {}
  showToast('复制成功！', 'success')
  closePanel()
}

function handleLoadMore() {
  if (hasMore.value && !isLoading.value) {
    currentPage.value++
    fetchData()
  }
}

// --- Global Listeners ---
let lastInputValue = ''
const ceLast = new WeakMap<HTMLElement, string>()

function onGlobalKeydown(e: KeyboardEvent) {
  if (visible.value) return
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'k') {
    openPanel()
  }
}

function onInput(e: Event) {
  if (visible.value) return
  const t = e.target as any
  if (t instanceof HTMLTextAreaElement) {
    const v = t.value || ''
    if (v.toLowerCase().endsWith('/p') && v !== lastInputValue) {
      lastInputValue = v
      openPanel()
    } else {
      lastInputValue = v
    }
  } else if (t instanceof HTMLElement && t.isContentEditable) {
    const last = ceLast.get(t) || ''
    const v = (t.textContent || '')
    if (v.toLowerCase().endsWith('/p') && v !== last) {
      ceLast.set(t, v)
      openPanel()
    } else {
      ceLast.set(t, v)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown, true)
  document.addEventListener('input', onInput, true)
  chrome.runtime.onMessage.addListener((msg: RequestMessage) => {
    if (msg?.type === MSG.OPEN_PANEL) {
      openPanel()
    }
    if (msg?.type === MSG.DATA_UPDATED) {
      if (visible.value && msg.data?.version !== dataVersion) {
        resetAndFetch()
        fetchCategories()
      }
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown, true)
  document.removeEventListener('input', onInput, true)
})
</script>