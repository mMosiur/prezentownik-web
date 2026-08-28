<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useI18n()
const authStore = useAuthStore()
const { currentLang, changeLanguage, supportedLanguages } = useLanguage()

const iconUrl = `${import.meta.env.BASE_URL}favicon.svg`

const showColdStartHint = ref(false)
let coldStartTimer: ReturnType<typeof setTimeout> | null = null

function checkColdStartTimer() {
  if (authStore.isLoading) {
    if (!coldStartTimer) {
      coldStartTimer = setTimeout(() => {
        if (authStore.isLoading) {
          showColdStartHint.value = true
        }
      }, 2500)
    }
  } else {
    if (coldStartTimer) {
      clearTimeout(coldStartTimer)
      coldStartTimer = null
    }
    showColdStartHint.value = false
  }
}

onMounted(() => {
  checkColdStartTimer()
})

watch(() => authStore.isLoading, () => {
  checkColdStartTimer()
})

onUnmounted(() => {
  if (coldStartTimer) {
    clearTimeout(coldStartTimer)
  }
})
</script>

<template>
  <header class="app-header">
    <div class="container nav-wrapper">
      <RouterLink to="/" class="brand">
        <img :src="iconUrl" alt="" class="brand-icon">
        <span>{{ t('nav.title') }}</span>
      </RouterLink>
      
      <nav class="main-nav">
        <template v-if="authStore.isLoading">
          <span class="nav-loading-placeholder" aria-label="Loading">
            <span class="spinner spinner-sm" aria-hidden="true"></span>
          </span>
        </template>
        <template v-else-if="authStore.isAuthenticated">
          <RouterLink :to="{ name: 'dashboard' }" class="nav-link">{{ t('nav.dashboard') }}</RouterLink>
          <RouterLink :to="{ name: 'account' }" class="nav-link">{{ t('nav.account') }}</RouterLink>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="nav-link">{{ t('nav.login') }}</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="btn btn-sm">{{ t('nav.register') }}</RouterLink>
        </template>

        <div class="lang-selector">
          <select
            :value="currentLang"
            @change="changeLanguage(($event.target as HTMLSelectElement).value)"
            class="lang-select"
            :aria-label="t('nav.language')"
          >
            <option
              v-for="lang in supportedLanguages"
              :key="lang.code"
              :value="lang.code"
            >
              {{ lang.code.toUpperCase() }}
            </option>
          </select>
        </div>
      </nav>
    </div>
  </header>

  <main class="app-main">
    <div v-if="authStore.isLoading" class="container mt-2">
      <div class="card loading-state text-center" aria-live="polite" aria-busy="true">
        <span class="spinner spinner-lg" aria-hidden="true"></span>
        <p class="loading-text">{{ t('app.loading') }}</p>
        <p v-if="showColdStartHint" class="loading-subtext">
          {{ t('app.serverWakingUp') }}
        </p>
      </div>
    </div>
    <RouterView v-else />
  </main>
  
  <footer class="app-footer">
    <div class="container text-center">
      <p>{{ t('app.footerText') }}</p>
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
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
  text-decoration: none;
  letter-spacing: -0.5px;
}

.brand-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-loading-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.5rem;
}

.nav-link {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--color-accent);
}

.nav-link.router-link-active {
  color: var(--color-accent);
}

.btn-sm {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
}

.lang-selector {
  display: inline-flex;
  align-items: center;
}

.lang-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: var(--color-background-mute);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f6d68' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.55rem center;
  background-size: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.35rem 1.6rem 0.35rem 0.65rem;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.lang-select:hover {
  border-color: var(--color-border-hover);
  background-color: #ffffff;
}

.lang-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-soft);
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

@media (max-width: 640px) {
  .nav-wrapper {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .main-nav {
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: flex-end;
  }
}

@media (max-width: 480px) {
  .brand {
    font-size: 1.2rem;
    gap: 0.4rem;
  }

  .brand-icon {
    width: 1.75rem;
    height: 1.75rem;
  }
  
  .main-nav {
    gap: 0.5rem;
  }
  
  .nav-link {
    font-size: 0.85rem;
  }

  .btn-sm {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
  }

  .lang-select {
    padding: 0.25rem 1.4rem 0.25rem 0.5rem;
    font-size: 0.8rem;
    background-position: right 0.35rem center;
  }
}
</style>
