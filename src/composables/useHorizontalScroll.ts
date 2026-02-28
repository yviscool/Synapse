import { ref, computed, onUnmounted, nextTick, watch, type Ref, type WatchSource } from 'vue'

export function useHorizontalScroll(
  viewportRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  watchSource?: WatchSource,
) {
  const scrollOffset = ref(0)
  const maxScroll = ref(0)
  const canScrollLeft = computed(() => scrollOffset.value > 0)
  const canScrollRight = computed(() => scrollOffset.value < maxScroll.value)

  let resizeObserver: ResizeObserver | null = null

  function updateDimensions() {
    if (viewportRef.value && contentRef.value) {
      const viewportWidth = viewportRef.value.offsetWidth
      const contentWidth = contentRef.value.scrollWidth
      maxScroll.value = Math.max(0, contentWidth - viewportWidth)
      if (scrollOffset.value > maxScroll.value) {
        scrollOffset.value = maxScroll.value
      }
    }
  }

  function scroll(direction: 'left' | 'right') {
    if (!viewportRef.value) return
    const amount = viewportRef.value.offsetWidth * 0.8
    if (direction === 'right') {
      scrollOffset.value = Math.min(scrollOffset.value + amount, maxScroll.value)
    } else {
      scrollOffset.value = Math.max(scrollOffset.value - amount, 0)
    }
  }

  function handleWheel(event: WheelEvent) {
    if (maxScroll.value <= 0) return
    event.preventDefault()
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta === 0) return
    scrollOffset.value = Math.max(0, Math.min(scrollOffset.value + delta, maxScroll.value))
  }

  function init() {
    nextTick(() => {
      resizeObserver?.disconnect()
      resizeObserver = null
      if (viewportRef.value) {
        resizeObserver = new ResizeObserver(updateDimensions)
        resizeObserver.observe(viewportRef.value)
      }
      updateDimensions()
    })
  }

  if (watchSource) {
    watch(watchSource, async () => {
      await nextTick()
      updateDimensions()
    })
  }

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    scrollOffset,
    canScrollLeft,
    canScrollRight,
    scroll,
    handleWheel,
    init,
    updateDimensions,
  }
}
