import { createApp } from 'vue'
import PanelApp from './PanelApp.vue'
import { MSG, type RuntimeMessage } from '@/utils/messaging'
import { findActiveInput, insertAtCursor } from '@/utils/inputAdapter'
import "@/styles"

// 启用大纲生成（按域名自适配）
import '@/outline/OutlineGenerator'

let composing = false
let shadowHost: HTMLElement | null = null
let shadowRootRef: ShadowRoot | null = null
let appRoot: HTMLElement | null = null
let appInstance: ReturnType<typeof createApp> | null = null

function ensureShadow() {
  if (shadowHost) return
  shadowHost = document.createElement('div')
  shadowHost.id = 'apm-root'
  document.documentElement.appendChild(shadowHost)
  shadowRootRef = shadowHost.attachShadow({ mode: 'open' })
}

function openPanel() {
  ensureShadow()
  if (!shadowRootRef || appRoot) return
  appRoot = document.createElement('div')
  shadowRootRef.appendChild(appRoot)
  appInstance = createApp(PanelApp, { onClose: closePanel })
  appInstance.mount(appRoot)
}

function closePanel() {
  if (!appRoot) return
  try { appInstance?.unmount?.() } catch {}
  appRoot.remove()
  appRoot = null
  appInstance = null
}

function handleSlashOpen(e: KeyboardEvent) {
  if (composing) return
  const tgt = e.target as HTMLElement | null
  const isInputLike = !!tgt && (['INPUT', 'TEXTAREA'].includes(tgt.tagName) || tgt.getAttribute('contenteditable') === 'true')
  if (!isInputLike) return
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    openPanel()
  }
}

window.addEventListener('keydown', handleSlashOpen, true)
window.addEventListener('compositionstart', () => (composing = true), true)
window.addEventListener('compositionend', () => (composing = false), true)

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (!message?.type) return
  if (message.type === MSG.OPEN_PANEL) openPanel()
  if (message.type === MSG.INSERT_PROMPT) {
    const t = findActiveInput()
    if (t && typeof message.data === 'string') insertAtCursor(t, message.data)
  }
})

// Esc 关闭
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && appRoot) {
    e.preventDefault()
    closePanel()
  }
}, true)

export {}