<template>
  <div
    ref="railRootRef"
    class="sp-outline-rail fixed right-0 z-[9998]"
    :style="railStyle"
    @mouseenter="handleRailEnter"
    @mouseleave="handleRailLeave"
  >
    <ul ref="railListRef" class="sp-outline-rail-list">
      <li
        v-for="step in railItems"
        :key="step.sourceIndex"
        class="sp-outline-step-wrapper"
      >
        <button
          type="button"
          class="sp-outline-step"
          @mouseenter="handleRailHover(step)"
          @mouseleave="handleStepLeave"
          @click="handleStepClick(step)"
        >
          <span
            class="sp-outline-step-bar"
            :class="{
              'is-active': step.sourceIndex === activeRailSourceIndex,
              'is-hovered': hoveredIndex === step.sourceIndex,
            }"
            :style="getBarStyle(step.sourceIndex)"
          ></span>
        </button>
      </li>
    </ul>
  </div>

  <Transition name="rail-panel">
    <aside
      v-show="isExpanded"
      class="sp-outline-rail-panel fixed w-[320px] max-h-[80vh] z-[9998]"
      :style="panelStyle"
      @mouseenter="handleRailEnter"
      @mouseleave="handleRailLeave"
    >
      <div class="rail-panel-shell rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl overflow-hidden dark:border-white/10 dark:bg-[#0f172a]/90 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
        <OutlineContent
          :config="config"
          :hide-search="true"
          @hint="forwardHint"
          @active-change="handleOutlineActiveChange"
        />
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useOutline } from '@/content/outline/useOutline'
import type { SiteConfig } from '@/content/site-configs'
import type { OutlineItem } from '@/content/outline/types'
import OutlineContent from './OutlineContent.vue'

const MAX_RAIL_STEPS = 12

type RailStep = {
  sourceIndex: number
  item: OutlineItem
}

const props = defineProps<{
  config: SiteConfig
}>()

const emit = defineEmits<{
  hint: [data: { text: string; icon: string }]
}>()

const targetRef = ref<HTMLElement | null>(null)
const { items, highlightedIndex, lockHighlightDuringProgrammaticScroll } = useOutline(props.config, targetRef)
const isExpanded = ref(false)
const hoveredIndex = ref<number>(-1)
const railRootRef = ref<HTMLElement | null>(null)
const railListRef = ref<HTMLElement | null>(null)
const panelRight = ref<number>(32)

let collapseTimer: number | null = null
let highlightTimer: number | null = null
let hoveredElement: Element | null = null

const anchorIndex = computed(() => {
  const total = items.value.length
  if (total === 0) return -1
  if (highlightedIndex.value >= 0 && highlightedIndex.value < total) {
    return highlightedIndex.value
  }
  return total - 1
})

const railItems = computed<RailStep[]>(() => {
  const total = items.value.length
  if (total === 0) return []

  let start = 0
  let end = total - 1

  if (total > MAX_RAIL_STEPS) {
    const halfWindow = Math.floor(MAX_RAIL_STEPS / 2)
    start = anchorIndex.value - halfWindow
    start = Math.max(0, Math.min(start, total - MAX_RAIL_STEPS))
    end = start + MAX_RAIL_STEPS - 1
  }

  const result: RailStep[] = []
  for (let i = start; i <= end; i++) {
    const item = items.value[i]
    if (!item) continue
    result.push({ sourceIndex: i, item })
  }
  return result
})

const activeRailSourceIndex = computed(() => {
  if (railItems.value.length === 0) return -1
  if (highlightedIndex.value >= 0 && highlightedIndex.value < items.value.length) {
    return highlightedIndex.value
  }
  return railItems.value[railItems.value.length - 1].sourceIndex
})

const panelStyle = computed(() => ({
  top: '50vh',
  transform: 'translateY(-50%)',
  right: `${panelRight.value}px`,
}))

