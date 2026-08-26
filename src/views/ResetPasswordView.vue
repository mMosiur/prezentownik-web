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
  <div class="container">
    <div class="auth-card card">
      <div class="auth-header text-center">
        <h1>{{ t('auth.resetPassword.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.resetPassword.subtitle') }}</p>
      </div>

      <div v-if="linkInvalid" class="alert alert-error mt-2" role="alert">
        <div class="alert-body">
          <span class="alert-desc">{{ t('auth.resetPassword.invalidLink') }}</span>
        </div>
      </div>

      <div
        v-else-if="isSubmitted"
        class="alert alert-success mt-2"
        role="status"
        aria-live="polite"
      >
        <div class="alert-body">
          <span class="alert-title">{{ t('auth.resetPassword.successTitle') }}</span>
          <span class="alert-desc">{{ t('auth.resetPassword.successDesc') }}</span>
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
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.password }">
            <label for="reset-password-new">
              {{ t('auth.resetPassword.newPassword') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-wrapper password-wrapper">
              <input
                id="reset-password-new"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                name="newPassword"
                autocomplete="new-password"
                :placeholder="t('auth.resetPassword.passwordPlaceholder')"
                required
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.password"
                :aria-describedby="fieldErrors.password ? 'reset-password-new-error' : undefined"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                tabindex="-1"
                :aria-label="showPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :disabled="isSubmitting"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
            <p
              v-if="fieldErrors.password"
              id="reset-password-new-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.password }}
            </p>
          </div>

          <div class="form-group" :class="{ 'has-error': !!fieldErrors.confirmPassword }">
            <label for="reset-password-confirm">
              {{ t('common.labels.confirmPassword') }} <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="input-wrapper password-wrapper">
              <input
                id="reset-password-confirm"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                name="confirmPassword"
                autocomplete="new-password"
                :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
                required
                :disabled="isSubmitting"
                :aria-invalid="!!fieldErrors.confirmPassword"
                :aria-describedby="fieldErrors.confirmPassword ? 'reset-password-confirm-error' : undefined"
                @input="clearFieldError('confirmPassword')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                tabindex="-1"
                :aria-label="showConfirmPassword ? t('common.actions.hidePassword') : t('common.actions.showPassword')"
                :disabled="isSubmitting"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? '🙈' : '👁' }}
              </button>
            </div>
            <p
              v-if="fieldErrors.confirmPassword"
              id="reset-password-confirm-error"
              class="field-error-msg"
              role="alert"
            >
              {{ fieldErrors.confirmPassword }}
            </p>
          </div>

          <button
            type="submit"
            class="btn btn-block btn-submit"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
            <span>{{ isSubmitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit') }}</span>
          </button>
        </form>
      </template>

      <div class="auth-footer text-center mt-2">
        <p v-if="!isSubmitted">
          <RouterLink :to="{ name: 'login' }" class="auth-link">{{ t('auth.resetPassword.backToLogin') }}</RouterLink>
        </p>
        <p v-else>
          <button type="button" class="auth-link auth-link-btn" @click="goToLogin">{{ t('auth.resetPassword.goToLogin') }}</button>
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

.password-wrapper input {
  padding-right: 2.85rem;
}

.password-toggle-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0.35rem;
  cursor: pointer;
  color: #7b9490;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background-color 0.2s;
}

.password-toggle-btn:hover:not(:disabled) {
  color: var(--color-heading);
  background-color: rgba(0, 0, 0, 0.05);
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

.auth-link-btn {
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem 1.25rem;
    margin: 1.25rem auto;
  }

  .auth-header h1 {
    font-size: 1.75rem;
  }
}
</style>
