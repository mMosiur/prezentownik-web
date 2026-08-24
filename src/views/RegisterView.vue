<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)

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

  let isValid = true

  if (!trimmedEmail) {
    fieldErrors.value.email = 'Podaj adres e-mail.'
    isValid = false
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      fieldErrors.value.email = 'Wprowadź prawidłowy format adresu e-mail.'
      isValid = false
    }
  }

  if (!password.value) {
    fieldErrors.value.password = 'Wprowadź hasło.'
    isValid = false
  } else if (password.value.length < 8) {
    fieldErrors.value.password = 'Hasło musi mieć co najmniej 8 znaków.'
    isValid = false
  }

  if (!confirmPassword.value) {
    fieldErrors.value.confirmPassword = 'Potwierdź hasło.'
    isValid = false
  } else if (password.value !== confirmPassword.value) {
    fieldErrors.value.confirmPassword = 'Hasła nie są identyczne.'
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
    await authStore.register({ 
      email: email.value, 
      password: password.value
    })
    router.push({ name: 'login', query: { registered: 'true', email: email.value } })
  } catch (err: unknown) {
    const parsed = parseApiError(err, 'Rejestracja nie powiodła się. Spróbuj ponownie.')
    generalError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      fieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!(fieldErrors.value.email || fieldErrors.value.password || fieldErrors.value.confirmPassword)
      if (!hasMatchingFieldError && !generalError.value) {
        generalError.value = Object.values(parsed.fieldErrors)[0] || 'Rejestracja nie powiodła się. Spróbuj ponownie.'
      }
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
        <h1>Dołącz do nas</h1>
        <p class="auth-subtitle">Stwórz konto, aby zacząć planować swoje listy prezentów.</p>
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
        </div>
        <button
          type="button"
          class="alert-close"
          aria-label="Zamknij komunikat o błędzie"
          @click="generalError = ''"
        >
          &times;
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form mt-2" novalidate>
        <!-- Email field -->
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.email }">
          <label for="register-email">
            Adres e-mail <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="register-email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="username email"
              placeholder="twoj@email.pl"
              required
              :disabled="isSubmitting"
              :aria-invalid="!!fieldErrors.email"
              :aria-describedby="fieldErrors.email ? 'register-email-error' : undefined"
              @input="clearFieldError('email')"
            />
          </div>
          <p
            v-if="fieldErrors.email"
            id="register-email-error"
            class="field-error-msg"
            role="alert"
          >
            {{ fieldErrors.email }}
          </p>
        </div>

        <!-- Password field -->
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.password }">
          <label for="register-password">
            Hasło <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <div class="input-wrapper password-wrapper">
            <input
              id="register-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="new-password"
              placeholder="Min. 8 znaków"
              required
              :disabled="isSubmitting"
              :aria-invalid="!!fieldErrors.password"
              :aria-describedby="fieldErrors.password ? 'register-password-error' : undefined"
              @input="clearFieldError('password')"
            />
            <button
              type="button"
              class="password-toggle-btn"
              tabindex="-1"
              :aria-label="showPassword ? 'Ukryj hasło' : 'Pokaż hasło'"
              :title="showPassword ? 'Ukryj hasło' : 'Pokaż hasło'"
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
                width="20"
                height="20"
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
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
          <p
            v-if="fieldErrors.password"
            id="register-password-error"
            class="field-error-msg"
            role="alert"
          >
            {{ fieldErrors.password }}
          </p>
        </div>

        <!-- Confirm Password field -->
        <div class="form-group" :class="{ 'has-error': !!fieldErrors.confirmPassword }">
          <label for="register-confirm-password">
            Potwierdź hasło <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <div class="input-wrapper password-wrapper">
            <input
              id="register-confirm-password"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              name="confirmPassword"
              autocomplete="new-password"
              placeholder="Powtórz hasło"
              required
              :disabled="isSubmitting"
              :aria-invalid="!!fieldErrors.confirmPassword"
              :aria-describedby="fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined"
              @input="clearFieldError('confirmPassword')"
            />
            <button
              type="button"
              class="password-toggle-btn"
              tabindex="-1"
              :aria-label="showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'"
              :title="showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'"
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
                width="20"
                height="20"
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
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
          <p
            v-if="fieldErrors.confirmPassword"
            id="register-confirm-password-error"
            class="field-error-msg"
            role="alert"
          >
            {{ fieldErrors.confirmPassword }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="btn btn-block btn-submit"
          :disabled="isSubmitting"
          :aria-busy="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
          <span>{{ isSubmitting ? 'Rejestracja...' : 'Zarejestruj się' }}</span>
        </button>
      </form>

      <div class="auth-footer text-center mt-2">
        <p>
          Masz już konto?
          <RouterLink :to="{ name: 'login' }" class="auth-link">Zaloguj się</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 480px;
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

.alert-error {
  background-color: #fff5f5;
  color: #c92a2a;
  border: 1px solid #ffc9c9;
}

/* Form Styles */
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

.password-toggle-btn:focus-visible {
  outline: 2px solid var(--color-accent);
}

.field-error-msg {
  color: #c92a2a;
  font-size: 0.85rem;
  margin-top: 0.35rem;
  font-weight: 500;
  animation: fadeIn 0.2s ease-in-out;
}

/* Submit Button & Spinner */
.btn-block {
  width: 100%;
  margin-top: 0.5rem;
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

/* Footer */
.auth-footer {
  margin-top: 1.75rem;
  font-size: 0.95rem;
  color: #5a736e;
}

.auth-link {
  color: var(--color-accent);
  font-weight: 700;
  text-decoration: underline;
  margin-left: 0.25rem;
}

.auth-link:hover {
  opacity: 0.8;
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
