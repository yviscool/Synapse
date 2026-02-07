import { ref, watch, unref, onScopeDispose } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import type { Ref } from 'vue'

// 1. 在 Composable 外部创建一个响应式的“模态框栈”
//    这个数组将作为所有 useModal 实例共享的全局状态
const modalStack: Ref<symbol[]> = ref([])
const scrollLockStack: Ref<symbol[]> = ref([])
let originalHtmlOverflow = ''
let originalBodyOverflow = ''
let hasStoredOverflow = false

function syncGlobalScrollLock() {
  if (typeof document === 'undefined') return

  const shouldLock = scrollLockStack.value.length > 0
  const html = document.documentElement
  const body = document.body

  if (shouldLock) {
    if (!hasStoredOverflow) {
      originalHtmlOverflow = html.style.overflow
      originalBodyOverflow = body.style.overflow
      hasStoredOverflow = true
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return
  }

  if (!hasStoredOverflow) return
  html.style.overflow = originalHtmlOverflow
  body.style.overflow = originalBodyOverflow
  hasStoredOverflow = false
}

interface UseModalOptions {
  closeOnEsc?: boolean
  lockScroll?: boolean
}

/**
 * 经过增强的、可感知全局状态的 modal 组合式函数
 * @param isOpen 控制显隐的 ref
 * @param closeFn 点击 ESC 或外部想关闭时的回调
 * @param options 配置选项
 */
export function useModal(
  isOpen: Ref<boolean>,
  closeFn: () => void = () => {},
  options: UseModalOptions = {}
) {
  const { closeOnEsc = true, lockScroll = true } = options

  // 2. 为每个 useModal 实例创建一个唯一的 ID
  const modalId = Symbol('modalId')

  watch(
    isOpen,
    (v) => {
      // 3. 根据 isOpen 状态，在栈中添加或移除当前 modal 的 ID
      if (v) {
        if (!modalStack.value.includes(modalId)) {
          modalStack.value.push(modalId)
        }
        if (lockScroll && !scrollLockStack.value.includes(modalId)) {
          scrollLockStack.value.push(modalId)
        }
      } else {
        modalStack.value = modalStack.value.filter((id) => id !== modalId)
        scrollLockStack.value = scrollLockStack.value.filter((id) => id !== modalId)
      }

      syncGlobalScrollLock()
    },
    { immediate: true }
  )

  if (closeOnEsc) {
    onKeyStroke(
      'Escape',
      (e) => {
        // 4. 关键改动：只有当这个 modal 位于栈顶时，才响应 Escape 键
        const isTopModal = modalStack.value.length > 0 && modalStack.value[modalStack.value.length - 1] === modalId

        if (unref(isOpen) && isTopModal) {
          e.preventDefault()
          e.stopImmediatePropagation() // 同样阻止其他监听器，确保唯一性
          closeFn()
        }
      },
      { target: document }
    )
  }

  // 5. 确保在组件卸载时，也将 modal 从栈中移除，防止内存泄漏
  onScopeDispose(() => {
    modalStack.value = modalStack.value.filter((id) => id !== modalId)
    scrollLockStack.value = scrollLockStack.value.filter((id) => id !== modalId)
    syncGlobalScrollLock()
  })
}
