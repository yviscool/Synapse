<template>
  <!--
    ============================================================================
    主容器 (The Master Container) - v4 "Polished"
    ----------------------------------------------------------------------------
    Refined animations and JS-driven highlighting for a silky-smooth experience.
    ============================================================================
  -->
  <div
    ref="containerRef"
    :style="containerStyle"
    :class="[
      'fixed z-[9999] overflow-hidden',
      'transition-[width,height,border-radius] duration-250 ease-[cubic-bezier(0.4, 0, 0.2, 1)]',
      'bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl',
      'border border-gray-200/50 dark:border-gray-700/50',
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
    <!-- 头部区域 -->
    <div
      :class="[
        'relative flex-shrink-0 transition-all duration-300',
        isCollapsed
          ? 'h-full w-full flex items-center justify-center p-0 cursor-pointer group'
          : 'h-[60px] px-5 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/50'
      ]"
      @click="handleHeaderClick"
    >
      <!-- 标题与图标组 -->
      <div class="flex items-center gap-3 overflow-hidden">
        <span
          :class="[
            ICONS.title,
            'text-xl text-blue-500 dark:text-blue-400 transition-transform duration-300 flex-shrink-0',
            isCollapsed && isContainerHovered ? 'scale-110 -rotate-12' : '',
            isCollapsed ? 'text-2xl' : ''
          ]"
        ></span>
        <Transition name="content-bloom">
          <h3
            v-show="!isCollapsed"
            class="font-semibold text-gray-800 dark:text-gray-100 text-[15px] tracking-wide whitespace-nowrap"
          >
            {{ t('content.outline.title') }}
          </h3>
        </Transition>
      </div>

      <!-- 控制按钮组 -->
      <Transition name="content-bloom">
        <div v-show="!isCollapsed" class="flex items-center gap-1">
          <div class="relative group/btn">
            <button @click.stop="handleRefresh" class="control-btn" aria-label="Refresh">
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
              class="control-btn text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <span :class="[ICONS.collapse, 'text-lg']"></span>
            </button>
            <ElegantTooltip :text="t('common.collapse')" />
          </div>
        </div>
      </Transition>
    </div>

    <!--
      ==========================================================================
      内容区域 - v4 "绽放"
      ==========================================================================
    -->
    <Transition name="content-bloom">
      <div v-show="!isCollapsed" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
        <!-- 搜索框 -->
        <div class="px-4 py-3 flex-shrink-0">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <span :class="[ICONS.search, 'text-gray-400 text-sm']"></span>
            </div>
            <input
              v-model="searchQuery"
              :placeholder="t('content.outline.searchPlaceholder')"
              class="w-full pl-10 pr-3 py-2 text-sm bg-gray-100/70 dark:bg-gray-800/70 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        <!-- 列表区域 -->
        <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar" ref="listContainerRef">
          <!-- 初始加载状态：优雅的骨架屏 -->
          <div v-if="isLoading" class="pt-4 space-y-3">
            <div
              v-for="i in 5"
              :key="i"
              class="h-8 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg animate-pulse"
            ></div>
          </div>

          <!-- 列表内容：引入 :key 和 stagger 动画 -->
          <TransitionGroup v-else name="list-item" tag="ul" class="space-y-1" :key="listKey">
            <li
              v-for="(item, index) in filteredItems"
              :key="item.id"
              :data-index="index"
              :style="{ '--stagger-index': index }"
              class="outline-item-wrapper group"
              :class="{ 'is-active': index === highlightedIndex }"
              @click="e => handleItemClick(e, item.element)"
              @mousemove="e => handleItemHover(e, index)"
              @mouseleave="handleItemLeave(item.element)"
              @mouseenter="handleItemMouseEnter(item.element)"
            >
              <div class="outline-item-content">
                <span class="item-index">{{ index + 1 }}</span>
                <span
                  class="item-icon transition-all duration-200"
                  :class="[
                    getDisplayIcon(item, index),
                    hoveredItem.index === index
                      ? 'text-blue-500 scale-110'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  ]"
                ></span>
                <span class="item-title truncate" :title="item.title">{{ item.title }}</span>
              </div>
            </li>
          </TransitionGroup>

          <!-- 空状态 -->
          <Transition name="fade">
            <div
              v-if="!isLoading && filteredItems.length === 0"
              class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"
            >
              <span :class="[ICONS.empty, 'text-4xl mb-3 opacity-50']"></span>
              <p class="text-sm font-medium">{{ t('content.outline.empty') }}</p>
            </div>
          </Transition>
        </div>

        <!-- 统计信息底部栏 -->
        <div
          class="px-4 py-2 text-[11px] text-center text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/50 flex-shrink-0 bg-gray-50/30 dark:bg-gray-800/30 backdrop-blur-sm"
        >
          {{ stats }}
        </div>
      </div>
    </Transition>
  </div>

  <!--
    ============================================================================
    全局滚动提示 - v4 "禅意"
    ============================================================================
  -->
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
        <span class="text-base font-medium tracking-wide text-shadow-sm">{{ hint.text }}</span>
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

