type ScrollAlign = 'start' | 'center' | 'end'

type ScrollTarget = string | Window | undefined

const FLASH_CLASS = 'outline-flash-highlight'
let flashCleanupTimer: number | null = null

function clearFlashCleanupTimer(): void {
  if (flashCleanupTimer === null) return
  window.clearTimeout(flashCleanupTimer)
  flashCleanupTimer = null
}

function resolveScrollContainer(target: ScrollTarget): HTMLElement | null {
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target)
  }
  return null
}

function isScrollableElement(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  const style = window.getComputedStyle(el)
  const overflowY = style.overflowY
  const canScrollY = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
  return canScrollY && el.scrollHeight > el.clientHeight + 2
}

function findNearestScrollableAncestor(element: Element): HTMLElement | null {
  let current = element.parentElement
  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollableElement(current)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function animateScroll(container: HTMLElement, targetTop: number, durationMs: number): void {
  const from = container.scrollTop
  const distance = targetTop - from
  let start: number | null = null

  const step = (time: number) => {
    if (start === null) start = time
    const progress = Math.min((time - start) / durationMs, 1)
    container.scrollTop = from + distance * easeInOutQuad(progress)
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

export function clearAllOutlineFlashHighlights(): void {
  clearFlashCleanupTimer()
  document.querySelectorAll(`.${FLASH_CLASS}`).forEach((el) => {
    el.classList.remove(FLASH_CLASS)
  })
}

export function flashOutlineHighlight(element: Element | null, durationMs = 2000): void {
  if (!element) return
  clearAllOutlineFlashHighlights()
  if (element instanceof HTMLElement) {
    // Force reflow so repeated click can replay animation.
    void element.offsetWidth
  }
  element.classList.add(FLASH_CLASS)
  flashCleanupTimer = window.setTimeout(() => {
    element.classList.remove(FLASH_CLASS)
    flashCleanupTimer = null
  }, durationMs)
}

export function scrollToOutlineElement(
  element: Element,
  options: {
    scrollContainer?: ScrollTarget
    align?: ScrollAlign
    topOffset?: number
    durationMs?: number
  } = {},
): void {
  const {
    scrollContainer,
    align = 'center',
    topOffset = 0,
    durationMs = 400,
  } = options

  const container = resolveScrollContainer(scrollContainer) ?? findNearestScrollableAncestor(element)
  if (container) {
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    let targetTop = container.scrollTop + elementRect.top - containerRect.top
    if (align === 'center') {
      targetTop -= (containerRect.height / 2) - (elementRect.height / 2)
    } else if (align === 'end') {
      targetTop -= containerRect.height - elementRect.height
    } else {
      targetTop -= topOffset
    }

    animateScroll(container, targetTop, durationMs)
    return
  }

  if (align === 'start') {
    const top = element.getBoundingClientRect().top + window.scrollY - topOffset
    window.scrollTo({ top, behavior: 'smooth' })
    return
  }

  element.scrollIntoView({ behavior: 'smooth', block: align, inline: 'nearest' })
}
