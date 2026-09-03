import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'error' | 'warning'
  duration?: number
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function show(message: string, type: Toast['type'] = 'success', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, type, duration }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }
  }

  function success(message: string, duration = 3000) {
    show(message, 'success', duration)
  }

  function info(message: string, duration = 3000) {
    show(message, 'info', duration)
  }

  function error(message: string, duration = 4000) {
    show(message, 'error', duration)
  }

  function warning(message: string, duration = 3500) {
    show(message, 'warning', duration)
  }

  function dismiss(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    show,
    success,
    info,
    error,
    warning,
    dismiss
  }
}
