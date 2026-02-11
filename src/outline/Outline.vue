<template>
  <!-- ======================================================================= -->
  <!-- 主 UI 容器，负责整体布局、拖拽和折叠/展开状态                         -->
  <!-- ======================================================================= -->
  <div ref="containerRef" :style="containerStyle" :class="[
    'fixed z-[9999] overflow-hidden',
    'transition-[width,height,border-radius] duration-250 ease-[cubic-bezier(0.4, 0, 0.2, 1)]',
    'bg-white/85 dark:bg-[#202127]/90 backdrop-blur-xl',
    'border border-gray-200/50 dark:border-white/20',
    isCollapsed
      ? 'w-[56px] h-[56px] rounded-full cursor-grab active:cursor-grabbing is-collapsed'
      : 'w-[340px] max-h-[min(80vh,800px)] rounded-2xl shadow-2xl flex flex-col',
    isMounted ? 'opacity-100' : 'opacity-0'
  ]" @mousedown="handleDragStart" @touchstart.passive="handleDragStart" @mouseenter="isContainerHovered = true"
    @mouseleave="isContainerHovered = false">
    <!-- 头部区域：包含标题和控制按钮 -->
    <div :class="[
      'relative flex-shrink-0 transition-all duration-300',
      isCollapsed
        ? 'h-full w-full flex items-center justify-center p-0 cursor-pointer group'
        : 'h-[60px] px-5 flex items-center justify-between border-b border-gray-200/50 dark:border-white/15 bg-gray-50/50 dark:bg-white/[0.02]'
    ]" @click="handleHeaderClick">
      <!-- ... 头部内容 ... -->
      <div class="flex items-center gap-3 overflow-hidden">
        <span :class="[
          ICONS.title,
          'text-xl text-gray-700/100 dark:text-white/100 transition-transform duration-300 flex-shrink-0',
          isCollapsed && isContainerHovered ? 'scale-110 -rotate-12' : '',
          isCollapsed ? 'text-2xl' : ''
        ]"></span>
        <Transition name="content-bloom">
          <h3 v-show="!isCollapsed"
            class="font-semibold text-gray-800/100 dark:text-white/100 text-[15px] tracking-wide whitespace-nowrap">
            {{ t('content.outline.title') }}
          </h3>
        </Transition>
      </div>
      <Transition name="content-bloom">
        <div v-show="!isCollapsed" class="flex items-center gap-1">
          <div class="relative group/btn">
            <button @click.stop="handleRefresh" class="control-btn text-gray-500 dark:text-white/90"
              aria-label="Refresh">
              <span :class="[
                ICONS.refresh,
                'text-lg transition-transform duration-700',
                isRefreshing ? 'animate-spin-fast' : ''
              ]"></span>
            </button>
            <ElegantTooltip :text="t('common.refresh')" />
          </div>
          <div class="relative group/btn">
            <button @click.stop="toggleCollapse"
              class="control-btn text-gray-500 dark:text-white/90 hover:text-blue-500 dark:hover:text-blue-400">
              <span :class="[ICONS.collapse, 'text-lg']"></span>
            </button>
            <ElegantTooltip :text="t('common.collapse')" />
          </div>
        </div>
      </Transition>
    </div>

    <!-- 内容区域：包含搜索、列表和统计信息 -->
    <Transition name="content-bloom">
      <div v-show="!isCollapsed" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
        <!-- 搜索框 -->
        <div class="px-4 py-3 flex-shrink-0">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <span :class="[ICONS.search, 'text-gray-400 dark:text-white/80 text-sm']"></span>
            </div>
            <input v-model="searchQuery" :placeholder="t('content.outline.searchPlaceholder')"
              class="w-full pl-10 pr-3 py-2 text-sm bg-gray-100/70 dark:bg-white/5 border border-transparent dark:border-white/15 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-blue-500/50 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-700 dark:text-white placeholder-gray-400/80 dark:placeholder-white/70" />
          </div>
        </div>

        <!-- 列表区域 -->
        <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar" ref="listContainerRef">
          <TransitionGroup name="list-item" tag="ul" class="space-y-1" :key="listKey">
            <li v-for="(item, index) in filteredItems" :key="item.id" :data-index="index"
              :style="{ '--stagger-index': index }" class="outline-item-wrapper group"
              :class="{ 'is-active': index === highlightedIndex }" @click="handleItemClick($event, item.element, index)"
              @mousemove="handleItemHover($event, index)" @mouseleave="handleItemLeave(item.element)"
              @mouseenter="handleItemMouseEnter(item.element)">
              <div class="outline-item-content">
                <span class="item-index text-gray-400/80 dark:text-white/70">{{
                  index + 1
                  }}</span>
                <span class="item-icon transition-all duration-200" :class="[
                  getDisplayIcon(item, index),
                  hoveredItem.index === index
                    ? 'text-blue-500/100 scale-110'
                    : 'text-gray-400 dark:text-white/80 group-hover:text-gray-600/100 dark:group-hover:text-white/100'
                ]"></span>
                <span
                  class="item-title truncate text-gray-700/100 dark:text-white/100 group-[.is-active]:text-blue-700/100 dark:group-[.is-active]:text-white/100 group-[.is-active]:font-semibold"
                  :title="item.title">
                  {{ item.title }}
                </span>
              </div>
            </li>
          </TransitionGroup>
          <Transition name="fade">
            <div v-if="isLoading && filteredItems.length === 0"
              class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-white/80">
              <span class="i-ph-circle-notch-bold text-2xl mb-3 opacity-60 animate-spin"></span>
              <p class="text-sm font-medium">
                {{ t('content.outline.loading') }}
              </p>
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="!isLoading && filteredItems.length === 0"
              class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-white/80">
              <span :class="[ICONS.empty, 'text-4xl mb-3 opacity-50']"></span>
              <p class="text-sm font-medium">
                {{ t('content.outline.empty') }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- 统计信息底部栏 -->
        <div
          class="px-4 py-2 text-[11px] text-center text-gray-400 dark:text-white/70 border-t border-gray-200/50 dark:border-white/15 flex-shrink-0 bg-gray-50/30 dark:bg-transparent backdrop-blur-sm">
          {{ stats }}
        </div>
      </div>
    </Transition>
  </div>

  <!-- 全局提示 -->
  <Transition name="overlay-fade">
    <div v-if="hint.visible"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] pointer-events-none">
      <div
        class="bg-gray-900/85 dark:bg-black/85 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 transform scale-100 animate-pop-in"
        style="color: #fff !important">
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
const containerRef = ref<HTMLElement | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)
const targetRef = ref<HTMLElement | null>(null)