const railStyle = computed(() => ({
  top: '50vh',
  transform: 'translateY(-50%)',
}))

// Apple Dock-like magnetic scaling effect
function getBarStyle(index: number) {
  const focusIndex = hoveredIndex.value !== -1 ? hoveredIndex.value : activeRailSourceIndex.value
  if (focusIndex === -1) return {}

  const distance = Math.abs(index - focusIndex)
  
  let width = 6
  let opacity = 0.35
  
  if (distance === 0) {
    width = 24
    opacity = 1
  } else if (distance === 1) {
    width = 16
    opacity = 0.7
  } else if (distance === 2) {
    width = 10
    opacity = 0.5
  }

  return {
    width: `${width}px`,
    opacity: opacity,
  }
}

function updatePanelPosition() {
  const target = railListRef.value || railRootRef.value
  if (!target) return
  const rect = target.getBoundingClientRect()
  panelRight.value = Math.max(20, window.innerWidth - rect.left + 24)
}

function clearHoveredElement() {
  if (hoveredElement) {
    hoveredElement.classList.remove('outline-hover-highlight')
    hoveredElement = null
  }
}

function setHoveredElement(element: Element | null) {
  if (hoveredElement && hoveredElement !== element) {
    hoveredElement.classList.remove('outline-hover-highlight')
  }
  hoveredElement = element
  if (hoveredElement) {
    hoveredElement.classList.add('outline-hover-highlight')
  }
}

function forwardHint(data: { text: string; icon: string }) {
  emit('hint', data)
}

function handleRailEnter() {
  if (collapseTimer) clearTimeout(collapseTimer)
  isExpanded.value = true
  void nextTick(() => {
    updatePanelPosition()
  })
}

function handleRailLeave() {
  if (collapseTimer) clearTimeout(collapseTimer)
  collapseTimer = window.setTimeout(() => {
    isExpanded.value = false
    hoveredIndex.value = -1
    clearHoveredElement()
    emit('hint', { text: '', icon: '' })
  }, 250) // More relaxed exit timing
}

function handleRailHover(step: RailStep) {
  hoveredIndex.value = step.sourceIndex
  setHoveredElement(step.item.element ?? null)
  emit('hint', { text: '', icon: '' }) // Clear any lingering hints immediately, let the design speak
}

function handleStepLeave() {
  hoveredIndex.value = -1
  clearHoveredElement()
}

// Fluid, spring-like scroll to optimum reading position
function scrollToElement(element: Element) {
  const scrollContainerSelector = props.config.scrollContainer
  let scrollContainer: HTMLElement | null = null
  if (typeof scrollContainerSelector === 'string') {
    scrollContainer = document.querySelector<HTMLElement>(scrollContainerSelector)
  }

  // Visual breathing room from the top of the viewport
  const topOffset = 80 
  
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    const targetScrollTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - topOffset
    const startScrollTop = scrollContainer.scrollTop
    const distance = targetScrollTop - startScrollTop
    
    // Physics-inspired ease (easeInOutExpo)
    const duration = 600
    let startTime: number | null = null

    const ease = (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2

    const animate = (time: number) => {
      if (startTime === null) startTime = time
      const progress = Math.min((time - startTime) / duration, 1)
      scrollContainer!.scrollTop = startScrollTop + distance * ease(progress)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
    return
  }

  // Fallback to window scrolling with natural top padding
  const elementRect = element.getBoundingClientRect()
  const absoluteElementTop = elementRect.top + window.scrollY
  window.scrollTo({
    top: absoluteElementTop - topOffset,
    behavior: 'smooth'
  })
}

function handleStepClick(step: RailStep) {
  highlightedIndex.value = step.sourceIndex
  lockHighlightDuringProgrammaticScroll(step.sourceIndex, 900)
  scrollToElement(step.item.element)
  
  // Clear hints on click to keep UI pristine
  emit('hint', { text: '', icon: '' })

  // Magical ripple highlight that guides the eye
  document.querySelectorAll('.outline-flash-highlight').forEach(el => el.classList.remove('outline-flash-highlight'))
  
  // Force browser reflow to reliably restart animation
  if (step.item.element instanceof HTMLElement) {
    void step.item.element.offsetWidth
  }
  step.item.element.classList.add('outline-flash-highlight')

  if (highlightTimer) clearTimeout(highlightTimer)
  highlightTimer = window.setTimeout(() => {
    step.item.element.classList.remove('outline-flash-highlight')
  }, 2000)
}

function handleOutlineActiveChange(sourceIndex: number) {
  if (sourceIndex < 0) return
  highlightedIndex.value = sourceIndex
}

onUnmounted(() => {
  if (collapseTimer) clearTimeout(collapseTimer)
  if (highlightTimer) clearTimeout(highlightTimer)
  clearHoveredElement()
})

onMounted(() => {
  updatePanelPosition()
  window.addEventListener('resize', updatePanelPosition)
})

watch([railItems, isExpanded], async ([, expanded]) => {
  await nextTick()
  if (expanded) {
    updatePanelPosition()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePanelPosition)
})
</script>

<style scoped>
.sp-outline-rail {
  transform-origin: right center;
  display: flex;
  align-items: center;
  padding-right: 6px;
}

.sp-outline-rail-list {
  margin: 0;
  padding: 16px 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.05);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.sp-outline-rail:hover .sp-outline-rail-list {
  background: rgba(255, 255, 255, 0.4);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);
}

