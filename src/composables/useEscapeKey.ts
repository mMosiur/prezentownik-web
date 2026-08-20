import { onMounted, onUnmounted } from 'vue'

/**
 * Calls `onEscape` whenever the Escape key is pressed while the component
 * using this composable is mounted. Used to let modals close the same way
 * clicking the overlay does, which keeps keyboard/screen-reader users from
 * getting stuck inside a dialog.
 */
export function useEscapeKey(onEscape: () => void) {
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onEscape()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