// --- 图标集 ---
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

// --- Props & Hooks ---
const props = defineProps<{ config: SiteConfig }>()
const { t } = useI18n()
const { height: windowHeight } = useWindowSize()

// --- 状态管理 ---
const containerRef = ref<HTMLElement | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)
const targetRef = ref<HTMLElement | null>(null)

const isCollapsed = ref(false)
const isContainerHovered = ref(false)
const isRefreshing = ref(false)
const listKey = ref(0)
const isMounted = ref(false)
const searchQuery = ref('')

type HoverZone = 'start' | 'center' | 'end' | ''
const hoveredItem = ref<{ index: number; zone: HoverZone }>({
  index: -1,
  zone: ''
})
const hint = ref<{ visible: boolean; text: string; icon: string }>({
  visible: false,
  text: '',
  icon: ''
})
let hintTimeout: number | null = null
let highlightTimeout: number | null = null

// --- 初始化与核心逻辑 ---
onMounted(async () => {
  await nextTick()
  isMounted.value = true
  containerRef.value?.classList.add('animate-slide-in-right')
  injectGlobalStyles() // 注入全局样式
})

const {
  items,
  highlightedIndex,
  updateItems: baseUpdateItems,
  isLoading
} = useOutline(props.config, targetRef)

// --- 拖拽逻辑 ---
const { y: dragY, isDragging } = useDraggable(containerRef, {
  initialValue: { x: 0, y: 100 },
  preventDefault: true,
  disabled: computed(() => !isCollapsed.value),
  onMove(p) {
    p.y = Math.max(20, Math.min(p.y, windowHeight.value - 80))
  }
})
const containerStyle = computed<CSSProperties>(() => ({
  top: `${isCollapsed.value ? dragY.value : 100}px`,
  right: '24px',
  transition: isDragging.value ? 'none' : undefined,
  transform: isDragging.value ? 'scale(1.05)' : 'scale(1)',
  zIndex: 9999
}))

// --- 交互逻辑 ---
function handleDragStart(e: MouseEvent | TouchEvent) {
  if (!isCollapsed.value) e.stopPropagation()
}
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  if (isCollapsed.value) {
    searchQuery.value = ''
    handleItemLeave()
  }
}
function handleHeaderClick() {
  if (isCollapsed.value) toggleCollapse()
}

async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  listKey.value++
  await nextTick()
  baseUpdateItems()
  listKey.value++
  isRefreshing.value = false
}

// --- 数据处理 ---
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q))
})
const stats = computed(() => {
  const total = items.value.length
  const visible = filteredItems.value.length
  if (isLoading.value) return 'Loading...'
  if (total === 0) return t('content.outline.empty')
  if (!searchQuery.value) return t('content.outline.total', { count: total })
  return t('content.outline.filtered', { visible, total })
})

