<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const resetCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const linkInvalid = ref(false)

const generalError = ref('')
const fieldErrors = ref<Record<string, string>>({})

onMounted(() => {
  const queryEmail = route.query.email
  const queryCode = route.query.code ?? route.query.resetCode

  if (typeof queryEmail !== 'string' || typeof queryCode !== 'string' || !queryEmail || !queryCode) {
    linkInvalid.value = true
    return
  }

  email.value = queryEmail
  resetCode.value = queryCode
})

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

  let isValid = true

  if (!newPassword.value) {
    fieldErrors.value.password = t('auth.resetPassword.passwordRequired')
    isValid = false
  } else if (newPassword.value.length < 8) {
    fieldErrors.value.password = t('auth.resetPassword.passwordMinLength')
    isValid = false
  }

  if (!confirmPassword.value) {
    fieldErrors.value.confirmPassword = t('auth.resetPassword.confirmPasswordRequired')
    isValid = false
  } else if (newPassword.value !== confirmPassword.value) {
    fieldErrors.value.confirmPassword = t('auth.resetPassword.passwordsMismatch')
    isValid = false
  }

  return isValid
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
    await authStore.resetPassword({
      email: email.value,
      resetCode: resetCode.value,
      newPassword: newPassword.value,
    })
    isSubmitted.value = true
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('auth.resetPassword.failedDefault'))
    generalError.value = parsed.message || t('auth.resetPassword.failedDefault')
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      fieldErrors.value = { ...parsed.fieldErrors }
    }
  } finally {
    isSubmitting.value = false
  }
}

function goToLogin() {
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="container container-narrow">
    <div class="auth-card card card-elevated">
      <div class="auth-header text-center">
        <div class="auth-icon-badge">
          <span>🔒</span>
        </div>
        <h1 class="mt-1">{{ t('auth.resetPassword.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.resetPassword.subtitle') }}</p>
      </div>

      <!-- Invalid link banner -->
      <div
        v-if="linkInvalid"
        class="alert alert-error mt-2"
        role="alert"
        aria-live="assertive"
      >
        <div class="alert-body">
          <span class="alert-desc">{{ t('auth.resetPassword.invalidLink') }}</span>
        </div>
      </div>

      <!-- Success state -->
      <div
        v-else-if="isSubmitted"
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
          <span class="alert-title">{{ t('auth.resetPassword.successTitle') }}</span>
          <span class="alert-desc">{{ t('auth.resetPassword.successDesc') }}</span>
        </div>
      </div>

      <template v-else>
        <!-- Error alert banner -->
        <div
          v-if="generalError"
          class="alert alert-error mt-1"
          role="alert"
          aria-live="assertive"
        >
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
          <!-- New Password field -->
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.password }">
            <label for="reset-new-password">
              {{ t('auth.resetPassword.newPassword') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-icon-wrapper password-wrapper">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="reset-new-password"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                name="newPassword"
                autocomplete="new-password"
                :placeholder="t('auth.resetPassword.passwordPlaceholder')"
                required
                class="with-icon"
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.password"
                :aria-describedby="fieldErrors.password ? 'reset-password-error' : undefined"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                tabindex="-1"
                :aria-label="showPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :title="showPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :disabled="isSubmitting"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="!showPassword"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
            <p
              v-if="fieldErrors.password"
              id="reset-password-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.password }}
            </p>
          </div>

          <!-- Confirm Password field -->
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.confirmPassword }">
            <label for="reset-confirm-password">
              {{ t('auth.resetPassword.confirmPassword') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-icon-wrapper password-wrapper">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="reset-confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                name="confirmPassword"
                autocomplete="new-password"
                :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
                required
                class="with-icon"
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.confirmPassword"
                :aria-describedby="fieldErrors.confirmPassword ? 'reset-confirm-error' : undefined"
                @input="clearFieldError('confirmPassword')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                tabindex="-1"
                :aria-label="showConfirmPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :title="showConfirmPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :disabled="isSubmitting"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  v-if="!showConfirmPassword"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
            <p
              v-if="fieldErrors.confirmPassword"
              id="reset-confirm-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.confirmPassword }}
            </p>
          </div>

          <button
            type="submit"
            class="btn btn-block btn-submit mt-1"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            <span v-if="isSubmitting" class="spinner spinner-sm" aria-hidden="true"></span>
            <span>{{ isSubmitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit') }}</span>
          </button>
        </form>
      </template>

      <div class="auth-footer text-center mt-2">
        <button v-if="isSubmitted" @click="goToLogin" class="btn btn-block">
          {{ t('auth.resetPassword.goToLogin') }}
        </button>
        <RouterLink v-else :to="{ name: 'login' }" class="auth-link">{{ t('auth.resetPassword.backToLogin') }}</RouterLink>
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

.password-wrapper {
  position: relative;
}

.password-toggle-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.password-toggle-btn:hover {
  color: var(--color-heading);
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