import { ref, watch, onUnmounted, nextTick, type Ref } from 'vue'

export interface FocusTrapOptions {
  containerRef?: Ref<HTMLElement | null>
  initialFocusRef?: Ref<HTMLElement | null>
  onEscape?: () => void
}

/**
 * Traps keyboard focus within an active modal dialog, moves focus into the modal
 * upon opening, handles the Escape key, and restores focus to the triggering element
 * when closed.
 */
export function useFocusTrap(
  isOpen: Ref<boolean> | (() => boolean),
  options?: FocusTrapOptions
) {
  const previousActiveElement = ref<HTMLElement | null>(null)

  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
    })
  }

  function handleKeydown(event: KeyboardEvent) {
    const open = typeof isOpen === 'function' ? isOpen() : isOpen.value
    if (!open) return

    if (event.key === 'Escape' && options?.onEscape) {
      event.preventDefault()
      options.onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const container = options?.containerRef?.value || (document.querySelector('.modal-overlay .modal[role="dialog"]') as HTMLElement | null) || (document.querySelector('.modal-overlay .modal') as HTMLElement | null)
    if (!container) return

    const focusables = getFocusableElements(container)
    if (focusables.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!

    if (event.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  function focusInitialElement() {
    if (options?.initialFocusRef?.value) {
      options.initialFocusRef.value.focus()
      return
    }
    const container = options?.containerRef?.value || (document.querySelector('.modal-overlay .modal[role="dialog"]') as HTMLElement | null) || (document.querySelector('.modal-overlay .modal') as HTMLElement | null)
    if (container) {
      if (container.contains(document.activeElement) && document.activeElement !== container) {
        return
      }
      const focusables = getFocusableElements(container)
      if (focusables.length > 0) {
        const firstInput = focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
        if (firstInput) {
          firstInput.focus()
        } else {
          focusables[0]!.focus()
        }
      }
    }
  }

  watch(
    () => (typeof isOpen === 'function' ? isOpen() : isOpen.value),
    (open) => {
      if (open) {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          previousActiveElement.value = document.activeElement
        }
        window.addEventListener('keydown', handleKeydown)
        nextTick(() => {
          focusInitialElement()
          setTimeout(focusInitialElement, 50)
        })
      } else {
        window.removeEventListener('keydown', handleKeydown)
        if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function' && document.body.contains(previousActiveElement.value)) {
          previousActiveElement.value.focus()
        }
        previousActiveElement.value = null
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function' && document.body.contains(previousActiveElement.value)) {
      previousActiveElement.value.focus()
    }
  })
}