// --- 三段式悬停与滚动交互 ---
function getHoverZone(event: MouseEvent): HoverZone {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const w = rect.width
  if (x < w / 3) return 'start'
  if (x > (w * 2) / 3) return 'end'
  return 'center'
}
function handleItemHover(event: MouseEvent, index: number) {
  const zone = getHoverZone(event)
  if (hoveredItem.value.index !== index || hoveredItem.value.zone !== zone) {
    hoveredItem.value = { index, zone }
    let text = '',
      icon = ''
    switch (zone) {
      case 'start':
        text = t('content.outline.scrollToTop')
        icon = ICONS.scrollUp
        break
      case 'center':
        text = t('content.outline.scrollToCenter')
        icon = ICONS.scrollCenter
        break
      case 'end':
        text = t('content.outline.scrollToBottom')
        icon = ICONS.scrollDown
        break
    }
    if (hintTimeout) clearTimeout(hintTimeout)
    hintTimeout = window.setTimeout(() => {
      hint.value = { visible: true, text, icon }
    }, 100)
  }
}

function handleItemClick(event: MouseEvent, element: Element) {
  const zone = getHoverZone(event)
  const block = (zone === '' ? 'center' : zone) as ScrollLogicalPosition
  element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' })

  // 应用闪烁效果
  document
    .querySelectorAll('.outline-flash-highlight')
    .forEach(el => el.classList.remove('outline-flash-highlight'))
  element.classList.add('outline-flash-highlight')
  if (highlightTimeout) clearTimeout(highlightTimeout)
  highlightTimeout = window.setTimeout(() => {
    element.classList.remove('outline-flash-highlight')
  }, 2000)
  hint.value.visible = false
}

// --- JS 驱动的目标元素高亮 ---
function handleItemMouseEnter(element: Element | null) {
  if (element) {
    element.classList.add('outline-hover-highlight')
  }
}

function handleItemLeave(element: Element | null = null) {
  if (hintTimeout) clearTimeout(hintTimeout)
  hoveredItem.value = { index: -1, zone: '' }
  hint.value.visible = false
  if (element) {
    element.classList.remove('outline-hover-highlight')
  } else {
    // Fallback to clear all if element is not passed
    document
      .querySelectorAll('.outline-hover-highlight')
      .forEach(el => el.classList.remove('outline-hover-highlight'))
  }
}

