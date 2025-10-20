<template>
  <!-- ======================================================================= -->
  <!-- 主 UI 容器，负责整体布局、拖拽和折叠/展开状态                         -->
  <!-- ======================================================================= -->
  <div
    ref="containerRef"
    :style="containerStyle"
    :class="[
      'fixed z-[9999] overflow-hidden',
      'transition-[width,height,border-radius] duration-250 ease-[cubic-bezier(0.4, 0, 0.2, 1)]',
      'bg-white/85 dark:bg-[#202127]/90 backdrop-blur-xl',
      'border border-gray-200/50 dark:border-white/20', /* 外部边框也可以稍微弱化 */
      isCollapsed
        ? 'w-[56px] h-[56px] rounded-full shadow-lg hover:shadow-xl cursor-grab active:cursor-grabbing'
        : 'w-[340px] max-h-[min(80vh,800px)] rounded-2xl shadow-2xl flex flex-col',
      isMounted ? 'opacity-100' : 'opacity-0'
    ]"
    @mousedown="handleDragStart"
    @touchstart.passive="handleDragStart"
    @mouseenter="isContainerHovered = true"
    @mouseleave="isContainerHovered = false"
  >
    <!-- 头部区域：包含标题和控制按钮 -->
    <div
      :class="[
        'relative flex-shrink-0 transition-all duration-300',
        isCollapsed
          ? 'h-full w-full flex items-center justify-center p-0 cursor-pointer group'
          /* REFACTOR: 弱化头部下边框 */
          : 'h-[60px] px-5 flex items-center justify-between border-b border-gray-200/50 dark:border-white/15 bg-gray-50/50 dark:bg-white/[0.02]'
      ]"
      @click="handleHeaderClick"
    >
      <!-- ... 头部内容保持不变 ... -->
      <div class="flex items-center gap-3 overflow-hidden">
        <span
          :class="[
            ICONS.title,
            'text-xl text-gray-700/100 dark:text-white/100 transition-transform duration-300 flex-shrink-0',
            isCollapsed && isContainerHovered ? 'scale-110 -rotate-12' : '',
            isCollapsed ? 'text-2xl' : ''
          ]"
        ></span>
        <Transition name="content-bloom">
          <h3
            v-show="!isCollapsed"
            class="font-semibold text-gray-800/100 dark:text-white/100 text-[15px] tracking-wide whitespace-nowrap"
          >
            {{ t('content.outline.title') }}
          </h3>
        </Transition>
      </div>
      <Transition name="content-bloom">
        <div v-show="!isCollapsed" class="flex items-center gap-1">
          <div class="relative group/btn">
            <button
              @click.stop="handleRefresh"
              class="control-btn text-gray-500 dark:text-white/90"
              aria-label="Refresh"
            >
              <span
                :class="[
                  ICONS.refresh,
                  'text-lg transition-transform duration-700',
                  isRefreshing ? 'animate-spin-fast' : ''
                ]"
              ></span>
            </button>
            <ElegantTooltip :text="t('common.refresh')" />
          </div>
          <div class="relative group/btn">
            <button
              @click.stop="toggleCollapse"
              class="control-btn text-gray-500 dark:text-white/90 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <span :class="[ICONS.collapse, 'text-lg']"></span>
            </button>
            <ElegantTooltip :text="t('common.collapse')" />
          </div>
        </div>
      </Transition>
    </div>

    <!-- 内容区域：包含搜索、列表和统计信息 -->
    <Transition name="content-bloom">
      <div
        v-show="!isCollapsed"
        class="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent"
      >
        <!-- 搜索框 -->
        <div class="px-4 py-3 flex-shrink-0">
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none"
            >
              <span
                :class="[ICONS.search, 'text-gray-400 dark:text-white/80 text-sm']"
              ></span>
            </div>
              <input
                v-model="searchQuery"
                :placeholder="t('content.outline.searchPlaceholder')"
                class="w-full pl-10 pr-3 py-2 text-sm bg-gray-100/70 dark:bg-white/5 border border-transparent dark:border-white/15 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-blue-500/50 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-700 dark:text-white placeholder-gray-400/80 dark:placeholder-white/70"
              />
          </div>
        </div>

        <!-- ... 列表区域保持不变 ... -->
        <div
          class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar"
          ref="listContainerRef"
        >
          <TransitionGroup
            name="list-item"
            tag="ul"
            class="space-y-1"
            :key="listKey"
          >
            <li
              v-for="(item, index) in filteredItems"
              :key="item.id"
              :data-index="index"
              :style="{ '--stagger-index': index }"
              class="outline-item-wrapper group"
              :class="{ 'is-active': index === highlightedIndex }"
              @click="handleItemClick($event, item.element)"
              @mousemove="handleItemHover($event, index)"
              @mouseleave="handleItemLeave(item.element)"
              @mouseenter="handleItemMouseEnter(item.element)"
            >
              <div class="outline-item-content">
                <span class="item-index text-gray-400/80 dark:text-white/70">{{
                  index + 1
                }}</span>
                <span
                  class="item-icon transition-all duration-200"
                  :class="[
                    getDisplayIcon(item, index),
                    hoveredItem.index === index
                      ? 'text-blue-500/100 scale-110'
                      : 'text-gray-400 dark:text-white/80 group-hover:text-gray-600/100 dark:group-hover:text-white/100'
                  ]"
                ></span>
                <span
                  class="item-title truncate text-gray-700/100 dark:text-white/100 group-[.is-active]:text-blue-700/100 dark:group-[.is-active]:text-white/100 group-[.is-active]:font-semibold"
                  :title="item.title"
                >
                  {{ item.title }}
                </span>
              </div>
            </li>
          </TransitionGroup>
          <Transition name="fade">
            <div
              v-if="!isLoading && filteredItems.length === 0"
              class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-white/80"
            >
              <span :class="[ICONS.empty, 'text-4xl mb-3 opacity-50']"></span>
              <p class="text-sm font-medium">
                {{ t('content.outline.empty') }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- 统计信息底部栏 -->
        <div
          class="px-4 py-2 text-[11px] text-center text-gray-400 dark:text-white/70 border-t border-gray-200/50 dark:border-white/15 flex-shrink-0 bg-gray-50/30 dark:bg-transparent backdrop-blur-sm"
        >
          {{ stats }}
        </div>
      </div>
    </Transition>
  </div>

  <!-- ... 全局提示保持不变 ... -->
  <Transition name="overlay-fade">
    <div
      v-if="hint.visible"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] pointer-events-none"
    >
      <div
        class="bg-gray-900/85 dark:bg-black/85 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 transform scale-100 animate-pop-in"
        style="color: #fff !important"
      >
        <span :class="[hint.icon, 'text-2xl text-blue-400']"></span>
        <span class="text-base font-medium tracking-wide text-shadow-sm">{{
          hint.text
        }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  onUnmounted,
  type CSSProperties,
  nextTick
} from 'vue'
import { useDraggable, useWindowSize } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useOutline } from './useOutline'
import type { SiteConfig } from './site-configs'

