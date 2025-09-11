<template>
  <div>
    <PromptSelector
      v-if="visible"
      ref="selectorRef"
      v-model:searchQuery="searchQuery"
      v-model:selectedCategory="selectedCategory"
      :prompts="allPrompts"
      :categories="categoryOptions"
      :highlightIndex="highlightIndex"
      :isLoading="isLoading"
      :hasMore="hasMore"
      :totalPrompts="totalPrompts"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useEventListener, refDebounced, useMagicKeys, whenever, useScrollLock } from '@vueuse/core'
import { useFocusRestore } from '@/composables/useFocusRestore'
import { useSlashTrigger } from '@/composables/useSlashTrigger'
import PromptSelector from './components/PromptSelector.vue'
import { findActiveInput, insertAtCursor } from '@/utils/inputAdapter'
import { MSG, type RequestMessage, type ResponseMessage, type PromptDTO } from '@/utils/messaging'

const { showToast, hideToast } = useUI()

const selectorRef = ref<InstanceType<typeof PromptSelector> | null>(null)
const visible = ref(false)

const isLocked = useScrollLock(document.body)
watch(visible, (v) => isLocked.value = v)

// --- Data & Filter State ---
const allPrompts = ref<PromptDTO[]>([])
const categoryOptions = ref<string[]>(['全部'])
const selectedCategory = ref<string>('全部')
const searchQuery = ref('')
const searchQueryDebounced = refDebounced(searchQuery, 200)

// --- Pagination State ---
const currentPage = ref(1)
const totalPrompts = ref(0)
const isLoading = ref(false)
const hasMore = computed(() => allPrompts.value.length < totalPrompts.value)
const highlightIndex = ref(0)
let dataVersion = '0'

let opener: ReturnType<typeof findActiveInput> | null = null
const { saveFocus, restoreFocus } = useFocusRestore()

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

watch([searchQueryDebounced, selectedCategory], () => {
  resetAndFetch()
})

function openPanel() {
  visible.value = true
  saveFocus()
  opener = findActiveInput()

  // Reset state
  selectedCategory.value = '全部'
  searchQuery.value = ''
  
  resetAndFetch()
  fetchCategories()
}

function closePanel() {
  visible.value = false
  restoreFocus()
}

function clampHighlight() {
  const n = allPrompts.value.length
  if (n === 0) highlightIndex.value = 0
  else highlightIndex.value = Math.max(0, Math.min(highlightIndex.value, n - 1))
}

watch(highlightIndex, (newIndex) => {
  selectorRef.value?.scrollToItem(newIndex)
})

// --- Keyboard Navigation ---
const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (visible.value && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')) {
      e.preventDefault()
      e.stopPropagation()
    }
  },
})
whenever(keys.ArrowDown, () => {
  if (!visible.value) return
  highlightIndex.value++
  clampHighlight()
})
whenever(keys.ArrowUp, () => {
  if (!visible.value) return
  highlightIndex.value--
  clampHighlight()
})
whenever(keys.Enter, () => {
  if (!visible.value) return
  const cur = allPrompts.value[highlightIndex.value]
  if (cur) handleSelect(cur)
})
whenever(keys.Escape, () => {
  if (!visible.value) return
  closePanel()
})
whenever(keys.Tab, () => {
  if (!visible.value) return
  const idx = categoryOptions.value.indexOf(selectedCategory.value)
  const next = (idx + 1 + categoryOptions.value.length) % categoryOptions.value.length
  selectedCategory.value = categoryOptions.value[next]
})
whenever(keys['Shift+Tab'], () => {
  if (!visible.value) return
  const idx = categoryOptions.value.indexOf(selectedCategory.value)
  const next = (idx - 1 + categoryOptions.value.length) % categoryOptions.value.length
  selectedCategory.value = categoryOptions.value[next]
})
whenever(keys.Ctrl_C, () => {
  if (!visible.value) return
  const cur = allPrompts.value[highlightIndex.value]
  if (cur) handleCopy(cur)
})

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
whenever(keys.alt_k, () => {
  if (!visible.value) openPanel()
})
useSlashTrigger(() => {
  if (!visible.value) openPanel()
})

onMounted(() => {
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
</script>