// 监听滚动自动高亮的变化，并更新页面目标元素的脉冲效果
watch(highlightedIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined && oldIndex >= 0 && items.value[oldIndex]) {
    items.value[oldIndex].element?.classList.remove('outline-active-highlight')
  }
  if (newIndex !== undefined && newIndex >= 0 && items.value[newIndex]) {
    items.value[newIndex].element?.classList.add('outline-active-highlight')
  }

  // 列表滚动到高亮项
  if (newIndex >= 0 && listContainerRef.value && !isCollapsed.value) {
    const el = listContainerRef.value.querySelector(`[data-index="${newIndex}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

function getDisplayIcon(item: (typeof items.value)[0], index: number): string {
  if (hoveredItem.value.index === index && hoveredItem.value.zone) {
    switch (hoveredItem.value.zone) {
      case 'start':
        return ICONS.scrollUp
      case 'center':
        return ICONS.scrollCenter
      case 'end':
        return ICONS.scrollDown
    }
  }
  return item.icon
}

onUnmounted(() => {
  if (hintTimeout) clearTimeout(hintTimeout)
  if (highlightTimeout) clearTimeout(highlightTimeout)
  // Clean up global styles if needed, though usually not necessary for userscripts
});

// --- 微型组件 & 样式注入 ---
import { defineComponent, h, Transition } from 'vue'

const ElegantTooltip = defineComponent({
  props: { text: String },
  setup(props) {
    return () =>
      h(
        Transition,
        { name: 'tooltip-fade' },
        {
          default: () =>
            h(
              'div',
              {
                class: [
                  'absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1',
                  'bg-gray-800 text-white text-xs font-medium rounded-md shadow-sm whitespace-nowrap',
                  'pointer-events-none z-50 backdrop-blur-sm',
                  'opacity-0 translate-y-[-4px] group-hover/btn:opacity-100 group-hover/btn:translate-y-0',
                  'transition-all duration-200 ease-out delay-300'
                ]
              },
              props.text
            )
        }
      )
  }
})

function injectGlobalStyles() {
  const STYLE_ID = 'outline-component-global-styles'
  if (document.getElementById(STYLE_ID)) return

  const css = `
    .outline-hover-highlight {
      position: relative;
      z-index: 10;
      outline: 2px solid rgba(59, 130, 246, 0.4);
      outline-offset: 4px;
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 8px;
      transition: outline 0.2s ease-out, background-color 0.2s ease-out;
    }
    .outline-active-highlight {
      position: relative;
      z-index: 10;
      border-radius: 8px; /* Needed for outline-offset to look right */
    }
    .outline-active-highlight::after {
      content: '';
      position: absolute;
      inset: -4px;
      border: 2px solid rgba(59, 130, 246, 0.5);
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 12px; /* Slightly larger radius than parent */
      pointer-events: none;
      animation: pulse-border 2s infinite;
    }
    @keyframes pulse-border {
      0% { border-color: rgba(59, 130, 246, 0.5); }
      50% { border-color: rgba(59, 130, 246, 0.2); }
      100% { border-color: rgba(59, 130, 246, 0.5); }
    }
    .outline-flash-highlight {
      animation: flash-bg 2s ease-out forwards;
    }
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
/* --- Custom CSS - v4 --- */
.control-btn {
  @apply p-2 rounded-lg text-gray-400 transition-colors duration-200 flex items-center justify-center;
  @apply hover:bg-gray-200/50 hover:text-gray-700;
  @apply dark:hover:bg-gray-700/50 dark:hover:text-gray-200;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300/50 dark:bg-gray-600/50 rounded-full;
  @apply hover:bg-gray-400/70 dark:hover:bg-gray-500/70;
}

.outline-item-wrapper {
  @apply relative px-2 py-1 rounded-xl cursor-pointer transition-all duration-200;
  will-change: transform, background-color;
}
.outline-item-wrapper:hover {
  transform: translateY(-2px);
  @apply bg-gray-100/80 dark:hover:bg-gray-800/50;
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

.outline-item-content {
  @apply flex items-center gap-2.5 py-1.5;
}
.item-index {
  @apply text-[10px] font-mono text-gray-400/80 min-w-[16px] text-center;
}
.item-icon {
  @apply text-base w-5 h-5 flex items-center justify-center flex-shrink-0;
}
.item-title {
  @apply text-[13px] text-gray-700 dark:text-gray-300 font-medium leading-snug;
}
.is-active .item-title {
  @apply text-blue-700 dark:text-blue-100 font-semibold;
}

/* --- Animations & Transitions - v4 --- */
@keyframes spin-fast {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin-fast {
  animation: spin-fast 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes slideInRight {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.animate-slide-in-right {
  animation: slideInRight 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}
@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-pop-in {
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* Content "Bloom" Animation */
.content-bloom-enter-active {
  transition: all 0.3s ease-out 0.1s;
}
.content-bloom-leave-active {
  transition: all 0.2s ease-in;
}
.content-bloom-enter-from,
.content-bloom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Staggered List Item Animation */
.list-item-enter-active,
.list-item-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-item-enter-active {
  transition-delay: calc(0.03s * var(--stagger-index, 0));
}
.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-item-leave-active {
  position: absolute;
  width: calc(100% - 1.5rem);
}

/* Other Fade Transitions */
.fade-enter-active, .fade-leave-active, .overlay-fade-enter-active, .overlay-fade-leave-active, .tooltip-fade-enter-active, .tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to, .overlay-fade-enter-from, .overlay-fade-leave-to, .tooltip-fade-enter-from, .tooltip-fade-leave-to {
  opacity: 0;
}
</style>