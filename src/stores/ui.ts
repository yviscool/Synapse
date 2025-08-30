import { reactive, readonly } from 'vue'

type ToastType = 'success' | 'error'
type ConfirmType = 'default' | 'danger'

interface Toast {
  message: string
  type: ToastType
}

interface Confirm {
  visible: boolean
  message: string
  type: ConfirmType
  resolver: ((value: boolean) => void) | null
}

const state = reactive({
  toast: null as Toast | null,
  confirm: {
    visible: false,
    message: '',
    type: 'default',
    resolver: null,
  } as Confirm,
})

function showToast(message: string, type: ToastType = 'success', duration: number = 3000) {
  state.toast = { message, type }
  if (duration > 0) {
    setTimeout(() => {
      state.toast = null
    }, duration)
  }
}

function hideToast() {
  state.toast = null
}

function askConfirm(message: string, options?: { type?: ConfirmType }): Promise<boolean> {
  state.confirm.message = message
  state.confirm.type = options?.type ?? 'default'
  state.confirm.visible = true
  return new Promise<boolean>((resolve) => {
    state.confirm.resolver = resolve
  })
}

function handleConfirm(value: boolean) {
  if (state.confirm.resolver) {
    state.confirm.resolver(value)
  }
  state.confirm.visible = false
  state.confirm.resolver = null
}

export const ui = readonly(state)
export const useUI = () => ({
  showToast,
  hideToast,
  askConfirm,
  handleConfirm,
})