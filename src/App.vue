<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'

const authStore = useAuthStore()
const router = useRouter()

const showDisplayNameModal = ref(false)
const displayNameInput = ref('')
const isSavingDisplayName = ref(false)
const displayNameError = ref('')

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'home' })
}

function openDisplayNameModal() {
  displayNameInput.value = authStore.user?.displayName ?? ''
  displayNameError.value = ''
  showDisplayNameModal.value = true
}

async function saveDisplayName() {
  if (isSavingDisplayName.value) return

  const trimmed = displayNameInput.value.trim()
  if (!trimmed) {
    displayNameError.value = 'Podaj nazwę, jaką mają widzieć bliscy.'
    return
  }

  isSavingDisplayName.value = true
  displayNameError.value = ''
  try {
    await authStore.updateUser({ displayName: trimmed })
    showDisplayNameModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, 'Nie udało się zapisać nazwy.')
    displayNameError.value = parsed.message
  } finally {
    isSavingDisplayName.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="container nav-wrapper">
      <RouterLink to="/" class="brand">Prezentownik</RouterLink>
      
      <nav class="main-nav">
        <template v-if="authStore.isAuthenticated">
          <span class="welcome-text">
            Witaj{{ authStore.user?.displayName ? `, ${authStore.user.displayName}` : '' }}!
          </span>
          <button
            v-if="!authStore.user?.displayName"
            @click="openDisplayNameModal"
            class="btn btn-sm btn-outline set-name-btn"
            title="Ustaw nazwę, którą zobaczą bliscy"
          >
            Ustaw nazwę
          </button>
          <RouterLink :to="{ name: 'dashboard' }" class="nav-link">Moje Listy</RouterLink>
          <button @click="handleLogout" class="btn btn-outline btn-sm">Wyloguj</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="nav-link">Logowanie</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="btn btn-sm">Rejestracja</RouterLink>
        </template>
      </nav>
    </div>
  </header>

  <Teleport to="body">
    <div v-if="showDisplayNameModal" class="modal-overlay" @click="!isSavingDisplayName && (showDisplayNameModal = false)">
      <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="display-name-title">
        <div class="modal-header">
          <h2 id="display-name-title">Jak mamy Cię nazywać?</h2>
          <button class="close-btn" aria-label="Zamknij" :disabled="isSavingDisplayName" @click="showDisplayNameModal = false">&times;</button>
        </div>

        <p class="modal-hint">
          Ta nazwa będzie widoczna dla osób, którym udostępnisz swoje listy prezentowe.
        </p>

        <div v-if="displayNameError" class="alert alert-error mt-1" role="alert">
          <span class="alert-desc">{{ displayNameError }}</span>
        </div>

        <form @submit.prevent="saveDisplayName" class="mt-1">
          <div class="form-group">
            <label for="display-name-input">Wyświetlana nazwa</label>
            <input
              id="display-name-input"
              v-model="displayNameInput"
              required
              placeholder="Np. Kasia, Marek"
              :disabled="isSavingDisplayName"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showDisplayNameModal = false" class="btn btn-outline" :disabled="isSavingDisplayName">
              Anuluj
            </button>
            <button type="submit" class="btn" :disabled="isSavingDisplayName">
              {{ isSavingDisplayName ? 'Zapisywanie...' : 'Zapisz' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <main class="app-main">
    <RouterView />
  </main>
  
  <footer class="app-footer">
    <div class="container text-center">
      <p>&copy; 2026 Prezentownik. Stworzone z myślą o pięknych chwilach.</p>
    </div>
  </footer>
</template>

<style scoped>
.app-header {
  background: var(--color-background-soft);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(5px);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0.5rem 0;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
  text-decoration: none;
  letter-spacing: -0.5px;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
}

.nav-link.router-link-active {
  color: var(--color-accent);
}

.btn-sm {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
}

.welcome-text {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 0.95rem;
  white-space: nowrap;
}

.set-name-btn {
  white-space: nowrap;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 450px;
  margin-bottom: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-hint {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  line-height: 1.4;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #999;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.alert-error {
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  color: #c53030;
}

.alert-desc {
  line-height: 1.4;
}

.app-main {
  flex: 1;
  padding-top: 1rem;
}

.app-footer {
  padding: 2rem 0;
  color: #99aab5;
  font-size: 0.85rem;
}

@media (max-width: 480px) {
  .brand {
    font-size: 1.25rem;
  }
  
  .main-nav {
    gap: 0.75rem;
  }
  
  .nav-link {
    font-size: 0.85rem;
  }

  .welcome-text {
    display: none;
  }
}
</style>
