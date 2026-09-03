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
  <div class="container container-narrow">
    <div class="auth-card card card-elevated">
      <!-- Confirming in progress -->
      <div v-if="status === 'confirming'" class="auth-header text-center">
        <div class="auth-icon-badge">
          <span class="spinner spinner-accent spinner-md" aria-hidden="true"></span>
        </div>
        <h1 class="mt-1">{{ t('auth.confirmEmail.title') }}</h1>
        <p class="auth-subtitle">{{ t('auth.confirmEmail.loadingSubtitle') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="auth-header text-center">
        <div class="auth-icon-badge badge-success">
          <span>🎉</span>
        </div>
        <h1 class="mt-1">{{ t('auth.confirmEmail.successTitle') }}</h1>
        <p class="auth-subtitle">{{ t('auth.confirmEmail.successDesc') }}</p>
        <RouterLink :to="{ name: 'login' }" class="btn btn-block btn-submit mt-2">
          {{ t('auth.confirmEmail.goToLogin') }}
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="auth-header text-center">
        <div class="auth-icon-badge badge-error">
          <span>⚠️</span>
        </div>
        <h1 class="mt-1">{{ t('auth.confirmEmail.failedTitle') }}</h1>
        <p class="auth-subtitle">{{ errorMessage }}</p>
        <RouterLink :to="{ name: 'resend-confirmation' }" class="btn btn-block btn-submit mt-2">
          {{ t('auth.confirmEmail.resendLink') }}
        </RouterLink>
        <div class="auth-footer text-center mt-2">
          <RouterLink :to="{ name: 'login' }" class="auth-link">{{ t('auth.confirmEmail.backToLogin') }}</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 460px;
  margin: 2.5rem auto;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-xl);
}

.auth-icon-badge {
  font-size: 2.2rem;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: var(--color-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
  box-shadow: var(--shadow-xs);
}

.badge-success {
  background: var(--color-success-soft);
}

.badge-error {
  background: var(--color-danger-soft);
}

.auth-header h1 {
  font-size: 1.85rem;
  margin-bottom: 0.35rem;
  color: var(--color-heading);
}

.auth-subtitle {
  color: var(--color-text-muted);
  font-size: 0.98rem;
  line-height: 1.5;
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