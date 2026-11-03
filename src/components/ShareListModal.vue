<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFocusTrap } from '@/composables/useFocusTrap'
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

useFocusTrap(ref(true), {
  onEscape: () => emit('close')
})

const shareUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}lists/${props.listId}`)
const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

const isCopied = ref(false)
const copyError = ref('')

const whatsappUrl = computed(() => {
  const title = props.listName
    ? t('shareModal.shareTitle', { name: props.listName })
    : t('shareModal.shareTitleDefault')
  const message = `${title}\n${t('shareModal.shareText')}\n${shareUrl.value}`
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
})

const emailUrl = computed(() => {
  const subject = props.listName
    ? t('shareModal.shareTitle', { name: props.listName })
    : t('shareModal.shareTitleDefault')
  const body = `${t('shareModal.shareText')}\n\n${shareUrl.value}`
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})

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

          <!-- Quick Share Channels -->
          <div class="share-channels-wrapper mt-2">
            <span class="share-channels-label">{{ t('shareModal.quickShareLabel') }}</span>

            <!-- Primary Native Share CTA for Mobile -->
            <button
              v-if="canNativeShare"
              type="button"
              @click="nativeShare"
              class="btn btn-native-share"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>{{ t('shareModal.nativeShareMobile') }}</span>
            </button>

            <!-- Direct 1-tap app buttons -->
            <div class="share-channel-buttons">
              <a
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline share-channel-btn btn-whatsapp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.59c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29"/>
                </svg>
                <span>{{ t('shareModal.whatsApp') }}</span>
              </a>

              <a
                :href="emailUrl"
                class="btn btn-outline share-channel-btn btn-email"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <span>{{ t('shareModal.email') }}</span>
              </a>

              <a
                :href="shareUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline share-channel-btn btn-preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>{{ t('shareModal.previewAsGuest') }}</span>
              </a>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="emit('close')" class="btn btn-outline btn-close-modal">{{ t('common.actions.close') }}</button>
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
  max-width: 520px;
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
  min-width: 0;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 0.9rem;
  font-family: monospace;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.share-channels-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.share-channels-label {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.btn-native-share {
  width: 100%;
  padding: 0.85rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.share-channel-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.share-channel-btn {
  flex: 1;
  min-width: 120px;
  font-size: 0.88rem;
  padding: 0.6rem 0.85rem;
  text-decoration: none;
  gap: 0.45rem;
}

.share-channel-btn.btn-whatsapp:hover {
  color: #128c7e;
  border-color: #25d366;
  background-color: rgba(37, 211, 102, 0.08);
}

.share-channel-btn.btn-preview {
  color: var(--color-text);
}

.field-error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.btn-close-modal {
  min-width: 100px;
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

  .share-channel-btn {
    min-width: 100%;
  }
}
</style>