// --- 图标常量 ---
// 集中管理所有图标，方便替换和维护
const ICONS = {
  title: 'i-ph-list-bullets-bold',
  refresh: 'i-ph-arrows-clockwise-bold',
  collapse: 'i-ph-minus-bold',
  search: 'i-ph-magnifying-glass-bold',
  empty: 'i-ph-chat-teardrop-dots-light',
  scrollUp: 'i-ph-arrow-up-bold',
  scrollCenter: 'i-ph-crosshair-bold',
  scrollDown: 'i-ph-arrow-down-bold'
}

// --- Props & 核心 Hooks ---
const props = defineProps<{ config: SiteConfig }>()
const { t } = useI18n()
const { height: windowHeight } = useWindowSize()

// --- 响应式状态定义 ---
const containerRef = ref<HTMLElement | null>(null) // 对主容器DOM的引用
const listContainerRef = ref<HTMLElement | null>(null) // 对列表容器DOM的引用
const targetRef = ref<HTMLElement | null>(null) // useOutline 使用的目标元素

const isCollapsed = ref(false) // UI是否为折叠状态
const isContainerHovered = ref(false) // 鼠标是否悬停在主容器上
const isRefreshing = ref(false) // 是否正在刷新列表
const listKey = ref(0) // 核心技巧：通过改变key来强制TransitionGroup重新渲染，实现列表刷新动画
const isMounted = ref(false) // 组件是否已挂载并准备好显示
const searchQuery = ref('') // 搜索框的输入值
const wasDragged = ref(false) // 用于区分“点击”和“拖拽”，防止拖拽结束时触发点击事件