const isCollapsed = ref(false)
const isContainerHovered = ref(false)
const isRefreshing = ref(false)
const listKey = ref(0)
const isMounted = ref(false)
const searchQuery = ref('')
const wasDragged = ref(false)

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

// --- 生命周期钩子 ---
onMounted(async () => {
  await nextTick()
  isMounted.value = true
  containerRef.value?.classList.add('animate-slide-in-right')
  injectGlobalStyles()
})

// --- 核心大纲逻辑 ---
const {
  items,
  highlightedIndex,
  updateItems: baseUpdateItems,
  isLoading
} = useOutline(props.config, targetRef)

// --- 拖拽功能 ---
const { y: dragY, isDragging } = useDraggable(containerRef, {
  initialValue: { x: 0, y: 100 },
  preventDefault: true,
  disabled: computed(() => !isCollapsed.value),
  onStart: () => {
    wasDragged.value = false
  },
  onMove(p) {
    wasDragged.value = true
    p.y = Math.max(20, Math.min(p.y, windowHeight.value - 80))
  }
})

const containerStyle = computed<CSSProperties>(() => ({
  top: `${dragY.value}px`,
  right: '24px',
  transition: isDragging.value ? 'none' : undefined,
  transform: isDragging.value ? 'scale(1.05)' : 'scale(1)',
  zIndex: 9999
}))

// --- UI交互处理函数 ---

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
  if (wasDragged.value) return
  if (isCollapsed.value) toggleCollapse()
}

async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  listKey.value++
  try {
    await baseUpdateItems()
  } finally {
    isRefreshing.value = false
  }
}

// --- 数据处理与计算属性 ---
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q))
})

