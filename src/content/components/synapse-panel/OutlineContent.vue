<template>
  <div class="outline-content">
    <!-- 搜索框 -->
    <div class="px-4 py-3 flex-shrink-0">
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
    <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar" ref="listContainerRef">
      <TransitionGroup name="list-item" tag="ul" class="space-y-1" :key="listKey">
        <li
          v-for="(item, index) in filteredItems"
          :key="item.id"
          :data-index="index"
          :style="{ '--stagger-index': index }"
          class="outline-item-wrapper group"
          :class="{ 'is-active': index === highlightedIndex }"
          @click="handleItemClick($event, item.element, index)"
          @mousemove="handleItemHover($event, index)"
          @mouseleave="handleItemLeave(item.element)"
          @mouseenter="handleItemMouseEnter(item.element)"
        >
          <div class="outline-item-content">
            <span class="item-index text-gray-400/80 dark:text-white/70">{{ index + 1 }}</span>
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
import { useOutline } from '@/outline/useOutline'
import type { SiteConfig } from '@/outline/site-configs'

// 图标常量
const ICONS = {
  scrollUp: 'i-ph-arrow-up-bold',
  scrollCenter: 'i-ph-crosshair-bold',
  scrollDown: 'i-ph-arrow-down-bold',
}

const props = defineProps<{
  config: SiteConfig
}>()

const emit = defineEmits<{
  hint: [data: { text: string; icon: string }]
  'refresh-request': []
}>()

const { t } = useI18n()
const targetRef = ref<HTMLElement | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const listKey = ref(0)

// 三段式悬停状态
type HoverZone = 'start' | 'center' | 'end' | ''
const hoveredItem = ref<{ index: number; zone: HoverZone }>({ index: -1, zone: '' })
let hintTimeout: number | null = null
let highlightTimeout: number | null = null

// 大纲逻辑
const {
  items,
  highlightedIndex,
  updateItems: baseUpdateItems,
  isLoading,
} = useOutline(props.config, targetRef)

// 过滤
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q))
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
  if (hintTimeout) clearTimeout(hintTimeout)
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

function handleItemClick(event: MouseEvent, element: Element, index: number) {
  highlightedIndex.value = index

  const scrollContainerSelector = props.config.scrollContainer
  let scrollContainer: HTMLElement | null = null
  if (typeof scrollContainerSelector === 'string') {
    scrollContainer = document.querySelector<HTMLElement>(scrollContainerSelector)
  }

  if (scrollContainer) {
    // 手动平滑滚动（绕过网站劫持）
    const containerRect = scrollContainer.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const zone = getHoverZone(event)

    let blockPositionOffset = 0
    if (zone === 'center') {
      blockPositionOffset = containerRect.height / 2 - elementRect.height / 2
    } else if (zone === 'end') {
      blockPositionOffset = containerRect.height - elementRect.height
    }

    const targetScrollTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - blockPositionOffset
    const startScrollTop = scrollContainer.scrollTop
    const distance = targetScrollTop - startScrollTop
    const duration = 400
    let startTime: number | null = null

    const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      scrollContainer!.scrollTop = startScrollTop + distance * easeInOutQuad(progress)
      if (timeElapsed < duration) requestAnimationFrame(animateScroll)
    }

    requestAnimationFrame(animateScroll)
  } else {
    // 原生 scrollIntoView
    const zone = getHoverZone(event)
    const block = (zone === '' ? 'center' : zone) as ScrollLogicalPosition
    element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' })
  }

  // 闪烁高亮
  document.querySelectorAll('.outline-flash-highlight').forEach(el => el.classList.remove('outline-flash-highlight'))
  element.classList.add('outline-flash-highlight')
  if (highlightTimeout) clearTimeout(highlightTimeout)
  highlightTimeout = window.setTimeout(() => {
    element.classList.remove('outline-flash-highlight')
  }, 2000)

  // 隐藏 hint
  emit('hint', { text: '', icon: '' })
}

// --- 图标显示（三段式动态图标） ---

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

// --- 高亮索引变化时更新目标元素样式 ---
watch(highlightedIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined && oldIndex >= 0 && items.value[oldIndex]) {
    items.value[oldIndex].element?.classList.remove('outline-active-highlight')
  }
  if (newIndex !== undefined && newIndex >= 0 && items.value[newIndex]) {
    items.value[newIndex].element?.classList.add('outline-active-highlight')
  }

  // 自动滚动列表到当前高亮项
  if (newIndex >= 0 && listContainerRef.value) {
    const el = listContainerRef.value.querySelector(`[data-index="${newIndex}"]`)
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
  if (hintTimeout) clearTimeout(hintTimeout)
  if (highlightTimeout) clearTimeout(highlightTimeout)
  // 清理所有高亮
  document.querySelectorAll('.outline-hover-highlight, .outline-active-highlight').forEach(el => {
    el.classList.remove('outline-hover-highlight', 'outline-active-highlight')
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