// 定义三段式悬停的区域类型
type HoverZone = 'start' | 'center' | 'end' | ''
// 存储当前悬停的列表项信息
const hoveredItem = ref<{ index: number; zone: HoverZone }>({
  index: -1,
  zone: ''
})
// 全局提示的状态
const hint = ref<{ visible: boolean; text: string; icon: string }>({
  visible: false,
  text: '',
  icon: ''
})
// 用于管理提示和高亮效果的定时器
let hintTimeout: number | null = null
let highlightTimeout: number | null = null

// --- 生命周期钩子 ---
onMounted(async () => {
  await nextTick() // 确保DOM已渲染
  isMounted.value = true
  containerRef.value?.classList.add('animate-slide-in-right')
  injectGlobalStyles() // 注入全局高亮样式
})

// --- 核心大纲逻辑 ---
// 通过 useOutline 这个 composable 函数获取和管理大纲数据
const {
  items,
  highlightedIndex,
  updateItems: baseUpdateItems,
  isLoading
} = useOutline(props.config, targetRef)

// --- 拖拽功能 ---
// 使用 @vueuse/core 的 useDraggable 实现折叠后的拖拽
const { y: dragY, isDragging } = useDraggable(containerRef, {
  initialValue: { x: 0, y: 100 },
  preventDefault: true,
  disabled: computed(() => !isCollapsed.value), // 仅在折叠时允许拖拽
  onStart: () => {
    wasDragged.value = false // 每次开始交互时重置拖拽标记
  },
  onMove(p) {
    wasDragged.value = true // 只要有移动，就标记为拖拽
    // 限制拖拽范围在窗口可视区域内
    p.y = Math.max(20, Math.min(p.y, windowHeight.value - 80))
  }
})

// 动态计算容器样式，处理拖拽时的UI反馈
const containerStyle = computed<CSSProperties>(() => ({
  top: `${dragY.value}px`,
  right: '24px',
  // 拖拽时不应用 transition，以获得流畅的实时反馈
  transition: isDragging.value ? 'none' : undefined,
  transform: isDragging.value ? 'scale(1.05)' : 'scale(1)',
  zIndex: 9999
}))

// --- UI交互处理函数 ---

// 阻止在展开状态下拖拽整个面板
function handleDragStart(e: MouseEvent | TouchEvent) {
  if (!isCollapsed.value) e.stopPropagation()
}

// 切换面板的折叠/展开状态
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  if (isCollapsed.value) {
    searchQuery.value = '' // 折叠时清空搜索
    handleItemLeave() // 清除所有悬停高亮效果
  }
}

// 处理头部区域的点击事件
function handleHeaderClick() {
  if (wasDragged.value) return // 如果是拖拽操作，则不执行任何操作
  if (isCollapsed.value) toggleCollapse() // 仅在折叠状态下，点击头部可展开
}

// 刷新大纲列表
async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true

  // 核心：递增 key 会强制 Vue 销毁并重建 TransitionGroup 组件及其所有子项，
  // 从而确保所有新项目都执行“进入”动画，完美模拟“擦除并重绘”的效果。
  listKey.value++

  try {
    // 调用核心更新函数，它会处理加载状态和数据获取
    await baseUpdateItems()
  } finally {
    isRefreshing.value = false
  }
}

// --- 数据处理与计算属性 ---

// 根据搜索查询过滤列表项
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q))
})

// 计算并显示底部的统计信息
const stats = computed(() => {
  const total = items.value.length
  const visible = filteredItems.value.length
  // 依赖 isLoading 状态显示加载提示，替代骨架屏
  if (isLoading.value) return t('common.loading')
  if (total === 0) return t('content.outline.empty')
  if (!searchQuery.value) return t('content.outline.total', { count: total })
  return t('content.outline.filtered', { visible, total })
})

// --- 三段式悬停交互 ---

// 获取鼠标在元素上的悬停区域（左/中/右）
function getHoverZone(event: MouseEvent): HoverZone {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const w = rect.width
  if (x < w / 3) return 'start'
  if (x > (w * 2) / 3) return 'end'
  return 'center'
}