:global(.dark) .sp-outline-rail-list {
  background: rgba(0, 0, 0, 0.15);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.2);
}

:global(.dark) .sp-outline-rail:hover .sp-outline-rail-list {
  background: rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.3);
}

.sp-outline-step-wrapper {
  position: relative;
}

.sp-outline-step {
  width: 32px;
  height: 14px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
  border: 0;
  cursor: pointer;
  outline: none;
}

/* The "Strings" - Physics-based fluid elements */
.sp-outline-step-bar {
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  color: rgba(148, 163, 184, 1);
  /* The magic spring transition for the magnetic dock effect */
  transition: width 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.15),
              opacity 0.4s ease,
              color 0.3s ease,
              box-shadow 0.3s ease;
  will-change: width, opacity;
  transform-origin: right center;
}

.sp-outline-step-bar.is-hovered {
  color: rgba(59, 130, 246, 1);
}

.sp-outline-step-bar.is-active {
  color: rgba(37, 99, 235, 1);
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.6);
}

:global(.dark) .sp-outline-step-bar {
  color: rgba(148, 163, 184, 0.8);
}

:global(.dark) .sp-outline-step-bar.is-hovered {
  color: rgba(96, 165, 250, 1);
}

:global(.dark) .sp-outline-step-bar.is-active {
  color: rgba(96, 165, 250, 1);
  box-shadow: 0 0 18px rgba(96, 165, 250, 0.4);
}

.sp-outline-rail-panel {
  pointer-events: auto;
  perspective: 1200px;
}

/* 3D Spring Animation for the Panel */
.rail-panel-shell {
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1),
              opacity 0.35s ease-out,
              box-shadow 0.5s ease;
  transform-origin: right center;
}

.rail-panel-enter-active .rail-panel-shell,
.rail-panel-leave-active .rail-panel-shell {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease-in;
}

.rail-panel-enter-from .rail-panel-shell,
.rail-panel-leave-to .rail-panel-shell {
  opacity: 0;
  transform: translateX(20px) scale(0.97) rotateY(-8deg);
}

/* Ripple effect injected globally for target elements */
:global(.outline-flash-highlight) {
  animation: synapse-ripple 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  border-radius: 6px;
  position: relative;
}

@keyframes synapse-ripple {
  0% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  15% {
    background-color: rgba(59, 130, 246, 0.12);
    box-shadow: 0 0 0 16px rgba(59, 130, 246, 0);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

</style>
