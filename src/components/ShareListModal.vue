<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
  listId: string
  listName?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

useEscapeKey(() => emit('close'))

const shareUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}lists/${props.listId}`)
const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

const isCopied = ref(false)
const copyError = ref('')

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback to legacy execCommand if writeText fails
    }
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    textArea.style.opacity = '0'
    textArea.setAttribute('readonly', '')
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (e) {
    console.error('Clipboard copy failed:', e)
    return false
  }
}

async function copyLink() {
  copyError.value = ''
  const success = await copyToClipboard(shareUrl.value)
  if (success) {
    isCopied.value = true
    toast.success(t('common.toasts.copied'))
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } else {
    copyError.value = t('shareModal.copyError')
  }
}

async function nativeShare() {
  if (!navigator.share) return
  try {
    await navigator.share({
      title: props.listName ? t('shareModal.shareTitle', { name: props.listName }) : t('shareModal.shareTitleDefault'),
      text: t('shareModal.shareText'),
      url: shareUrl.value
    })
  } catch {
    // User cancelled the share sheet or it's unsupported - ignore silently
  }
}

function selectInput(event: FocusEvent) {
  (event.target as HTMLInputElement).select()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div class="modal-overlay" @click="emit('close')">
        <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="share-list-title">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-title-icon">🔗</span>
              <h2 id="share-list-title">{{ t('shareModal.title') }}</h2>
            </div>
            <button class="close-btn" :aria-label="t('common.actions.close')" @click="emit('close')">&times;</button>
          </div>

          <div class="share-hint-box mt-1">
            <p class="share-hint">
              <i18n-t keypath="shareModal.hint" tag="span" scope="global">
                <template #strong>
                  <strong>{{ t('shareModal.hintStrong') }}</strong>
                </template>
              </i18n-t>
            </p>
          </div>

          <div class="share-link-wrapper mt-2">
            <label class="share-input-label" for="share-url-input">{{ t('shareModal.linkAriaLabel') }}</label>
            <div class="share-link-row">
              <input
                id="share-url-input"
                type="text"
                readonly
                :value="shareUrl"
                @focus="selectInput"
                class="share-link-input"
                :aria-label="t('shareModal.linkAriaLabel')"
              />
              <button @click="copyLink" class="btn share-copy-btn" :class="{ 'btn-copied': isCopied }">
                <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ isCopied ? t('common.actions.copied') : t('common.actions.copy') }}</span>
              </button>
            </div>
          </div>

          <p v-if="copyError" class="field-error-msg mt-1" role="alert">{{ copyError }}</p>

          <div class="modal-actions">
            <button type="button" @click="emit('close')" class="btn btn-outline">{{ t('common.actions.close') }}</button>
            <button v-if="canNativeShare" type="button" @click="nativeShare" class="btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>{{ t('shareModal.nativeShare') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 45, 61, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 500px;
  margin-bottom: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title-icon {
  font-size: 1.4rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-heading);
}

.share-hint-box {
  padding: 0.85rem 1rem;
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  border: 1px solid rgba(59, 119, 108, 0.2);
}

.share-hint {
  font-size: 0.92rem;
  color: var(--color-heading);
  line-height: 1.45;
  margin: 0;
}

.share-input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}

.share-link-row {
  display: flex;
  gap: 0.5rem;
}

.share-link-input {
  flex: 1;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 0.92rem;
  font-family: monospace;
  color: var(--color-heading);
  text-overflow: ellipsis;
}

.share-link-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.share-copy-btn {
  padding: 0.65rem 1.15rem;
  gap: 0.45rem;
  flex-shrink: 0;
}

.share-copy-btn.btn-copied {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #ffffff;
}

.field-error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

/* Modal animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 500px) {
  .share-link-row {
    flex-direction: column;
  }

  .share-copy-btn {
    width: 100%;
  }
}
</style>