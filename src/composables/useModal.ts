import { watch } from 'vue'
import { useKey, useScrollLock } from '@vueuse/core'
import type { Ref } from 'vue'

/**
 * A composable for modal-like components.
 *
 * @param isOpen A ref to control the visibility of the modal.
 * @param closeFn The function to call when the modal should be closed.
 */
export function useModal(isOpen: Ref<boolean>, closeFn: () => void) {
  const isLocked = useScrollLock(document.body)

  watch(isOpen, (v) => {
    isLocked.value = v
  }, { immediate: true })

  useKey('Escape', (e) => {
    if (isOpen.value) {
      e.preventDefault()
      closeFn()
    }
  }, { target: document })
}
