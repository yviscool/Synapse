<template>
  <!-- 主容器：包含提示词选择器和消息提示组件 -->
  <div>
    <!-- 提示词选择器面板 -->
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
    <Transition name="slide-right">
      <Outline v-if="outlineConfig" :config="outlineConfig" :key="currentUrl" />
    </Transition>
    <!-- 消息提示组件 -->
    <UiToast
      v-if="ui.toast"
      :message="ui.toast.message"
      :type="ui.toast.type"
      @close="hideToast"
    />
  </div>
</template>

<script setup lang="ts">
// === 导入依赖 ===
import { ui, useUI } from '@/stores/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener, refDebounced, useMagicKeys, whenever, useScrollLock, useUrl } from '@vueuse/core'

import Outline from '@/outline/Outline.vue'; // <-- Import new component
import { siteConfigs } from '@/outline/site-configs'; // <-- Import configs
import PromptSelector from './components/PromptSelector.vue'
import { findActiveInput, insertAtCursor } from '@/utils/inputAdapter'
import { MSG, type RequestMessage, type ResponseMessage, type PromptDTO } from '@/utils/messaging'
import type { FuseResultMatch, FuseResult } from 'fuse.js'

// Logic to select the correct config for the current site
const outlineConfig = computed(() => {
  const host = window.location.hostname;
  const key = Object.keys(siteConfigs).find(domain => host.includes(domain));
  return key ? siteConfigs[key] : null;
});

// --- SPA Navigation Handling ---
const currentUrl = useUrl();

// === UI 控制 ===
const { showToast, hideToast } = useUI()
const { t, locale } = useI18n()

// === i18n & Real-time Sync ---
const systemLanguage = computed(() => {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('zh') ? '中文' : 'English';
});

async function setLocale() {
  try {
    const res: ResponseMessage<any> = await chrome.runtime.sendMessage({ type: MSG.GET_SETTINGS })
    const settings = res?.data
    if (!res?.ok || !settings) return
    if (settings.locale === 'system') {
      locale.value = systemLanguage.value === '中文' ? 'zh-CN' : 'en'
    } else {
      locale.value = settings.locale
    }
  } catch (e) {
    console.error('获取设置失败:', e)
  }
}

// === 组件引用和状态 ===
/** 提示词选择器组件引用 */
const selectorRef = ref<InstanceType<typeof PromptSelector> | null>(null)
/** 面板是否可见 */
const visible = ref(false)

// 当面板显示时锁定页面滚动，提升用户体验
const isLocked = useScrollLock(document.body)
watch(visible, (v) => isLocked.value = v)

// === 数据和过滤状态 ===
/** 所有提示词数据（包含搜索匹配信息） */
const allPrompts = ref<(PromptDTO & { matches?: readonly FuseResultMatch[] })[]>([])
/** 分类选项列表 */
const categoryOptions = ref<string[]>(['全部'])
/** 当前选中的分类 */
const selectedCategory = ref<string>('全部')
/** 搜索查询字符串 */
const searchQuery = ref('')
/** 防抖处理的搜索查询，避免频繁请求 */
const searchQueryDebounced = refDebounced(searchQuery, 200)

// === 分页状态 ===
/** 当前页码 */
const currentPage = ref(1)
/** 提示词总数 */
const totalPrompts = ref(0)
/** 是否正在加载数据 */
const isLoading = ref(false)
/** 是否还有更多数据可加载 */
const hasMore = computed(() => allPrompts.value.length < totalPrompts.value)
/** 当前高亮的提示词索引 */
const highlightIndex = ref(0)
/** 数据版本号，用于检测数据更新 */
let dataVersion = '0'

// === 输入元素状态 ===
/** 触发面板时的输入元素信息 */
let opener: ReturnType<typeof findActiveInput> | null = null
/** 上一个活跃的元素，用于关闭面板后恢复焦点 */
let lastActiveEl: HTMLElement | null = null

// === 数据获取函数 ===

/**
 * 获取提示词数据
 * 支持搜索、分类过滤和分页加载
 */