// 处理鼠标在列表项上移动的事件，更新图标和提示
function handleItemHover(event: MouseEvent, index: number) {
  const zone = getHoverZone(event)
  if (hoveredItem.value.index !== index || hoveredItem.value.zone !== zone) {
    hoveredItem.value = { index, zone }
    let text = '',
      icon = ''
    switch (zone) {
      case 'start':
        text = t('content.outline.scrollToTop'); icon = ICONS.scrollUp; break;
      case 'center':
        text = t('content.outline.scrollToCenter'); icon = ICONS.scrollCenter; break;
      case 'end':
        text = t('content.outline.scrollToBottom'); icon = ICONS.scrollDown; break;
    }
    if (hintTimeout) clearTimeout(hintTimeout)
    // 延迟显示提示，避免快速划过时闪烁
    hintTimeout = window.setTimeout(() => {
      hint.value = { visible: true, text, icon }
    }, 50)
  }
}

// 处理列表项的点击事件，根据点击区域滚动到目标元素
function handleItemClick(event: MouseEvent, element: Element) {
  const zone = getHoverZone(event)
  const block = (zone === '' ? 'center' : zone) as ScrollLogicalPosition
  element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' })

  // 应用一次性的闪烁高亮效果到目标元素
  document.querySelectorAll('.outline-flash-highlight').forEach(el => el.classList.remove('outline-flash-highlight'))
  element.classList.add('outline-flash-highlight')
  if (highlightTimeout) clearTimeout(highlightTimeout)
  highlightTimeout = window.setTimeout(() => {
    element.classList.remove('outline-flash-highlight')
  }, 2000)
  hint.value.visible = false
}

// --- JS 驱动的目标元素高亮 ---

// 鼠标进入列表项时，在页面对应元素上添加高亮
function handleItemMouseEnter(element: Element | null) {
  if (element) {
    element.classList.add('outline-hover-highlight')
  }
}

// 鼠标离开列表项时，移除所有相关高亮和提示
function handleItemLeave(element: Element | null = null) {
  if (hintTimeout) clearTimeout(hintTimeout)
  hoveredItem.value = { index: -1, zone: '' }
  hint.value.visible = false
  if (element) {
    element.classList.remove('outline-hover-highlight')
  } else {
    // 如果没有提供特定元素，则清除页面上所有悬停高亮
    document.querySelectorAll('.outline-hover-highlight').forEach(el => el.classList.remove('outline-hover-highlight'))
  }
}

