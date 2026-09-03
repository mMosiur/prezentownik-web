<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
          role="status"
          @click="dismiss(toast.id)"
        >
          <div class="toast-icon">
            <!-- Success icon -->
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <!-- Error icon -->
            <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <!-- Warning icon -->
            <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <!-- Info icon -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            aria-label="Close"
            @click.stop="dismiss(toast.id)"
          >
            &times;
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  z-index: 9999;
  max-width: calc(100vw - 2rem);
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.1rem;
  background: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.35;
  border: 1px solid var(--color-border);
  cursor: pointer;
  max-width: 380px;
  user-select: none;
  backdrop-filter: blur(12px);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  color: var(--color-heading);
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  margin-left: 0.25rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.toast-close:hover {
  color: var(--color-heading);
}

.toast-success {
  border-left: 4px solid var(--color-success);
}
.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error {
  border-left: 4px solid var(--color-danger);
}
.toast-error .toast-icon {
  color: var(--color-danger);
}

.toast-warning {
  border-left: 4px solid var(--color-warning);
}
.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info {
  border-left: 4px solid var(--color-accent);
}
.toast-info .toast-icon {
  color: var(--color-accent);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.92);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.92);
}

@media (max-width: 600px) {
  .toast-container {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
    align-items: stretch;
  }

  .toast-item {
    max-width: 100%;
  }
}
</style>
