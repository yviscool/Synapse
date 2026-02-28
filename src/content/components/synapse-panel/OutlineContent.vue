<template>
  <div class="outline-content" :class="{ 'is-compact': hideSearch }">
    <!-- 搜索框 -->
    <div v-if="!hideSearch" class="px-4 py-3 flex-shrink-0">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <span class="i-ph-magnifying-glass-bold text-gray-400 dark:text-white/80 text-sm"></span>
        </div>
        <input
          v-model="searchQuery"
          :placeholder="t('content.outline.searchPlaceholder')"
          class="w-full pl-10 pr-3 py-2 text-sm bg-gray-100/70 dark:bg-white/5 border border-transparent dark:border-white/15 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-blue-500/50 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-700 dark:text-white placeholder-gray-400/80 dark:placeholder-white/70"
        />
      </div>
    </div>

    <!-- 列表区域 -->
    <div
      v-if="hideSearch"
      class="mx-3 mt-3 mb-1 px-3 py-2 rounded-xl border border-slate-200/80 bg-slate-50/85 dark:border-slate-600/40 dark:bg-slate-800/65 flex items-center justify-between gap-2 flex-shrink-0"
    >
      <span class="rail-compact-title text-[11px] font-semibold tracking-[0.08em] uppercase">
        {{ t('content.outline.railTitle') }}
      </span>
      <span class="rail-compact-count inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md text-[11px] font-semibold">
        {{ filteredItems.length }}
      </span>
    </div>

    <div
      ref="listContainerRef"
      class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar"
      :class="{ 'pt-1': hideSearch }"
    >
      <TransitionGroup name="list-item" tag="ul" class="space-y-1" :key="listKey">
        <li
          v-for="(item, index) in filteredItems"
          :key="item.id"
          :data-index="index"
          :data-source-index="getSourceIndex(item)"
          :style="{ '--stagger-index': index }"
          class="outline-item-wrapper group"
          :class="{ 'is-active': getSourceIndex(item) === highlightedIndex }"
          @click="handleItemClick($event, item.element, getSourceIndex(item))"
          @mousemove="handleItemHover($event, getSourceIndex(item))"
          @mouseleave="handleItemLeave(item.element)"
          @mouseenter="handleItemMouseEnter(item.element)"
        >
          <div class="outline-item-content">
            <span class="item-index">{{ index + 1 }}</span>
            <span
              class="item-icon transition-all duration-200"
              :class="[
                getDisplayIcon(item, index),
                hoveredItem.index === getSourceIndex(item)
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

      <!-- 加载状态 -->
      <Transition name="fade">
        <div
          v-if="isLoading && filteredItems.length === 0"
          class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-white/80"
        >
          <span class="i-ph-circle-notch-bold text-2xl mb-3 opacity-60 animate-spin"></span>
          <p class="text-sm font-medium">{{ t('content.outline.loading') }}</p>
        </div>
      </Transition>

      <!-- 空状态 -->
      <Transition name="fade">
        <div
          v-if="!isLoading && filteredItems.length === 0"
          class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-white/80"
        >
          <span class="i-ph-chat-teardrop-dots-light text-4xl mb-3 opacity-50"></span>
          <p class="text-sm font-medium">{{ t('content.outline.empty') }}</p>
        </div>
      </Transition>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOutline } from '@/content/outline/useOutline'
import type { OutlineEngine } from '@/content/outline/useOutline'
import type { SiteConfig } from '@/content/site-configs'
import { flashOutlineHighlight, scrollToOutlineElement } from './useOutlineJump'

// 图标常量
const ICONS = {
  scrollUp: 'i-ph-arrow-up-bold',
  scrollCenter: 'i-ph-crosshair-bold',
  scrollDown: 'i-ph-arrow-down-bold',
}
const START_ALIGN_TOP_OFFSET = 80

const props = defineProps<{
  config: SiteConfig
  hideSearch?: boolean
  outlineState?: OutlineEngine
}>()

const emit = defineEmits<{
  hint: [data: { text: string; icon: string }]
  'refresh-request': []
  'active-change': [sourceIndex: number]
}>()

const { t } = useI18n()
const listContainerRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const listKey = ref(0)
const hideSearch = computed(() => !!props.hideSearch)

// 三段式悬停状态
type HoverZone = 'start' | 'center' | 'end' | ''
const hoveredItem = ref<{ index: number; zone: HoverZone }>({ index: -1, zone: '' })

// 大纲逻辑：允许复用外部状态（用于 Rail 与面板共用同一套 Observer）
const internalTargetRef = ref<HTMLElement | null>(null)
const outlineState = props.outlineState ?? useOutline(props.config, internalTargetRef)

const {
  items,
  highlightedIndex,
  updateItems: baseUpdateItems,
  isLoading,
  lockHighlightDuringProgrammaticScroll,
} = outlineState

// 过滤
const filteredItems = computed(() => {
  if (hideSearch.value || !searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q))
})

function getSourceIndex(item: (typeof items.value)[number]): number {
  if (typeof item.id === 'number') return item.id
  return items.value.findIndex(i => i === item)
}


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

function handleItemHover(event: MouseEvent, sourceIndex: number) {
  const zone = getHoverZone(event)
  if (hoveredItem.value.index !== sourceIndex || hoveredItem.value.zone !== zone) {
    hoveredItem.value = { index: sourceIndex, zone }
    let text = '', icon = ''
    switch (zone) {
      case 'start':
        text = t('content.outline.scrollToTop'); icon = ICONS.scrollUp; break
      case 'center':
        text = t('content.outline.scrollToCenter'); icon = ICONS.scrollCenter; break
      case 'end':
        text = t('content.outline.scrollToBottom'); icon = ICONS.scrollDown; break
    }
    emit('hint', { text, icon })
  }
}

