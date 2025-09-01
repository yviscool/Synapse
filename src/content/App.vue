<template>
  <div>
    <PromptSelector
      v-if="visible"
      ref="selectorRef"
      :prompts="displayedPrompts"
      :categories="categoryOptions"
      :selectedCategory="selectedCategory"
      :highlightIndex="highlightIndex"
      :searchQuery="searchQuery"
      @update:selectedCategory="(v: string) => selectedCategory = v"
      @update:searchQuery="(v: string) => searchQuery = v"
      @select="handleSelect"
      @copy="handleCopy"
      @close="closePanel"
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

const { showToast, askConfirm, handleConfirm, hideToast } = useUI()

const selectorRef = ref<InstanceType<typeof PromptSelector> | null>(null)
const visible = ref(false)
const allPrompts = ref<PromptDTO[]>([])
const categoryOptions = ref<string[]>(['全部'])
const selectedCategory = ref<string>('全部')
const searchQuery = ref('')
const highlightIndex = ref(0)
let dataVersion = '0'

const displayedPrompts = computed(() => {
  return allPrompts.value
})

let opener: ReturnType<typeof findActiveInput> | null = null
let lastActiveEl: Element | null = null
let lastInputValue = ''
const ceLast = new WeakMap<HTMLElement, string>()

async function fetchData() {
  try {
    const payload = { q: searchQuery.value, category: selectedCategory.value }
    const res: ResponseMessage<PromptDTO[]> = await chrome.runtime.sendMessage({ type: MSG.GET_PROMPTS, data: payload })
    if (res.ok && res.data) {
      allPrompts.value = res.data
      dataVersion = res.version || '0'
    }
  } catch (e) {
    console.error('Failed to fetch prompts:', e)
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


function openPanel(_trigger: 'slash' | 'hotkey' | 'message' = 'hotkey') {
  visible.value = true
  lastActiveEl = document.activeElement
  opener = findActiveInput()
  highlightIndex.value = 0
  selectedCategory.value = '全部'
  searchQuery.value = ''
  
  fetchData()
  fetchCategories()

  setTimeout(() => {
    window.addEventListener('keydown', onKeydown, true)
  }, 0)
}

function closePanel() {
  visible.value = false
  window.removeEventListener('keydown', onKeydown, true)
  const elToFocus = lastActiveEl
  if (elToFocus instanceof HTMLElement) {
    setTimeout(() => elToFocus.focus(), 0)
  }
}

function clampHighlight() {
  const n = displayedPrompts.value.length
  if (n === 0) highlightIndex.value = 0
  else highlightIndex.value = Math.max(0, Math.min(highlightIndex.value, n - 1))
}
function resetHighlight() {
  highlightIndex.value = 0
}

watch(highlightIndex, (newIndex) => {
  selectorRef.value?.scrollToItem(newIndex)
})

watch([searchQuery, selectedCategory], () => {
  fetchData()
  resetHighlight()
})

function onKeydown(e: KeyboardEvent) {
  if (!visible.value) return
  const key = e.key
  if (key === 'ArrowDown') {
    e.preventDefault(); e.stopPropagation()
    highlightIndex.value++
    clampHighlight()
    return
  }
  if (key === 'ArrowUp') {
    e.preventDefault(); e.stopPropagation()
    highlightIndex.value--
    clampHighlight()
    return
  }
  if (key === 'Enter') {
    e.preventDefault(); e.stopPropagation()
    const cur = displayedPrompts.value[highlightIndex.value]
    if (cur) handleSelect(cur)
    return
  }
  if (key === 'Tab') {
    e.preventDefault(); e.stopPropagation()
    const idx = categoryOptions.value.indexOf(selectedCategory.value)
    const dir = e.shiftKey ? -1 : 1
    const next = (idx + dir + categoryOptions.value.length) % categoryOptions.value.length
    selectedCategory.value = categoryOptions.value[next]
    return
  }
  if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'c') {
    e.preventDefault(); e.stopPropagation()
    const cur = displayedPrompts.value[highlightIndex.value]
    if (cur) handleCopy(cur)
    return
  }
  if (key === 'Escape') {
    e.preventDefault(); e.stopPropagation()
    closePanel()
    return
  }
}

function removeSlashP(target: ReturnType<typeof findActiveInput> | null) {
  if (!target) return
  if (target.kind === 'textarea') {
    const el = target.el
    if (el.value.toLowerCase().endsWith('/p')) {
      el.value = el.value.slice(0, -2)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    el.focus()
    return
  }
  const el = target.el
  const txt = el.textContent || ''
  if (txt.toLowerCase().endsWith('/p')) {
    el.textContent = txt.slice(0, -2)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
      sel.addRange(r)
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true }))
  }
  el.focus()
}

async function handleSelect(p: PromptDTO) {
  try {
    chrome.runtime.sendMessage({ type: MSG.UPDATE_PROMPT_LAST_USED, data: { promptId: p.id } })
    const target = opener || findActiveInput()
    if (!target) {
      try { await navigator.clipboard.writeText(p.content) } catch {}
      return
    }
    removeSlashP(target)
    insertAtCursor(target, p.content)
  }
  finally {
    // Ensure the panel always closes and cleans up listeners
    closePanel()
  }
}

async function handleCopy(p: PromptDTO) {
  chrome.runtime.sendMessage({ type: MSG.UPDATE_PROMPT_LAST_USED, data: { promptId: p.id } })
  try { await navigator.clipboard.writeText(p.content) } catch {}
  showToast('复制成功！', 'success')
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (visible.value) return
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'k') {
    openPanel('hotkey')
  }
}

function onInput(e: Event) {
  if (visible.value) return
  const t = e.target as any
  if (t instanceof HTMLTextAreaElement) {
    const v = t.value || ''
    if (v.toLowerCase().endsWith('/p') && v !== lastInputValue) {
      lastInputValue = v
      openPanel('slash')
    } else if (!v.toLowerCase().endsWith('/p')) {
      lastInputValue = v
    }
  } else if (t && t instanceof HTMLElement && (t.getAttribute('contenteditable') === 'true' || t.getAttribute('role') === 'textbox')) {
    const last = ceLast.get(t) || ''
    const v = (t.textContent || '')
    if (v.toLowerCase().endsWith('/p') && v !== last) {
      ceLast.set(t, v)
      openPanel('slash')
    } else if (!v.toLowerCase().endsWith('/p')) {
      ceLast.set(t, v)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown, true)
  document.addEventListener('input', onInput, true)
  chrome.runtime.onMessage.addListener((msg: RequestMessage) => {
    if (msg?.type === MSG.OPEN_PANEL) {
      openPanel('message')
    }
    if (msg?.type === MSG.DATA_UPDATED) {
      if (visible.value && msg.data?.version !== dataVersion) {
        fetchData()
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