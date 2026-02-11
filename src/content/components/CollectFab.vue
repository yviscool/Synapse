<template>
  <div ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { collect, getCurrentPlatformInfo } from '@/collect'
import { MSG } from '@/utils/messaging'
import { getPlatformColor } from '@/utils/chatPlatform'
import type { ChatPlatformInfo } from '@/utils/messaging'

const containerRef = ref<HTMLElement | null>(null)
let shadowRoot: ShadowRoot | null = null
let fabElement: HTMLElement | null = null
let toastElement: HTMLElement | null = null

// 状态
const canCollect = ref(false)
const isExpanded = ref(false)
const isCollecting = ref(false)
const platformInfo = ref<ChatPlatformInfo | null>(null)

// 位置状态
let position = { x: 24, y: 100 }
let isDragging = false
let dragStart = { x: 0, y: 0 }
let hasMoved = false

// 样式（完全隔离在 Shadow DOM 中）
const styles = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .fab {
    position: fixed;
    right: 24px;
    bottom: 100px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 14px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: none;
    border-radius: 24px;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255,255,255,0.15) inset;
  }

  .fab:active {
    transform: translateY(0);
  }

  .fab.expanded {
    padding-right: 18px;
  }

  .fab.collecting {
    pointer-events: none;
    opacity: 0.85;
  }

  .fab-icon {
    width: 22px;
    height: 22px;
    color: #fff;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-icon svg {
    width: 100%;
    height: 100%;
  }

  .fab-text {
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: all 0.25s ease;
  }

  .fab.expanded .fab-text {
    opacity: 1;
    max-width: 100px;
    margin-left: 2px;
  }

  .fab-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    border: 2px solid #fff;
  }

  .toast {
    position: fixed;
    bottom: 160px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 14px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .toast-icon {
    width: 20px;
    height: 20px;
    color: #10b981;
    flex-shrink: 0;
  }

  .toast-icon.error {
    color: #ef4444;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }
`

// 图标 SVG
const collectIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`
const spinnerIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`
const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
const errorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`

function createElements() {
  if (!shadowRoot) return

  // 创建样式
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  shadowRoot.appendChild(styleEl)

  // 创建 FAB
  fabElement = document.createElement('div')
  fabElement.className = 'fab'
  fabElement.innerHTML = `
    <div class="fab-icon">${collectIcon}</div>
    <span class="fab-text">采集对话</span>
    <div class="fab-badge" style="display:none;"></div>
  `
  shadowRoot.appendChild(fabElement)

  // 创建 Toast
  toastElement = document.createElement('div')
  toastElement.className = 'toast'
  toastElement.innerHTML = `
    <div class="toast-icon">${checkIcon}</div>
    <span class="toast-text"></span>
  `
  shadowRoot.appendChild(toastElement)

  // 绑定事件
  fabElement.addEventListener('mousedown', handleMouseDown)
  fabElement.addEventListener('mouseenter', () => {
    if (!isDragging) {
      isExpanded.value = true
      updateFabState()
    }
  })
  fabElement.addEventListener('mouseleave', () => {
    setTimeout(() => {
      isExpanded.value = false
      updateFabState()
    }, 200)
  })
  fabElement.addEventListener('click', handleClick)
}

function updateFabState() {
  if (!fabElement) return

  fabElement.className = 'fab'
  if (isExpanded.value) fabElement.classList.add('expanded')
  if (isCollecting.value) fabElement.classList.add('collecting')

  // 更新图标
  const iconEl = fabElement.querySelector('.fab-icon')
  if (iconEl) {
    if (isCollecting.value) {
      iconEl.innerHTML = spinnerIcon
      iconEl.querySelector('svg')?.classList.add('spinning')
    } else {
      iconEl.innerHTML = collectIcon
    }
  }

  // 更新徽章
  const badgeEl = fabElement.querySelector('.fab-badge') as HTMLElement
  if (badgeEl && platformInfo.value?.platform) {
    badgeEl.style.display = 'flex'
    badgeEl.style.backgroundColor = getPlatformColor(platformInfo.value.platform)
    badgeEl.textContent = platformInfo.value.platform.slice(0, 1).toUpperCase()
  }

  // 更新位置
  fabElement.style.right = `${position.x}px`
  fabElement.style.bottom = `${position.y}px`
}

function handleMouseDown(e: MouseEvent) {
  isDragging = true
  hasMoved = false
  dragStart = { x: e.clientX + position.x, y: e.clientY + position.y }

  const onMouseMove = (e: MouseEvent) => {
    const dx = Math.abs(e.clientX - (dragStart.x - position.x))
    const dy = Math.abs(e.clientY - (dragStart.y - position.y))
    if (dx > 5 || dy > 5) hasMoved = true

    position = {
      x: Math.max(16, Math.min(window.innerWidth - 64, dragStart.x - e.clientX)),
      y: Math.max(16, Math.min(window.innerHeight - 64, dragStart.y - e.clientY)),
    }
    updateFabState()
  }

  const onMouseUp = () => {
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

async function handleClick() {
  if (hasMoved || isCollecting.value) return

  isCollecting.value = true
  updateFabState()

  try {
    const result = collect()

    if (!result.success || !result.conversation) {
      showToast(`采集失败: ${result.error}`, false)
      return
    }

    const response = await chrome.runtime.sendMessage({
      type: MSG.CHAT_SAVE,
      data: { conversation: result.conversation, tags: [] },
    })

    if (response?.ok) {
      showToast(`已采集 ${result.conversation.messageCount} 条消息`, true)
    } else {
      showToast(`保存失败: ${response?.error || '未知错误'}`, false)
    }
  } catch (error) {
    showToast('采集出错', false)
  } finally {
    isCollecting.value = false
    updateFabState()
  }
}

function showToast(message: string, success: boolean) {
  if (!toastElement) return

  const iconEl = toastElement.querySelector('.toast-icon')
  const textEl = toastElement.querySelector('.toast-text')

  if (iconEl) {
    iconEl.innerHTML = success ? checkIcon : errorIcon
    iconEl.className = success ? 'toast-icon' : 'toast-icon error'
  }
  if (textEl) textEl.textContent = message

  toastElement.classList.add('visible')
  setTimeout(() => {
    toastElement?.classList.remove('visible')
  }, 3000)
}

function checkPage() {
  const info = getCurrentPlatformInfo()
  platformInfo.value = info
  const shouldShow = info.canCollect

  if (shouldShow !== canCollect.value) {
    canCollect.value = shouldShow
    if (fabElement) {
      fabElement.style.display = shouldShow ? 'flex' : 'none'
    }
  }

  if (shouldShow) {
    updateFabState()
  }
}

onMounted(() => {
  if (!containerRef.value) return

  // 创建 Shadow DOM
  shadowRoot = containerRef.value.attachShadow({ mode: 'closed' })
  createElements()

  // 初始检查
  checkPage()

  // 监听变化
  const observer = new MutationObserver(() => setTimeout(checkPage, 500))
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('popstate', checkPage)
  const interval = setInterval(checkPage, 3000)

  onUnmounted(() => {
    observer.disconnect()
    window.removeEventListener('popstate', checkPage)
    clearInterval(interval)
  })
})
</script>
