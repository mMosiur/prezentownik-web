<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="app-header">
    <div class="container nav-wrapper">
      <RouterLink to="/" class="brand">Prezentownik</RouterLink>
      
      <nav class="main-nav">
        <template v-if="authStore.isAuthenticated">
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
}
</style>
