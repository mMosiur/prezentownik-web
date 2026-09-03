<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useLanguage } from '@/composables/useLanguage'
import ToastContainer from '@/components/ToastContainer.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const { currentLang, changeLanguage, supportedLanguages } = useLanguage()

const iconUrl = `${import.meta.env.BASE_URL}favicon.svg`

const isMobileMenuOpen = ref(false)
const showColdStartHint = ref(false)
let coldStartTimer: ReturnType<typeof setTimeout> | null = null

// Close mobile menu when route changes
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const userInitials = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.email || ''
  if (!name) return '?'
  const parts = name.trim().split(/[\s@]+/)
  const first = parts[0]
  const second = parts[1]
  if (first && second && first.length > 0 && second.length > 0) {
    return (first[0]! + second[0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

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
      <RouterLink to="/" class="brand" @click="isMobileMenuOpen = false">
        <div class="brand-icon-wrapper">
          <img :src="iconUrl" alt="" class="brand-icon" />
        </div>
        <span class="brand-name">{{ t('nav.title') }}</span>
      </RouterLink>

      <!-- Desktop Navigation -->
      <nav class="main-nav desktop-nav">
        <template v-if="authStore.isLoading">
          <span class="nav-loading-placeholder" aria-label="Loading">
            <span class="spinner spinner-accent spinner-sm" aria-hidden="true"></span>
          </span>
        </template>
        <template v-else-if="authStore.isAuthenticated">
          <RouterLink :to="{ name: 'dashboard' }" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>{{ t('nav.dashboard') }}</span>
          </RouterLink>
          <RouterLink :to="{ name: 'account' }" class="nav-link user-profile-link">
            <div class="user-avatar-pill">
              <span class="user-initials">{{ userInitials }}</span>
              <span class="user-name-text">{{ authStore.user?.displayName || t('nav.account') }}</span>
            </div>
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="nav-link">{{ t('nav.login') }}</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="btn btn-sm btn-register-nav">{{ t('nav.register') }}</RouterLink>
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

      <!-- Mobile Menu Button -->
      <div class="mobile-nav-actions">
        <div class="lang-selector mobile-lang">
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

        <button
          type="button"
          class="hamburger-btn"
          :aria-expanded="isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? t('nav.menuClose') : t('nav.menuOpen')"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <span class="hamburger-icon" :class="{ 'is-active': isMobileMenuOpen }"></span>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer Menu -->
    <Transition name="mobile-menu">
      <div v-if="isMobileMenuOpen" class="mobile-drawer">
        <nav class="mobile-nav-links">
          <template v-if="authStore.isLoading">
            <div class="mobile-nav-loading">
              <span class="spinner spinner-accent spinner-sm"></span>
            </div>
          </template>
          <template v-else-if="authStore.isAuthenticated">
            <RouterLink :to="{ name: 'dashboard' }" class="mobile-nav-link" @click="isMobileMenuOpen = false">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>{{ t('nav.dashboard') }}</span>
            </RouterLink>
            <RouterLink :to="{ name: 'account' }" class="mobile-nav-link" @click="isMobileMenuOpen = false">
              <div class="user-avatar-mini">{{ userInitials }}</div>
              <span>{{ authStore.user?.displayName || t('nav.account') }}</span>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="{ name: 'login' }" class="mobile-nav-link" @click="isMobileMenuOpen = false">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink :to="{ name: 'register' }" class="btn btn-block mt-1" @click="isMobileMenuOpen = false">
              {{ t('nav.register') }}
            </RouterLink>
          </template>
        </nav>
      </div>
    </Transition>
  </header>

  <main class="app-main">
    <div v-if="authStore.isLoading" class="container mt-2">
      <div class="card loading-state text-center" aria-live="polite" aria-busy="true">
        <span class="spinner spinner-accent spinner-lg" aria-hidden="true"></span>
        <p class="loading-text">{{ t('app.loading') }}</p>
        <p v-if="showColdStartHint" class="loading-subtext">
          {{ t('app.serverWakingUp') }}
        </p>
      </div>
    </div>
    <RouterView v-else v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
  
  <footer class="app-footer">
    <div class="container text-center">
      <p class="footer-copy">{{ t('app.footerText') }}</p>
    </div>
  </footer>

  <ToastContainer />
</template>

<style scoped>
.app-header {
  background: var(--color-background-soft);
  box-shadow: var(--shadow-xs);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all var(--transition-normal);
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  group: brand;
}

.brand-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.brand:hover .brand-icon-wrapper {
  transform: rotate(-8deg) scale(1.08);
}

.brand-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  filter: drop-shadow(0 2px 4px rgba(59, 119, 108, 0.2));
}

.brand-name {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: -0.02em;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
}

.user-profile-link {
  padding: 0.2rem 0.5rem 0.2rem 0.3rem;
}

.user-avatar-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-initials {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name-text {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-register-nav {
  padding: 0.45rem 1.1rem;
  min-height: 38px;
}

.lang-selector {
  display: inline-flex;
  align-items: center;
}

.lang-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: var(--color-background-elevated);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233b776c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.55rem center;
  background-size: 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.35rem 1.6rem 0.35rem 0.65rem;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-select:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(59, 119, 108, 0.12);
}

.lang-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

/* Mobile Nav Styles */
.mobile-nav-actions {
  display: none;
  align-items: center;
  gap: 0.5rem;
}

.hamburger-btn {
  background: transparent;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  min-height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.hamburger-btn:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}

.hamburger-icon {
  display: block;
  position: relative;
  width: 18px;
  height: 2px;
  background-color: var(--color-heading);
  transition: background-color 0.2s ease;
}

.hamburger-icon::before,
.hamburger-icon::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 2px;
  background-color: var(--color-heading);
  transition: transform 0.2s ease, top 0.2s ease;
}

.hamburger-icon::before {
  top: -5px;
}

.hamburger-icon::after {
  top: 5px;
}

.hamburger-icon.is-active {
  background-color: transparent;
}

.hamburger-icon.is-active::before {
  top: 0;
  transform: rotate(45deg);
}

.hamburger-icon.is-active::after {
  top: 0;
  transform: rotate(-45deg);
}

.mobile-drawer {
  background: var(--color-background-elevated);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  padding: 1rem 1.25rem 1.5rem;
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-heading);
  transition: all var(--transition-fast);
}

.mobile-nav-link:hover,
.mobile-nav-link.router-link-active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.user-avatar-mini {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: max-height 0.3s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 280px;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  max-height: 0;
  opacity: 0;
}

.app-main {
  flex: 1;
  padding-top: 0.5rem;
}

.app-footer {
  padding: 2.5rem 0 2rem;
  color: var(--color-text-light);
  font-size: 0.88rem;
  border-top: 1px solid var(--color-border);
  margin-top: 3rem;
}

.footer-copy {
  margin: 0;
}

@media (max-width: 680px) {
  .desktop-nav {
    display: none;
  }

  .mobile-nav-actions {
    display: flex;
  }

  .brand-name {
    font-size: 1.3rem;
  }

  .brand-icon {
    width: 2rem;
    height: 2rem;
  }
}
</style>
