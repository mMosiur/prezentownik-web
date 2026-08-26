<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEscapeKey } from '@/composables/useEscapeKey'

const { t } = useI18n()

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

async function copyLink() {
  copyError.value = ''
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
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
    <div class="modal-overlay" @click="emit('close')">
      <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="share-list-title">
        <div class="modal-header">
          <h2 id="share-list-title">{{ t('shareModal.title') }}</h2>
          <button class="close-btn" :aria-label="t('common.actions.close')" @click="emit('close')">&times;</button>
        </div>

        <p class="share-hint">
          <i18n-t keypath="shareModal.hint" tag="span">
            <template #strong>
              <strong>{{ t('shareModal.hintStrong') }}</strong>
            </template>
          </i18n-t>
        </p>

        <div class="share-link-row mt-1">
          <input
            type="text"
            readonly
            :value="shareUrl"
            @focus="selectInput"
            class="share-link-input"
            :aria-label="t('shareModal.linkAriaLabel')"
          />
          <button @click="copyLink" class="btn btn-outline share-copy-btn">
            {{ isCopied ? t('common.actions.copied') : t('common.actions.copy') }}
          </button>
        </div>

        <p v-if="copyError" class="field-error-msg" role="alert">{{ copyError }}</p>

        <div class="modal-actions">
          <button type="button" @click="emit('close')" class="btn btn-outline">{{ t('common.actions.close') }}</button>
          <button v-if="canNativeShare" type="button" @click="nativeShare" class="btn">
            {{ t('shareModal.nativeShare') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
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

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #999;
  cursor: pointer;
}

.share-hint {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-top: 0.75rem;
}

.share-link-row {
  display: flex;
  gap: 0.5rem;
}

.share-link-input {
  flex: 1;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--color-text);
  min-width: 0;
}

.share-link-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.share-copy-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.field-error-msg {
  color: #d63031;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (max-width: 480px) {
  .share-link-row {
    flex-direction: column;
  }
}
</style>
