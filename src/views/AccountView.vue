<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

const displayName = ref('')
const isSaving = ref(false)
const isLoggingOut = ref(false)
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

const userInitials = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.email || ''
  if (!name) return '?'
  const parts = name.trim().split(/[\s@]+/)
  const first = parts[0]
  const second = parts[1]
  if (first && second && first.length > 0 && second.length > 0) {
    return (first[0]! + second[0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

function clearFieldError(field: string) {
  if (fieldErrors.value[field]) {
    delete fieldErrors.value[field]
  }
  if (generalError.value) {
    generalError.value = ''
  }
}

async function handleSaveProfile() {
  if (isSaving.value) return

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
    toast.success(t('common.toasts.profileSaved'))
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
  <div class="container container-narrow account-view mt-2">
    <div class="page-header text-center">
      <div class="user-big-avatar">
        {{ userInitials }}
      </div>
      <h1 class="mt-1">{{ t('account.title') }}</h1>
      <p class="page-subtitle">{{ t('account.subtitle') }}</p>
    </div>

    <!-- Feedback Error Alert -->
    <div v-if="generalError" class="alert alert-error mt-2" role="alert">
      <span class="alert-desc">{{ generalError }}</span>
      <button
        type="button"
        class="close-btn"
        :aria-label="t('common.actions.closeError')"
        @click="generalError = ''"
      >
        &times;
      </button>
    </div>

    <!-- Profile Information Card -->
    <div class="card profile-card mt-2">
      <div class="card-title-row">
        <span class="card-icon">👤</span>
        <h2>{{ t('account.profileSection') }}</h2>
      </div>

      <div class="form-group mt-2">
        <label for="account-email">{{ t('account.emailLabel') }}</label>
        <div class="input-icon-wrapper">
          <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
          </svg>
          <input
            id="account-email"
            type="email"
            :value="authStore.user?.email || ''"
            disabled
            class="disabled-input with-icon"
          />
        </div>
        <p class="field-hint">{{ t('account.emailHint') }}</p>
      </div>

      <form @submit.prevent="handleSaveProfile" class="profile-form mt-1" novalidate>
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.displayName }">
          <label for="account-display-name">{{ t('account.displayNameLabel') }}</label>
          <div class="input-icon-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input
              id="account-display-name"
              v-model="displayName"
              type="text"
              :placeholder="t('account.displayNamePlaceholder')"
              :disabled="isSaving"
              class="with-icon"
              @input="clearFieldError('displayName')"
            />
          </div>
          <p v-if="fieldErrors.displayName" class="field-error-msg" role="alert">
            {{ fieldErrors.displayName }}
          </p>
          <p v-else class="field-hint">{{ t('account.displayNameHint') }}</p>
        </div>

        <div class="form-actions mt-2">
          <button
            type="submit"
            class="btn btn-save-profile"
            :disabled="isSaving || !hasChanges"
          >
            <span v-if="isSaving" class="spinner spinner-sm" aria-hidden="true"></span>
            <span>{{ isSaving ? t('common.actions.saving') : t('common.actions.saveChanges') }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Session Card -->
    <div class="card session-card mt-2">
      <div class="card-title-row">
        <span class="card-icon">🚪</span>
        <h2>{{ t('account.sessionSection') }}</h2>
      </div>
      <p class="section-desc mt-1">{{ t('account.sessionHint') }}</p>

      <div class="session-actions mt-2">
        <button
          type="button"
          class="btn btn-outline btn-logout"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <svg v-if="!isLoggingOut" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span v-if="isLoggingOut" class="spinner spinner-sm spinner-accent" aria-hidden="true"></span>
          <span>{{ isLoggingOut ? t('account.loggingOut') : t('account.logout') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-view {
  padding-bottom: 3.5rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.user-big-avatar {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  background: var(--color-accent-gradient);
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 4px 18px var(--color-accent-glow);
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.card-icon {
  font-size: 1.35rem;
}

.card-title-row h2 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--color-heading);
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--color-text-light);
  pointer-events: none;
}

.with-icon {
  padding-left: 2.6rem !important;
}

.disabled-input {
  background: var(--color-background-soft);
  color: var(--color-text-muted);
  cursor: not-allowed;
  border-color: var(--color-border);
}

.field-hint {
  font-size: 0.82rem;
  color: var(--color-text-light);
  margin-top: 0.35rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-save-profile {
  padding: 0.75rem 1.6rem;
}

.section-desc {
  font-size: 0.92rem;
  color: var(--color-text-muted);
}

.session-actions {
  display: flex;
}

.btn-logout {
  color: var(--color-danger);
  border-color: rgba(224, 49, 49, 0.3);
  padding: 0.7rem 1.4rem;
}

.btn-logout:hover:not(:disabled) {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}
</style>