const stats = computed(() => {
  const total = items.value.length
  const visible = filteredItems.value.length
  if (isLoading.value) return t('common.loading')
  if (total === 0) return t('content.outline.empty')
  if (!searchQuery.value) return t('content.outline.total', { count: total })
  return t('content.outline.filtered', { visible, total })
})

// --- 三段式悬停交互 ---

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
        text = t('content.outline.scrollToTop'); icon = ICONS.scrollUp; break;
      case 'center':
        text = t('content.outline.scrollToCenter'); icon = ICONS.scrollCenter; break;
      case 'end':
        text = t('content.outline.scrollToBottom'); icon = ICONS.scrollDown; break;
    }
    if (hintTimeout) clearTimeout(hintTimeout)
    hintTimeout = window.setTimeout(() => {
      hint.value = { visible: true, text, icon }
    }, 50)
  }
}


/**
 * 处理大纲条目的点击事件
 * 核心功能：计算目标位置并平滑滚动到该位置，同时处理 UI 高亮
 */
async function handleItemClick(event: MouseEvent, element: Element, index: number) {
  // 立即更新当前高亮的索引，让 UI 迅速响应用户的点击
  highlightedIndex.value = index;

  // 获取配置中的自定义滚动容器（如果存在）
  const scrollContainerSelector = props.config.scrollContainer;
  let scrollContainer: HTMLElement | null = null;
  if (typeof scrollContainerSelector === 'string') {
    scrollContainer = document.querySelector<HTMLElement>(scrollContainerSelector);
  }

  // --- 核心滚动逻辑 ---
  if (scrollContainer) {
    // 场景 A：存在特定的滚动容器（如 Kimi 等复杂单页应用）
    // 策略：使用 JavaScript 手动实现平滑滚动动画。
    // 原因：部分网站会监听或劫持原生的 scroll 事件，导致 element.scrollIntoView() 失效或表现异常。
    //       手动接管 scrollTop 的更新过程可以绕过这些干扰，提供最稳定的滚动体验。

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // 1. 精确计算滚动目标位置
    // 根据用户点击在大纲项上的不同区域（上/中/下），决定元素在视口中的最终停留位置
    const zone = getHoverZone(event);
    let blockPositionOffset = 0; 
    if (zone === 'center') {
      // 目标：让元素在容器中居中显示
      blockPositionOffset = containerRect.height / 2 - elementRect.height / 2;
    } else if (zone === 'end') {
      // 目标：让元素显示在容器底部
      blockPositionOffset = containerRect.height - elementRect.height;
    }
    // 默认情况（zone === 'start'）偏移量为 0，即显示在容器顶部
    
    // 计算最终的 scrollTop 值：当前滚动位置 + 相对距离 - 期望的视口偏移
    const targetScrollTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - blockPositionOffset;

    // 2. 启动手动动画循环
    const startScrollTop = scrollContainer.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 400; // 动画总时长（毫秒），400ms 提供较好的流畅感
    let startTime: number | null = null;

    // 缓动函数 (Ease-In-Out Quad)：让滚动开始和结束时速度较慢，中间较快，体验更自然
    const easeInOutQuad = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    // 动画帧回调函数
    const animateScroll = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }
      // 计算动画已进行的时间和进度（0.0 ~ 1.0）
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutQuad(progress);

      // 更新容器的滚动位置
      scrollContainer!.scrollTop = startScrollTop + distance * easedProgress;

      // 如果动画未结束，请求下一帧继续执行
      if (timeElapsed < duration) {
        requestAnimationFrame(animateScroll);
      }
    };

    // 开始执行动画
    requestAnimationFrame(animateScroll);

  } else {
    // 场景 B：普通网站（无特定滚动容器）
    // 策略：直接使用浏览器原生的 scrollIntoView API，简单且兼容性好
    const zone = getHoverZone(event);
    // 将 hover 区域映射为 scrollIntoView 的 block 参数 ('start' | 'center' | 'end')
    const block = (zone === '' ? 'center' : zone) as ScrollLogicalPosition;
    element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });
  }

  // --- 点击后的视觉反馈 ---
  // 移除旧的闪烁效果，确保每次点击都能触发新的动画
  document.querySelectorAll('.outline-flash-highlight').forEach(el => el.classList.remove('outline-flash-highlight'));
  
  // 为目标元素添加一次性的闪烁高亮类，帮助用户快速定位
  element.classList.add('outline-flash-highlight');
  
  // 设置定时器在动画结束后移除高亮类，保持页面整洁
  if (highlightTimeout) clearTimeout(highlightTimeout);
  highlightTimeout = window.setTimeout(() => {
    element.classList.remove('outline-flash-highlight');
  }, 2000);

  // 隐藏操作提示，避免遮挡视线
  hint.value.visible = false;
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
    document.querySelectorAll('.outline-hover-highlight').forEach(el => el.classList.remove('outline-hover-highlight'))
  }
}

