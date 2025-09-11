import { useEventListener } from '@vueuse/core'

/**
 * A composable to listen for a slash trigger (e.g., '/p') in input fields.
 * @param callback The function to call when the trigger is detected.
 */
export function useSlashTrigger(callback: () => void) {
  let lastInputValue = ''
  const ceLast = new WeakMap<HTMLElement, string>()

  useEventListener(document, 'input', (e) => {
    const t = e.target as any
    if (t instanceof HTMLTextAreaElement) {
      const v = t.value || ''
      if (v.toLowerCase().endsWith('/p') && v !== lastInputValue) {
        lastInputValue = v
        callback()
      } else {
        lastInputValue = v
      }
    } else if (t instanceof HTMLElement && t.isContentEditable) {
      const last = ceLast.get(t) || ''
      const v = (t.textContent || '')
      if (v.toLowerCase().endsWith('/p') && v !== last) {
        ceLast.set(t, v)
        callback()
      } else {
        ceLast.set(t, v)
      }
    }
  }, true)
}