function handleItemLeave(element: Element | null = null) {
  hoveredItem.value = { index: -1, zone: '' }
  // 通知父组件隐藏 hint
  emit('hint', { text: '', icon: '' })
  if (element) {
    element.classList.remove('outline-hover-highlight')
  } else {
    document.querySelectorAll('.outline-hover-highlight').forEach(el => el.classList.remove('outline-hover-highlight'))
  }
}

function handleItemMouseEnter(element: Element | null) {
  if (element) {
    element.classList.add('outline-hover-highlight')
  }
}

// --- 点击滚动（含三段式定位） ---

function handleItemClick(event: MouseEvent, element: Element, sourceIndex: number) {
  highlightedIndex.value = sourceIndex
  lockHighlightDuringProgrammaticScroll(sourceIndex, 900)
  emit('active-change', sourceIndex)

  const zone = getHoverZone(event)
  const align = (zone === '' ? 'center' : zone) as 'start' | 'center' | 'end'
  scrollToOutlineElement(element, {
    scrollContainer: props.config.scrollContainer,
    align,
    topOffset: align === 'start' ? START_ALIGN_TOP_OFFSET : 0,
    durationMs: 400,
  })

  flashOutlineHighlight(element, 2000)

  // 隐藏 hint
  emit('hint', { text: '', icon: '' })
}

// --- 图标显示（三段式动态图标） ---

function getDisplayIcon(item: (typeof items.value)[0], index: number): string {
  const sourceIndex = getSourceIndex(item)
  if (hoveredItem.value.index === sourceIndex && hoveredItem.value.zone) {
    switch (hoveredItem.value.zone) {
      case 'start': return ICONS.scrollUp
      case 'center': return ICONS.scrollCenter
      case 'end': return ICONS.scrollDown
    }
  }
  return item.icon
}

// --- 高亮索引变化时更新目标元素样式 ---
watch(highlightedIndex, (newIndex, oldIndex) => {
  if (newIndex !== undefined && newIndex >= 0) {
    emit('active-change', newIndex)
  }

  if (oldIndex !== undefined && oldIndex >= 0 && items.value[oldIndex]) {
    items.value[oldIndex].element?.classList.remove('outline-active-highlight')
  }
  if (newIndex !== undefined && newIndex >= 0 && items.value[newIndex]) {
    items.value[newIndex].element?.classList.add('outline-active-highlight')
  }

  // 自动滚动列表到当前高亮项
  if (newIndex >= 0 && listContainerRef.value) {
    const el = listContainerRef.value.querySelector(`[data-source-index="${newIndex}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

// 暴露刷新方法供父组件调用
async function refresh() {
  listKey.value++
  await baseUpdateItems()
}

defineExpose({ refresh })

onUnmounted(() => {
  // 清理所有高亮
  document.querySelectorAll('.outline-hover-highlight, .outline-active-highlight, .outline-flash-highlight').forEach(el => {
    el.classList.remove('outline-hover-highlight', 'outline-active-highlight', 'outline-flash-highlight')
  })
})
</script>

<style scoped>
.outline-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(80vh - 120px);
}

/* 自定义滚动条 */
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

/* 大纲列表项 */
.outline-item-wrapper {
  @apply relative px-2 py-1 rounded-xl cursor-pointer transition-all duration-200;
  @apply border-l-[3px] border-l-transparent;
  will-change: transform, background-color, border-color;
}

.outline-item-wrapper:hover {
  transform: translateY(-2px);
  @apply bg-gray-100/80 dark:bg-gray-800/50;
}

.outline-item-wrapper.is-active {
  @apply bg-blue-50/80 dark:bg-blue-900/20;
  @apply border-l-blue-500/80 dark:border-l-gray-200/60;
}

.outline-item-wrapper.is-active:hover {
  transform: translateY(-2px) scale(1.02);
}

.outline-item-wrapper:active {
  transform: scale(0.97);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.outline-content.is-compact .outline-item-wrapper {
  @apply rounded-lg;
}

.outline-content.is-compact .outline-item-wrapper:hover {
  transform: translateY(-1px);
}

.outline-content.is-compact .outline-item-wrapper.is-active:hover {
  transform: translateY(-1px);
}

.outline-item-content {
  @apply flex items-center gap-2.5 py-1.5;
}

.item-index {
  @apply text-[10px] font-mono min-w-[16px] text-center;
  color: rgba(100, 116, 139, 0.9);
}

:global(.dark .outline-content .item-index) {
  color: rgba(226, 232, 240, 0.88);
}

.rail-compact-title {
  color: rgba(100, 116, 139, 0.92);
}

.rail-compact-count {
  color: rgba(100, 116, 139, 0.95);
  background-color: rgba(255, 255, 255, 0.75);
}

:global(.dark .outline-content .rail-compact-title) {
  color: rgba(226, 232, 240, 0.9);
}

:global(.dark .outline-content .rail-compact-count) {
  color: rgba(226, 232, 240, 0.95);
  background-color: rgba(51, 65, 85, 0.75);
}

.item-icon {
  @apply text-base w-5 h-5 flex items-center justify-center flex-shrink-0;
}

.item-title {
  @apply text-[13px] font-medium leading-snug;
}

/* 列表项 stagger 入场动画 */
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

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