// --- 观察器 ---
watch(highlightedIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined && oldIndex >= 0 && items.value[oldIndex]) {
    items.value[oldIndex].element?.classList.remove('outline-active-highlight')
  }
  if (newIndex !== undefined && newIndex >= 0 && items.value[newIndex]) {
    items.value[newIndex].element?.classList.add('outline-active-highlight')
  }

  if (newIndex >= 0 && listContainerRef.value && !isCollapsed.value) {
    const el = listContainerRef.value.querySelector(`[data-index="${newIndex}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

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

onUnmounted(() => {
  if (hintTimeout) clearTimeout(hintTimeout)
  if (highlightTimeout) clearTimeout(highlightTimeout)
})

// --- 内部微型组件 & 样式注入 ---
import { defineComponent, h, Transition } from 'vue'

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

function injectGlobalStyles() {
  const STYLE_ID = 'outline-component-global-styles'
  if (document.getElementById(STYLE_ID)) return

  const css = `
    .outline-hover-highlight {
      position: relative; 
      outline: 2px solid rgba(59, 130, 246, 0.4);
      outline-offset: 4px;
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 8px;
      transition: outline 0.2s ease-out, background-color 0.2s ease-out;
    }
    .outline-active-highlight {
      position: relative;
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

/* 大纲列表项样式 */
.outline-item-wrapper {
  @apply relative px-2 py-1 rounded-xl cursor-pointer transition-all duration-200;

  /*    * ★ 关键修改 1: 
   * 默认添加 3px 宽的透明左边框。
   * 'transition-all' 会自动包含 'border-color' 的过渡。
   */
  @apply border-l-[3px] border-l-transparent;

  will-change: transform, background-color, border-color;
}

.outline-item-wrapper:hover {
  transform: translateY(-2px);
  @apply bg-gray-100/80 dark:bg-gray-800/50;
}

.outline-item-wrapper.is-active {
  @apply bg-blue-50/80 dark:bg-blue-900/20;
  @apply border-l-blue-500/80;
  @apply dark:border-l-gray-200/60;
}

.outline-item-wrapper.is-active:hover {
  transform: translateY(-2px) scale(1.02);
}

.outline-item-wrapper:active {
  transform: scale(0.97);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.outline-item-content {
  @apply flex items-center gap-2.5 py-1.5;
}

.item-index {
  @apply text-[10px] font-mono min-w-[16px] text-center;
}

.item-icon {
  @apply text-base w-5 h-5 flex items-center justify-center flex-shrink-0;
}

.item-title {
  @apply text-[13px] font-medium leading-snug;
}

.is-collapsed {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dark .is-collapsed {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
}

.is-collapsed:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 169, 255, 0.3);
}

.is-collapsed:active {
  transform: scale(1.05);
}

/* -------------------- */
/*      动画效果        */
/* -------------------- */

/* 刷新图标旋转动画 */
@keyframes spin-fast {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-fast {
  animation: spin-fast 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* 容器初始滑入动画 */
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

/* 全局提示弹出动画 */
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

/* 内容区域展开/折叠动画 */
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

/* 列表项动画 */
.list-item-enter-active,
.list-item-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item-enter-active {
  transition-delay: calc(0.02s * var(--stagger-index, 0));
}

.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.list-item-leave-active {
  position: absolute;
  width: calc(100% - 1.5rem);
}

/* 通用淡入淡出过渡效果 */
.fade-enter-active,
.fade-leave-active,
.overlay-fade-enter-active,
.overlay-fade-leave-active,
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to,
.overlay-fade-enter-from,
.overlay-fade-leave-to,
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>