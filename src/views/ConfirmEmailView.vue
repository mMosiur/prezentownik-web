<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

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
    errorMessage.value = 'Link potwierdzający jest nieprawidłowy lub niekompletny.'
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
    const parsed = parseApiError(err, 'Nie udało się potwierdzić adresu e-mail. Link mógł wygasnąć lub został już wykorzystany.')
    status.value = 'error'
    errorMessage.value = parsed.message || 'Nie udało się potwierdzić adresu e-mail. Link mógł wygasnąć lub został już wykorzystany.'
  }
})
</script>

<template>
  <div class="container">
    <div class="auth-card card">
      <div v-if="status === 'confirming'" class="auth-header text-center">
        <span class="spinner spinner-lg" aria-hidden="true"></span>
        <h1>Potwierdzanie adresu e-mail...</h1>
        <p class="auth-subtitle">Chwileczkę, weryfikujemy Twój link.</p>
      </div>

      <div v-else-if="status === 'success'" class="auth-header text-center">
        <h1>Adres e-mail potwierdzony!</h1>
        <p class="auth-subtitle">Twoje konto zostało zweryfikowane. Możesz się teraz zalogować.</p>
        <RouterLink :to="{ name: 'login' }" class="btn btn-block btn-submit mt-2">Przejdź do logowania</RouterLink>
      </div>

      <div v-else class="auth-header text-center">
        <h1>Nie udało się potwierdzić e-maila</h1>
        <p class="auth-subtitle">{{ errorMessage }}</p>
        <RouterLink :to="{ name: 'resend-confirmation' }" class="btn btn-block btn-submit mt-2">Wyślij link ponownie</RouterLink>
        <RouterLink :to="{ name: 'login' }" class="auth-link mt-2">Wróć do logowania</RouterLink>
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
</style>
