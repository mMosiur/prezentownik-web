<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()

type Status = 'confirming' | 'success' | 'error'

const status = ref<Status>('confirming')
const errorMessage = ref('')

onMounted(async () => {
  const userId = route.query.userId
  const code = route.query.code
  const changedEmail = route.query.changedEmail

  if (typeof userId !== 'string' || typeof code !== 'string' || !userId || !code) {
    status.value = 'error'
    errorMessage.value = t('auth.confirmEmail.invalidLink')
    return
  }

  try {
    await authStore.confirmEmail(
      userId,
      code,
      typeof changedEmail === 'string' ? changedEmail : undefined
    )
    status.value = 'success'
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('auth.confirmEmail.failedDefault'))
    status.value = 'error'
    errorMessage.value = parsed.message || t('auth.confirmEmail.failedDefault')
  }
})
</script>

<template>
  <div class="container">
    <div class="auth-card card">
      <div v-if="status === 'confirming'" class="auth-header text-center">
        <span class="spinner spinner-lg" aria-hidden="true"></span>
        <h1>{{ t('auth.confirmEmail.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.confirmEmail.loadingSubtitle') }}</p>
      </div>

      <div v-else-if="status === 'success'" class="auth-header text-center">
        <h1>{{ t('auth.confirmEmail.successTitle') }}</h1>
        <p class="auth-subtitle">{{ t('auth.confirmEmail.successDesc') }}</p>
        <RouterLink :to="{ name: 'login' }" class="btn btn-block btn-submit mt-2">{{ t('auth.confirmEmail.goToLogin') }}</RouterLink>
      </div>

      <div v-else class="auth-header text-center">
        <h1>{{ t('auth.confirmEmail.failedTitle') }}</h1>
        <p class="auth-subtitle">{{ errorMessage }}</p>
        <RouterLink :to="{ name: 'resend-confirmation' }" class="btn btn-block btn-submit mt-2">{{ t('auth.confirmEmail.resendLink') }}</RouterLink>
        <RouterLink :to="{ name: 'login' }" class="auth-link mt-2">{{ t('auth.confirmEmail.backToLogin') }}</RouterLink>
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
  font-size: 1.75rem;
  margin: 1rem 0 0.35rem;
  color: var(--color-heading);
}

.auth-subtitle {
  color: #5a736e;
  font-size: 1rem;
}

.btn-block {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-submit {
  padding: 0.85rem 1.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.auth-link {
  display: block;
  margin-top: 1rem;
  color: var(--color-accent);
  font-weight: 700;
  text-decoration: underline;
}

.auth-link:hover {
  opacity: 0.8;
}

.spinner-lg {
  width: 36px;
  height: 36px;
  border: 3.5px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  display: inline-block;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem 1rem;
    margin: 1.25rem auto;
  }

  .auth-header h1 {
    font-size: 1.6rem;
  }
}
</style>
