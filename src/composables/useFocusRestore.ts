import { ref } from 'vue'
import type { Ref } from 'vue'

/**
 * A composable to save and restore focus.
 */
export function useFocusRestore() {
  const lastActiveEl: Ref<Element | null> = ref(null)

  /**
   * Saves the currently active element.
   */
  function saveFocus() {
    lastActiveEl.value = document.activeElement
  }

  /**
   * Restores focus to the last saved element.
   */
  function restoreFocus() {
    if (lastActiveEl.value instanceof HTMLElement) {
      // Use a timeout to ensure the element is focusable after other DOM changes.
      setTimeout(() => {
        (lastActiveEl.value as HTMLElement).focus()
      }, 0)
    }
  }

  return { saveFocus, restoreFocus }
}
