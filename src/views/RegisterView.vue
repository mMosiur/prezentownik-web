<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const validationErrors = ref<Record<string, string[]>>({})

async function handleSubmit() {
  error.value = ''
  validationErrors.value = {}
  
  if (password.value !== confirmPassword.value) {
    error.value = 'Hasła nie są identyczne.'
    return
  }

  try {
    await authStore.register({ 
      email: email.value, 
      password: password.value, 
      displayName: displayName.value || null 
    })
    router.push({ name: 'login', query: { registered: 'true' } })
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.errors) {
      validationErrors.value = err.response.data.errors
    } else {
      error.value = err.response?.data?.title || 'Rejestracja nieudana.'
    }
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card card">
      <h1 class="text-center">Dołącz do nas</h1>
      <p class="text-center mt-1">Stwórz konto, aby zacząć planować swoje listy prezentów.</p>
      
      <form @submit.prevent="handleSubmit" class="mt-2">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="twoj@email.pl" required />
          <div v-if="validationErrors.Email" class="error-message">
            {{ validationErrors.Email.join(' ') }}
          </div>
        </div>
        
        <div class="form-group">
          <label>Nazwa wyświetlana (opcjonalnie)</label>
          <input v-model="displayName" type="text" placeholder="Np. Anna i Mateusz" />
        </div>
        
        <div class="form-group">
          <label>Hasło</label>
          <input v-model="password" type="password" placeholder="Min. 6 znaków" required />
          <div v-if="validationErrors.Password" class="error-message">
            {{ validationErrors.Password.join(' ') }}
          </div>
        </div>
        
        <div class="form-group">
          <label>Potwierdź hasło</label>
          <input v-model="confirmPassword" type="password" placeholder="Powtórz hasło" required />
        </div>
        
        <div v-if="error" class="error-message text-center mb-1">{{ error }}</div>
        
        <button type="submit" class="btn btn-block" :disabled="authStore.isLoading">
          {{ authStore.isLoading ? 'Rejestracja...' : 'Zarejestruj się' }}
        </button>
      </form>
      
      <div class="auth-footer text-center mt-2">
        <p>Masz już konto? <RouterLink :to="{ name: 'login' }">Zaloguj się</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 500px;
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