async function fetchData() {
  // 防止重复请求
  if (isLoading.value) return
  isLoading.value = true

  try {
    // 构建请求参数
    const payload: any = {
      q: searchQueryDebounced.value,        // 搜索关键词
      page: currentPage.value,              // 当前页码
      limit: 50,                           // 每页数量
    }
    
    // 只有在没有搜索关键词时才应用分类过滤
    // 这样可以确保搜索结果不受分类限制
    if (!searchQueryDebounced.value) {
      payload.category = selectedCategory.value
    }
    
    // 发送消息到后台脚本获取数据
    const res: ResponseMessage<(PromptDTO & { matches?: readonly FuseResultMatch[] })[]> & { total?: number } = 
      await chrome.runtime.sendMessage({ type: MSG.GET_PROMPTS, data: payload })

    if (res.ok && res.data) {
      if (currentPage.value === 1) {
        // 第一页：替换所有数据
        allPrompts.value = res.data
      } else {
        // 后续页：追加数据（无限滚动）
        allPrompts.value.push(...res.data)
      }
      totalPrompts.value = res.total || 0
      dataVersion = res.version || '0'
    }
  } catch (e) {
    console.error('获取提示词失败:', e)
  } finally {
    isLoading.value = false
  }
}

/**
 * 获取分类列表
 */
async function fetchCategories() {
  try {
    const res: ResponseMessage<{id: string, name: string}[]> = 
      await chrome.runtime.sendMessage({ type: MSG.GET_CATEGORIES })
    
    if (res.ok && res.data) {
      // 在分类列表前添加"全部"选项
      categoryOptions.value = ['全部', ...res.data.map(c => c.name)]
    }
  } catch (e) {
    console.error('获取分类失败:', e)
  }
}

/**
 * 重置状态并重新获取数据
 * 在搜索条件或分类改变时调用
 */
function resetAndFetch() {
  currentPage.value = 1
  totalPrompts.value = 0
  allPrompts.value = []
  highlightIndex.value = 0
  fetchData()
}

// 监听搜索关键词和分类变化，自动重新获取数据
watch([searchQueryDebounced, selectedCategory], () => {
  resetAndFetch()
})

// === 面板控制函数 ===

/**
 * 打开提示词选择面板
 */
function openPanel() {
  visible.value = true
  
  // 记录当前焦点元素，用于关闭面板后恢复
  lastActiveEl = document.activeElement as HTMLElement | null
  
  // 查找并记录触发面板的输入元素
  opener = findActiveInput()

  // 重置搜索和分类状态
  selectedCategory.value = '全部'
  searchQuery.value = ''
  
  // 获取数据
  resetAndFetch()
  fetchCategories()
}

/**
 * 关闭提示词选择面板
 */
function closePanel() {
  visible.value = false
  
  // 恢复之前的焦点元素
  if (lastActiveEl) {
    setTimeout(() => lastActiveEl?.focus(), 0)
  }
}

/**
 * 限制高亮索引在有效范围内
 */
function clampHighlight() {
  const n = allPrompts.value.length
  if (n === 0) {
    highlightIndex.value = 0
  } else {
    highlightIndex.value = Math.max(0, Math.min(highlightIndex.value, n - 1))
  }
}

// 监听高亮索引变化，自动滚动到对应项目
watch(highlightIndex, (newIndex) => {
  selectorRef.value?.scrollToItem(newIndex)
})

// === 键盘导航控制 ===

/**
 * 魔法按键配置
 * 用于处理面板显示时的键盘快捷键
 */
const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    // 当面板显示时，阻止某些按键的默认行为
    if (visible.value && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault()
      e.stopPropagation()
      // 终极武器：立即停止同一元素上其他同类事件监听器的执行
      e.stopImmediatePropagation()
    }
  },
})

// 向下箭头：移动到下一个提示词
whenever(keys.ArrowDown, () => {
  if (!visible.value) return
  highlightIndex.value++
  clampHighlight()
})

// 向上箭头：移动到上一个提示词
whenever(keys.ArrowUp, () => {
  if (!visible.value) return
  highlightIndex.value--
  clampHighlight()
})

// 回车键：选择当前高亮的提示词
whenever(keys.Enter, () => {
  if (!visible.value) return
  const cur = allPrompts.value[highlightIndex.value]
  if (cur) handleSelect(cur)
})

// ESC键：关闭面板
whenever(keys.Escape, () => {
  if (!visible.value) return
  closePanel()
})

// Tab键：切换到下一个分类
whenever(keys.Tab, () => {
  if (!visible.value) return
  const idx = categoryOptions.value.indexOf(selectedCategory.value)
  const next = (idx + 1 + categoryOptions.value.length) % categoryOptions.value.length
  selectedCategory.value = categoryOptions.value[next]
})

// Shift+Tab：切换到上一个分类
whenever(keys['Shift+Tab'], () => {
  if (!visible.value) return
  const idx = categoryOptions.value.indexOf(selectedCategory.value)
  const next = (idx - 1 + categoryOptions.value.length) % categoryOptions.value.length
  selectedCategory.value = categoryOptions.value[next]
})

