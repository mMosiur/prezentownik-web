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
    // Always show a success message, regardless of whether the account
    // exists, so we don't leak information about registered e-mail addresses.
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
  <div class="container">
    <div class="auth-card card">
      <div class="auth-header text-center">
        <h1>{{ t('auth.forgotPassword.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.forgotPassword.subtitle') }}</p>
      </div>

      <div
        v-if="isSubmitted"
        class="alert alert-success mt-2"
        role="status"
        aria-live="polite"
      >
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
          <div class="alert-body">
            <span class="alert-desc">{{ generalError }}</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="auth-form mt-2" novalidate>
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.email }">
            <label for="forgot-password-email">
              {{ t('common.labels.email') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-wrapper">
              <input
                id="forgot-password-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="username email"
                :placeholder="t('auth.forgotPassword.emailPlaceholder')"
                required
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.email"
                :aria-describedby="fieldErrors.email ? 'forgot-password-email-error' : undefined"
                @input="clearFieldError('email')"
              />
            </div>
            <p
              v-if="fieldErrors.email"
              id="forgot-password-email-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.email }}
            </p>
          </div>

          <button
            type="submit"
            class="btn btn-block btn-submit"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
            <span>{{ isSubmitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit') }}</span>
          </button>
        </form>
      </template>

      <div class="auth-footer text-center mt-2">
        <p>
          <RouterLink :to="{ name: 'login' }" class="auth-link">{{ t('auth.forgotPassword.backToLogin') }}</RouterLink>
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
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.auth-header h1 {
  font-size: 2rem;
  margin-bottom: 0.35rem;
  color: var(--color-heading);
}

.auth-subtitle {
  color: #5a736e;
  font-size: 1rem;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 1.25rem;
  animation: fadeIn 0.25s ease-in-out;
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

.auth-form {
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-heading);
}

.required-mark {
  color: #e03131;
  margin-left: 2px;
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

.form-group.has-error input {
  border-color: #fa5252;
  background-color: #fff9f9;
}

.form-group.has-error input:focus {
  box-shadow: 0 0 0 3px rgba(250, 82, 82, 0.15);
}

.field-error-msg {
  color: #c92a2a;
  font-size: 0.85rem;
  margin-top: 0.35rem;
  font-weight: 500;
  animation: fadeIn 0.2s ease-in-out;
}

.btn-block {
  width: 100%;
}

.btn-submit {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-footer {
  margin-top: 1.75rem;
  font-size: 0.95rem;
  color: #5a736e;
}

.auth-link {
  color: var(--color-accent);
  font-weight: 700;
  text-decoration: underline;
}

.auth-link:hover {
  opacity: 0.8;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem 1rem;
    margin: 1.25rem auto;
  }

  .auth-header h1 {
    font-size: 1.6rem;
  }

  .alert {
    padding: 0.75rem 0.85rem;
  }
}
</style>
