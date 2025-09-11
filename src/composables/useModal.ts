// composables/useModal.ts
import { watch, unref } from 'vue'
import { onKeyStroke, useScrollLock } from '@vueuse/core'
import type { Ref } from 'vue'

/**
 * 简易 modal 组合式函数
 * @param isOpen 控制显隐的 ref
 * @param closeFn 点击 ESC 或外部想关闭时的回调
 */
export function useModal(
  isOpen: Ref<boolean>,
  closeFn: () => void = () => {}
) {
  // 1. 锁定 / 解锁 body 滚动
  const isLocked = useScrollLock(document.body)

  // 2. 同步 isOpen -> 滚动锁
  watch(
    isOpen,
    (v) => {
      isLocked.value = v
    },
    { immediate: true }
  )

  // 3. ESC 关闭
  onKeyStroke(
    'Escape',
    (e) => {
      if (unref(isOpen)) {
        e.preventDefault()
        closeFn()
      }
    },
    { target: document }
  )

  // 4. 组件卸载时一定解锁（useScrollLock 内部已做，这里只是示意）
  //    无需手动处理，useScrollLock 会在 effectScope 结束时自动复位
}
