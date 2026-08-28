<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const displayName = ref('')
const isSaving = ref(false)
const isLoggingOut = ref(false)
const successMessage = ref('')
const generalError = ref('')
const fieldErrors = ref<Record<string, string>>({})

function initDisplayName() {
  if (authStore.user?.displayName) {
    displayName.value = authStore.user.displayName
  } else {
    displayName.value = ''
  }
}

onMounted(() => {
  initDisplayName()
})

watch(() => authStore.user, () => {
  initDisplayName()
})

const hasChanges = computed(() => {
  const current = (authStore.user?.displayName ?? '').trim()
  const input = displayName.value.trim()
  return input !== current
})

function clearFieldError(field: string) {
  if (fieldErrors.value[field]) {
    delete fieldErrors.value[field]
  }
  if (generalError.value) {
    generalError.value = ''
  }
  if (successMessage.value) {
    successMessage.value = ''
  }
}

async function handleSaveProfile() {
  if (isSaving.value) return

  successMessage.value = ''
  generalError.value = ''
  fieldErrors.value = {}

  const trimmed = displayName.value.trim()
  if (!trimmed) {
    fieldErrors.value.displayName = t('account.displayNameRequired')
    return
  }

  isSaving.value = true
  try {
    await authStore.updateUser({ displayName: trimmed })
    displayName.value = authStore.user?.displayName ?? trimmed
    successMessage.value = t('account.saveSuccess')
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('account.saveFailed'))
    generalError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      fieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!fieldErrors.value.displayName
      if (!hasMatchingFieldError && !generalError.value) {
        generalError.value = Object.values(parsed.fieldErrors)[0] || t('account.saveFailed')
      }
    }
  } finally {
    isSaving.value = false
  }
}

async function handleLogout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
    await router.push({ name: 'home' })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="container account-view">
    <div class="page-header">
      <h1>{{ t('account.title') }}</h1>
      <p class="page-subtitle">{{ t('account.subtitle') }}</p>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="successMessage" class="alert alert-success" role="status">
      <span class="alert-desc">{{ successMessage }}</span>
      <button
        type="button"
        class="alert-close"
        :aria-label="t('common.actions.closeNotification')"
        @click="successMessage = ''"
      >
        &times;
      </button>
    </div>

    <div v-if="generalError" class="alert alert-error" role="alert">
      <span class="alert-desc">{{ generalError }}</span>
      <button
        type="button"
        class="alert-close"
        :aria-label="t('common.actions.closeError')"
        @click="generalError = ''"
      >
        &times;
      </button>
    </div>

    <!-- Profile Information Card -->
    <div class="card profile-card">
      <h2>{{ t('account.profileSection') }}</h2>

      <div class="form-group">
        <label for="account-email">{{ t('account.emailLabel') }}</label>
        <div class="input-wrapper">
          <input
            id="account-email"
            type="email"
            :value="authStore.user?.email || ''"
            disabled
            class="disabled-input"
          />
        </div>
        <p class="field-hint">{{ t('account.emailHint') }}</p>
      </div>

      <form @submit.prevent="handleSaveProfile" class="profile-form">
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.displayName }">
          <label for="account-display-name">{{ t('account.displayNameLabel') }}</label>
          <div class="input-wrapper">
            <input
              id="account-display-name"
              v-model="displayName"
              type="text"
              :placeholder="t('account.displayNamePlaceholder')"
              :disabled="isSaving"
              @input="clearFieldError('displayName')"
            />
          </div>
          <p v-if="fieldErrors.displayName" class="field-error-msg" role="alert">
            {{ fieldErrors.displayName }}
          </p>
          <p v-else class="field-hint">{{ t('account.displayNameHint') }}</p>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn"
            :disabled="isSaving || !hasChanges"
          >
            <span v-if="isSaving" class="btn-content">
              <span class="spinner spinner-sm" aria-hidden="true"></span>
              {{ t('common.actions.saving') }}
            </span>
            <span v-else>{{ t('common.actions.saveChanges') }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Session Card -->
    <div class="card session-card">
      <h2>{{ t('account.sessionSection') }}</h2>
      <p class="section-desc">{{ t('account.sessionHint') }}</p>

      <div class="session-actions">
        <button
          type="button"
          class="btn btn-outline logout-btn"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <span v-if="isLoggingOut" class="btn-content">
            <span class="spinner spinner-sm" aria-hidden="true"></span>
            {{ t('account.loggingOut') }}
          </span>
          <span v-else>{{ t('account.logout') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-view {
  padding-top: 1.5rem;
  padding-bottom: 3rem;
  max-width: 680px;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2.25rem;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.page-subtitle {
  color: #666;
  font-size: 1.05rem;
  line-height: 1.5;
}

.card h2 {
  font-size: 1.35rem;
  color: var(--color-heading);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.profile-form {
  margin-top: 1rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: white;
  font-family: inherit;
  font-size: 1rem;
  color: var(--color-heading);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.disabled-input {
  background-color: var(--color-background-mute) !important;
  color: #666 !important;
  cursor: not-allowed;
}

.form-group.has-error input {
  border-color: #fa5252;
  background-color: #fff9f9;
}

.form-group.has-error input:focus {
  box-shadow: 0 0 0 3px rgba(250, 82, 82, 0.15);
}

.field-hint {
  font-size: 0.85rem;
  color: #777;
  margin-top: 0.4rem;
  line-height: 1.4;
}

.field-error-msg {
  color: #e03131;
  font-size: 0.85rem;
  margin-top: 0.35rem;
  font-weight: 500;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-start;
}

.btn-content {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.session-card {
  margin-top: 2rem;
}

.section-desc {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
  line-height: 1.4;
}

.session-actions {
  display: flex;
  justify-content: flex-start;
}

.logout-btn {
  color: #c92a2a;
  border-color: #ffa8a8;
}

.logout-btn:hover:not(:disabled) {
  background-color: #fff5f5;
  border-color: #fa5252;
  color: #e03131;
}

.alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
  animation: fadeIn 0.25s ease-in-out;
}

.alert-desc {
  flex: 1;
}

.alert-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.alert-close:hover {
  opacity: 1;
}

.alert-success {
  background-color: #ebfbee;
  color: #2b8a3e;
  border: 1px solid #b2f2bb;
}

.alert-error {
  background-color: #fff5f5;
  color: #c92a2a;
  border: 1px solid #ffc9c9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .form-actions .btn,
  .session-actions .btn {
    width: 100%;
  }
}
</style>
