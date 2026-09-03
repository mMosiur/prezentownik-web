<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const isSubmitting = ref(false)
const isSubmitted = ref(false)

const generalError = ref('')
const fieldErrors = ref<Record<string, string>>({})

function clearFieldError(field: string) {
  if (fieldErrors.value[field]) {
    delete fieldErrors.value[field]
  }
  if (generalError.value) {
    generalError.value = ''
  }
}

function validateForm(): boolean {
  fieldErrors.value = {}
  generalError.value = ''

  const trimmedEmail = email.value.trim()
  email.value = trimmedEmail

  if (!trimmedEmail) {
    fieldErrors.value.email = t('auth.forgotPassword.emailRequired')
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    fieldErrors.value.email = t('auth.forgotPassword.emailInvalid')
    return false
  }

  return true
}

async function handleSubmit() {
  if (isSubmitting.value) return

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  generalError.value = ''
  fieldErrors.value = {}

  try {
    await authStore.forgotPassword({ email: email.value })
    isSubmitted.value = true
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('auth.forgotPassword.failedDefault'))
    generalError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      fieldErrors.value = { ...parsed.fieldErrors }
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container container-narrow">
    <div class="auth-card card card-elevated">
      <div class="auth-header text-center">
        <div class="auth-icon-badge">
          <span>🔑</span>
        </div>
        <h1 class="mt-1">{{ t('auth.forgotPassword.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.forgotPassword.subtitle') }}</p>
      </div>

      <div
        v-if="isSubmitted"
        class="alert alert-success mt-2"
        role="status"
        aria-live="polite"
      >
        <div class="alert-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="alert-body">
          <span class="alert-title">{{ t('auth.forgotPassword.successTitle') }}</span>
          <span class="alert-desc">{{ t('auth.forgotPassword.successDesc') }}</span>
        </div>
      </div>

      <template v-else>
        <div
          v-if="generalError"
          class="alert alert-error mt-1"
          role="alert"
          aria-live="assertive"
        >
          <div class="alert-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="alert-body">
            <span class="alert-desc">{{ generalError }}</span>
          </div>
          <button
            type="button"
            class="alert-close"
            :aria-label="t('common.actions.closeError')"
            @click="generalError = ''"
          >
            &times;
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="auth-form mt-2" novalidate>
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.email }">
            <label for="forgot-password-email">
              {{ t('common.labels.email') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-icon-wrapper">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
              <input
                id="forgot-password-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                :placeholder="t('auth.forgotPassword.emailPlaceholder')"
                required
                class="with-icon"
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.email"
                :aria-describedby="fieldErrors.email ? 'forgot-email-error' : undefined"
                @input="clearFieldError('email')"
              />
            </div>
            <p
              v-if="fieldErrors.email"
              id="forgot-email-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.email }}
            </p>
          </div>

          <button
            type="submit"
            class="btn btn-block btn-submit mt-1"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            <span v-if="isSubmitting" class="spinner spinner-sm" aria-hidden="true"></span>
            <span>{{ isSubmitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit') }}</span>
          </button>
        </form>
      </template>

      <div class="auth-footer text-center mt-2">
        <RouterLink :to="{ name: 'login' }" class="auth-link">{{ t('auth.forgotPassword.backToLogin') }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 460px;
  margin: 2.5rem auto;
  padding: 2.25rem 2rem;
  border-radius: var(--radius-xl);
}

.auth-icon-badge {
  font-size: 2.2rem;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: var(--shadow-xs);
}

.auth-header h1 {
  font-size: 1.85rem;
  margin-bottom: 0.25rem;
  color: var(--color-heading);
}

.auth-subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

/* Alert Styles */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 1.25rem;
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.alert-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.alert-desc {
  font-size: 0.9rem;
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
  background-color: var(--color-success-soft);
  border: 1px solid rgba(47, 158, 68, 0.3);
  color: var(--color-success);
}

.alert-error {
  background-color: var(--color-danger-soft);
  border: 1px solid rgba(224, 49, 49, 0.3);
  color: var(--color-danger);
}

/* Input icons */
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

.btn-submit {
  width: 100%;
  padding: 0.8rem;
  font-size: 1rem;
}

.auth-footer {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
  padding-top: 1.25rem;
}

.auth-link {
  font-weight: 600;
  color: var(--color-accent);
}

.auth-link:hover {
  text-decoration: underline;
}
</style>