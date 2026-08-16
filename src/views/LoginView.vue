<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    await authStore.login({ email: email.value, password: password.value })
    router.push({ name: 'dashboard' })
  } catch (err: any) {
    error.value = err.response?.data?.title || 'Logowanie nieudane. Sprawdź swoje dane.'
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card card">
      <h1 class="text-center">Witaj ponownie</h1>
      <p class="text-center mt-1">Zaloguj się, aby zarządzać swoimi listami prezentów.</p>
      
      <form @submit.prevent="handleSubmit" class="mt-2">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="twoj@email.pl" required />
        </div>
        <div class="form-group">
          <label>Hasło</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>
        
        <div v-if="error" class="error-message text-center mb-1">{{ error }}</div>
        
        <button type="submit" class="btn btn-block" :disabled="authStore.isLoading">
          {{ authStore.isLoading ? 'Logowanie...' : 'Zaloguj się' }}
        </button>
      </form>
      
      <div class="auth-footer text-center mt-2">
        <p>Nie masz jeszcze konta? <RouterLink :to="{ name: 'register' }">Zarejestruj się</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 450px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 2rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.btn-block {
  width: 100%;
}

.mb-1 {
  margin-bottom: 1rem;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem;
    margin-top: 1rem;
  }
  
  h1 {
    font-size: 1.75rem;
  }
}
</style>