// --- 观察器 ---
// 监听当前高亮项的索引变化，同步更新UI（滚动列表和添加高亮类）
watch(highlightedIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined && oldIndex >= 0 && items.value[oldIndex]) {
    items.value[oldIndex].element?.classList.remove('outline-active-highlight')
  }
  if (newIndex !== undefined && newIndex >= 0 && items.value[newIndex]) {
    items.value[newIndex].element?.classList.add('outline-active-highlight')
  }

  // 自动将高亮项滚动到列表的可视区域内
  if (newIndex >= 0 && listContainerRef.value && !isCollapsed.value) {
    const el = listContainerRef.value.querySelector(`[data-index="${newIndex}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

// 根据悬停状态和原始图标，决定列表项显示哪个图标
function getDisplayIcon(item: (typeof items.value)[0], index: number): string {
  if (hoveredItem.value.index === index && hoveredItem.value.zone) {
    switch (hoveredItem.value.zone) {
      case 'start': return ICONS.scrollUp
      case 'center': return ICONS.scrollCenter
      case 'end': return ICONS.scrollDown
    }
  }
  return item.icon
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (hintTimeout) clearTimeout(hintTimeout)
  if (highlightTimeout) clearTimeout(highlightTimeout)
})

// --- 内部微型组件 & 样式注入 ---
import { defineComponent, h, Transition } from 'vue'

// 一个简单的、无依赖的工具提示组件
const ElegantTooltip = defineComponent({
  props: { text: String },
  setup(props) {
    return () =>
      h(Transition, { name: 'tooltip-fade' }, {
        default: () => h('div', {
          class: [
            'absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1',
            'bg-white dark:bg-gray-800 text-gray-700 dark:text-white/90',
            'border border-gray-200/80 dark:border-transparent',
            'text-xs font-medium rounded-md shadow-lg whitespace-nowrap',
            'pointer-events-none z-50 backdrop-blur-sm',
            'opacity-0 translate-y-[-4px] group-hover/btn:opacity-100 group-hover/btn:translate-y-0',
            'transition-all duration-200 ease-out delay-300'
          ]
        }, props.text)
      })
  }
})

// 动态向页面注入全局CSS样式，用于高亮页面上的目标元素
function injectGlobalStyles() {
  const STYLE_ID = 'outline-component-global-styles'
  if (document.getElementById(STYLE_ID)) return

  const css = `
    .outline-hover-highlight {
      position: relative; z-index: 10;
      outline: 2px solid rgba(59, 130, 246, 0.4);
      outline-offset: 4px;
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 8px;
      transition: outline 0.2s ease-out, background-color 0.2s ease-out;
    }
    .outline-active-highlight {
      position: relative; z-index: 10;
      border-radius: 8px;
    }
    .outline-active-highlight::after {
      content: ''; position: absolute; inset: -4px;
      border: 2px solid rgba(59, 130, 246, 0.5);
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 12px; pointer-events: none;
      animation: pulse-border 2s infinite;
    }
    @keyframes pulse-border {
      0% { border-color: rgba(59, 130, 246, 0.5); }
      50% { border-color: rgba(59, 130, 246, 0.2); }
      100% { border-color: rgba(59, 130, 246, 0.5); }
    }
    .outline-flash-highlight { animation: flash-bg 2s ease-out forwards; }
    @keyframes flash-bg {
      0% { background-color: rgba(59, 130, 246, 0.3) !important; }
      100% { background-color: transparent !important; }
    }
  `
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}
</script>

<style scoped>
/* 控制按钮基础样式 */
.control-btn {
  @apply p-2 rounded-lg transition-colors duration-200 flex items-center justify-center;
  @apply hover:bg-gray-200/50 dark:hover:bg-gray-700/50;
}
/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300/50 dark:bg-gray-600/50 rounded-full;
  @apply hover:bg-gray-400/70 dark:hover:bg-gray-500/70;
}
/* 大纲列表项样式 */
.outline-item-wrapper {
  @apply relative px-2 py-1 rounded-xl cursor-pointer transition-all duration-200;
  will-change: transform, background-color;
}
.outline-item-wrapper:hover {
  transform: translateY(-2px);
  @apply bg-gray-100/80 dark:bg-gray-800/50;
}
.outline-item-wrapper.is-active {
  @apply bg-blue-50/80 dark:bg-blue-900/20;
}
.outline-item-wrapper.is-active:hover {
  transform: translateY(-2px) scale(1.02);
}
.outline-item-wrapper:active {
  transform: scale(0.97);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.outline-item-wrapper.is-active::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-[3px] rounded-r-full bg-blue-500;
}
.outline-item-content { @apply flex items-center gap-2.5 py-1.5; }
.item-index { @apply text-[10px] font-mono min-w-[16px] text-center; }
.item-icon { @apply text-base w-5 h-5 flex items-center justify-center flex-shrink-0; }
.item-title { @apply text-[13px] font-medium leading-snug; }

/* -------------------- */
/*      动画效果        */
/* -------------------- */

/* 刷新图标旋转动画 */
@keyframes spin-fast { to { transform: rotate(360deg); } }
.animate-spin-fast { animation: spin-fast 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

/* 容器初始滑入动画 */
@keyframes slideInRight {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }

/* 全局提示弹出动画 */
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-pop-in { animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

/* 内容区域展开/折叠动画 */
.content-bloom-enter-active { transition: all 0.3s ease-out 0.1s; }
.content-bloom-leave-active { transition: all 0.2s ease-in; }
.content-bloom-enter-from, .content-bloom-leave-to { opacity: 0; transform: scale(0.95); }

/* 列表项动画 */
.list-item-enter-active, .list-item-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-item-enter-active {
  /* 交错延迟，让列表项逐个出现，效果更自然 */
  transition-delay: calc(0.02s * var(--stagger-index, 0));
}
.list-item-enter-from, .list-item-leave-to {
  opacity: 0;
  /* 动画起始/结束状态：纯透明度 + 微小的Y轴位移，实现轻盈的淡入效果 */
  transform: translateY(5px);
}
.list-item-leave-active {
  position: absolute;
  width: calc(100% - 1.5rem);
}

/* 通用淡入淡出过渡效果 */
.fade-enter-active, .fade-leave-active,
.overlay-fade-enter-active, .overlay-fade-leave-active,
.tooltip-fade-enter-active, .tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to,
.overlay-fade-enter-from, .overlay-fade-leave-to,
.tooltip-fade-enter-from, .tooltip-fade-leave-to {
  opacity: 0;
}
</style>