// Ctrl+C：复制当前高亮的提示词
whenever(keys.Ctrl_C, () => {
  if (!visible.value) return
  const cur = allPrompts.value[highlightIndex.value]
  if (cur) handleCopy(cur)
})

// === 事件处理函数 ===

/**
 * 处理提示词选择事件
 * @param p 选中的提示词对象
 */
async function handleSelect(p: PromptDTO) {
  try {
    // 更新提示词的最后使用时间（用于排序和统计）
    chrome.runtime.sendMessage({ 
      type: MSG.UPDATE_PROMPT_LAST_USED, 
      data: { promptId: p.id } 
    })
    
    // 获取目标输入元素（优先使用打开面板时记录的元素）
    const target = opener || findActiveInput()
    
    // 如果没有找到输入元素，则复制到剪贴板
    if (!target) {
      try { 
        await navigator.clipboard.writeText(p.content) 
        showToast(t('common.toast.copySuccess'), 'success')
      } catch {
        showToast(t('common.toast.operationFailed'), 'error')
      }
      return
    }
    
    // 检查是否由触发器 ('/p') 调用
    const isTriggered = searchQuery.value === ''

    // 在光标位置插入提示词内容，并告知函数是否需要替换触发符
    insertAtCursor(target, p.content, isTriggered)
    
    showToast(t('common.toast.operationSuccess'), 'success')
  } catch (error) {
    console.error('处理提示词选择时出错:', error)
    showToast(t('common.toast.operationFailed'), 'error')
  } finally {
    closePanel()
  }
}

/**
 * 处理提示词复制事件
 * @param p 要复制的提示词对象
 */
async function handleCopy(p: PromptDTO) {
  // 更新提示词的最后使用时间
  chrome.runtime.sendMessage({ 
    type: MSG.UPDATE_PROMPT_LAST_USED, 
    data: { promptId: p.id } 
  })
  
  try { 
    await navigator.clipboard.writeText(p.content)
    showToast(t('common.toast.copySuccess'), 'success')
  } catch {
    showToast(t('common.toast.operationFailed'), 'error')
  }
  
  closePanel()
}

/**
 * 处理加载更多数据事件
 * 实现无限滚动功能
 */
function handleLoadMore() {
  if (hasMore.value && !isLoading.value) {
    currentPage.value++
    fetchData()
  }
}

// === 全局事件监听 ===

// Alt+K 快捷键：打开面板
whenever(keys.alt_k, () => {
  if (!visible.value) openPanel()
})

/**
 * 全局键盘事件监听器
 * 用于检测 '/p' 触发序列
 * @param e 键盘事件对象
 */
function onKeydown(e: KeyboardEvent) {
  // 如果面板已经显示，不处理触发序列
  if (visible.value) return

  const t = e.target as HTMLElement
  const isTextarea = t instanceof HTMLTextAreaElement
  const isContentEditable = t.isContentEditable

  // 只在文本输入元素中处理
  if (!isTextarea && !isContentEditable) return

  // 检测触发序列：'/' 后跟 'p' 键
  if (e.key.toLowerCase() === 'p') {
    let precedingText = ''
    
    if (isTextarea) {
      // 获取 textarea 的文本内容
      precedingText = (t as HTMLTextAreaElement).value || ''
    } else if (isContentEditable) {
      // 获取 contenteditable 元素的文本内容
      precedingText = t.textContent || ''
    }

    // 如果文本以 '/' 结尾，则触发面板
    if (precedingText.toLowerCase().endsWith('/')) {
      e.preventDefault()    // 阻止 'p' 字符输入
      e.stopPropagation()   // 阻止事件冒泡
      openPanel()           // 打开提示词面板
    }
  }
}

// 注册全局键盘事件监听器（捕获阶段）
useEventListener(document, 'keydown', onKeydown, true)

// === 组件生命周期 ===

/**
 * 组件挂载后的初始化操作
 */
onMounted(() => {
  setLocale()
  // 监听来自后台脚本的消息
  chrome.runtime.onMessage.addListener((msg: RequestMessage & { data: any }) => {
    // 处理打开面板的消息
    if (msg?.type === MSG.OPEN_PANEL) {
      openPanel()
    }
    
    // 处理数据更新的消息
    if (msg?.type === MSG.DATA_UPDATED) {
      const { scope, version } = msg.data
      if (scope === 'settings') {
        setLocale()
      }
      // 如果面板正在显示且数据版本不同，则刷新数据
      if (visible.value && version !== dataVersion) {
        resetAndFetch()
        fetchCategories()
      }
    }
  })
})
</script>