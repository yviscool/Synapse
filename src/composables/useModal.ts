import { ref, watch, unref, onScopeDispose } from 'vue'
import { onKeyStroke, useScrollLock } from '@vueuse/core'
import type { Ref } from 'vue'

// 1. 在 Composable 外部创建一个响应式的“模态框栈”
//    这个数组将作为所有 useModal 实例共享的全局状态
const modalStack: Ref<symbol[]> = ref([])

interface UseModalOptions {
  closeOnEsc?: boolean
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
  const { closeOnEsc = true } = options

  // 2. 为每个 useModal 实例创建一个唯一的 ID
  const modalId = Symbol('modalId')

  const isLocked = useScrollLock(document.body)

  watch(
    isOpen,
    (v) => {
      isLocked.value = v
      
      // 3. 根据 isOpen 状态，在栈中添加或移除当前 modal 的 ID
      if (v) {
        modalStack.value.push(modalId)
      } else {
        modalStack.value = modalStack.value.filter((id) => id !== modalId)
      }
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
  })
}