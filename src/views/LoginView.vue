<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const isSubmitting = ref(false)

const generalError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const showRegisteredSuccess = ref(false)
const isEmailNotConfirmed = ref(false)

onMounted(() => {
  if (route.query.registered === 'true') {
    showRegisteredSuccess.value = true
  }
  if (typeof route.query.email === 'string' && !email.value) {
    email.value = route.query.email
  }
})

function clearFieldError(field: string) {
  if (fieldErrors.value[field]) {
    delete fieldErrors.value[field]
  }
  if (generalError.value) {
    generalError.value = ''
    isEmailNotConfirmed.value = false
  }
}

function validateForm(): boolean {
  fieldErrors.value = {}
  generalError.value = ''

  const trimmedEmail = email.value.trim()
  email.value = trimmedEmail

  let isValid = true

  if (!trimmedEmail) {
    fieldErrors.value.email = t('auth.login.emailRequired')
    isValid = false
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      fieldErrors.value.email = t('auth.login.emailInvalid')
      isValid = false
    }
  }

  if (!password.value) {
    fieldErrors.value.password = t('auth.login.passwordRequired')
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
  showRegisteredSuccess.value = false
  isEmailNotConfirmed.value = false

  try {
    await authStore.login(
      { email: email.value, password: password.value },
      { useCookies: true, useSessionCookies: !rememberMe.value }
    )

    const redirect = route.query.redirect as string | undefined
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      router.push(redirect)
    } else {
      router.push({ name: 'dashboard' })
    }
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('auth.login.failedDefault'))
    generalError.value = parsed.message
    isEmailNotConfirmed.value = parsed.code === 'email-not-confirmed'
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      fieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!(fieldErrors.value.email || fieldErrors.value.password)
      if (!hasMatchingFieldError && !generalError.value) {
        generalError.value = Object.values(parsed.fieldErrors)[0] || t('auth.login.failedDefault')
      }
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
          <span>🎁</span>
        </div>
        <h1 class="mt-1">{{ t('auth.login.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.login.subtitle') }}</p>
      </div>

      <!-- Registration success flash message -->
      <div
        v-if="showRegisteredSuccess"
        class="alert alert-success mt-1"
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
          <span class="alert-title">{{ t('auth.login.registeredSuccessTitle') }}</span>
          <span class="alert-desc">
            {{ t('auth.login.registeredSuccessDesc') }}
          </span>
          <RouterLink
            :to="{ name: 'resend-confirmation', query: email ? { email } : {} }"
            class="auth-link alert-action-link"
          >
            {{ t('auth.login.registeredSuccessResend') }}
          </RouterLink>
        </div>
        <button
          type="button"
          class="alert-close"
          :aria-label="t('common.actions.closeNotification')"
          @click="showRegisteredSuccess = false"
        >
          &times;
        </button>
      </div>

      <!-- Error alert banner -->
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
          <RouterLink
            v-if="isEmailNotConfirmed"
            :to="{ name: 'resend-confirmation', query: { email } }"
            class="auth-link alert-action-link"
          >
            {{ t('auth.login.notConfirmedResend') }}
          </RouterLink>
        </div>
        <button
          type="button"
          class="alert-close"
          :aria-label="t('common.actions.closeError')"
          @click="generalError = ''; isEmailNotConfirmed = false"
        >
          &times;
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form mt-2" novalidate>
        <!-- Email field -->
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.email }">
          <label for="login-email">
            {{ t('common.labels.email') }} <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <div class="input-icon-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            <input
              id="login-email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="username email"
              :placeholder="t('auth.login.emailPlaceholder')"
              required
              class="with-icon"
              :disabled="isSubmitting"
              :aria-invalid="!!fieldErrors.email"
              :aria-describedby="fieldErrors.email ? 'login-email-error' : undefined"
              @input="clearFieldError('email')"
            />
          </div>
          <p
            v-if="fieldErrors.email"
            id="login-email-error"
            class="field-error-msg"
            role="alert"
          >
            {{ fieldErrors.email }}
          </p>
        </div>

        <!-- Password field -->
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.password }">
          <label for="login-password">
            {{ t('common.labels.password') }} <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <div class="input-icon-wrapper password-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              :placeholder="t('auth.login.passwordPlaceholder')"
              required
              class="with-icon"
              :disabled="isSubmitting"
              :aria-invalid="!!fieldErrors.password"
              :aria-describedby="fieldErrors.password ? 'login-password-error' : undefined"
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
              <!-- Eye icon (Show) -->
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
              <!-- Eye-off icon (Hide) -->
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
            id="login-password-error"
            class="field-error-msg"
            role="alert"
          >
            {{ fieldErrors.password }}
          </p>
        </div>

        <!-- Options: Remember Me -->
        <div class="form-options">
          <label class="checkbox-container">
            <input
              type="checkbox"
              v-model="rememberMe"
              :disabled="isSubmitting"
            />
            <span class="checkbox-checkmark"></span>
            <span class="checkbox-label">{{ t('auth.login.rememberMe') }}</span>
          </label>
          <RouterLink :to="{ name: 'forgot-password', query: email ? { email } : {} }" class="auth-link forgot-password-link">{{ t('auth.login.forgotPassword') }}</RouterLink>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="btn btn-block btn-submit"
          :disabled="isSubmitting"
          :aria-busy="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner spinner-sm" aria-hidden="true"></span>
          <span>{{ isSubmitting ? t('auth.login.submitting') : t('auth.login.submit') }}</span>
        </button>
      </form>

      <div class="auth-footer text-center mt-2">
        <p>
          {{ t('auth.login.noAccount') }}
          <RouterLink :to="{ name: 'register' }" class="auth-link">{{ t('auth.login.registerLink') }}</RouterLink>
        </p>
        <p class="mt-1">
          {{ t('auth.login.resendEmailPrompt') }}
          <RouterLink :to="{ name: 'resend-confirmation' }" class="auth-link">{{ t('auth.login.resendEmailLink') }}</RouterLink>
        </p>
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

.alert-action-link {
  font-size: 0.85rem;
  margin-top: 0.35rem;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
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

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  color: var(--color-text);
}

.checkbox-container input {
  accent-color: var(--color-accent);
  width: 16px;
  height: 16px;
}

.forgot-password-link {
  font-size: 0.88rem;
  font-weight: 500;
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