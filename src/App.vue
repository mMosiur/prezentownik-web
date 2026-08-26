<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const { currentLang, changeLanguage } = useLanguage()

const showDisplayNameModal = ref(false)
const displayNameInput = ref('')
const isSavingDisplayName = ref(false)
const displayNameError = ref('')
const iconUrl = `${import.meta.env.BASE_URL}prezentownik-icon.svg`

async function handleLogout() {
  try {
    await authStore.logout()
  } finally {
    router.push({ name: 'home' })
  }
}

function openDisplayNameModal() {
  displayNameInput.value = authStore.user?.displayName ?? ''
  displayNameError.value = ''
  showDisplayNameModal.value = true
}

useEscapeKey(() => {
  if (showDisplayNameModal.value && !isSavingDisplayName.value) showDisplayNameModal.value = false
})

async function saveDisplayName() {
  if (isSavingDisplayName.value) return

  const trimmed = displayNameInput.value.trim()
  if (!trimmed) {
    displayNameError.value = t('app.displayNameModal.required')
    return
  }

  isSavingDisplayName.value = true
  displayNameError.value = ''
  try {
    await authStore.updateUser({ displayName: trimmed })
    showDisplayNameModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('app.displayNameModal.failed'))
    displayNameError.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || t('app.displayNameModal.failed')
  } finally {
    isSavingDisplayName.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="container nav-wrapper">
      <RouterLink to="/" class="brand">
        <img :src="iconUrl" alt="" class="brand-icon">
        <span>{{ t('nav.title') }}</span>
      </RouterLink>
      
      <nav class="main-nav">
        <template v-if="authStore.isAuthenticated">
          <span class="welcome-text">
            {{ t('nav.welcome', { name: authStore.user?.displayName ? `, ${authStore.user.displayName}` : '' }) }}
          </span>
          <button
            v-if="!authStore.user?.displayName"
            @click="openDisplayNameModal"
            class="btn btn-sm btn-outline set-name-btn"
            :title="t('nav.setNameTooltip')"
          >
            {{ t('nav.setName') }}
          </button>
          <RouterLink :to="{ name: 'dashboard' }" class="nav-link">{{ t('nav.dashboard') }}</RouterLink>
          <button @click="handleLogout" class="btn btn-outline btn-sm">{{ t('nav.logout') }}</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="nav-link">{{ t('nav.login') }}</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="btn btn-sm">{{ t('nav.register') }}</RouterLink>
        </template>

        <div class="lang-switcher">
          <button
            type="button"
            class="lang-btn"
            :class="{ active: currentLang === 'pl' }"
            @click="changeLanguage('pl')"
            title="Polski"
          >
            PL
          </button>
          <span class="lang-divider">/</span>
          <button
            type="button"
            class="lang-btn"
            :class="{ active: currentLang === 'en' }"
            @click="changeLanguage('en')"
            title="English"
          >
            EN
          </button>
        </div>
      </nav>
    </div>
  </header>

  <Teleport to="body">
    <div v-if="showDisplayNameModal" class="modal-overlay" @click="!isSavingDisplayName && (showDisplayNameModal = false)">
      <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="display-name-title">
        <div class="modal-header">
          <h2 id="display-name-title">{{ t('app.displayNameModal.title') }}</h2>
          <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isSavingDisplayName" @click="showDisplayNameModal = false">&times;</button>
        </div>

        <p class="modal-hint">
          {{ t('app.displayNameModal.hint') }}
        </p>

        <div v-if="displayNameError" class="alert alert-error mt-1" role="alert">
          <span class="alert-desc">{{ displayNameError }}</span>
        </div>

        <form @submit.prevent="saveDisplayName" class="mt-1">
          <div class="form-group">
            <label for="display-name-input">{{ t('app.displayNameModal.inputLabel') }}</label>
            <input
              id="display-name-input"
              v-model="displayNameInput"
              required
              :placeholder="t('app.displayNameModal.inputPlaceholder')"
              :disabled="isSavingDisplayName"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showDisplayNameModal = false" class="btn btn-outline" :disabled="isSavingDisplayName">
              {{ t('common.actions.cancel') }}
            </button>
            <button type="submit" class="btn" :disabled="isSavingDisplayName">
              {{ isSavingDisplayName ? t('common.actions.saving') : t('common.actions.save') }}
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

.lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  font-size: 0.85rem;
  font-weight: 600;
}

.lang-btn {
  background: none;
  border: none;
  padding: 0.15rem 0.35rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 4px;
  transition: background-color 0.15s, color 0.15s;
}

.lang-btn:hover {
  color: var(--color-accent);
}

.lang-btn.active {
  color: #fff;
  background-color: var(--color-accent);
}

.lang-divider {
  color: var(--color-border);
  font-size: 0.8rem;
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

  .brand-icon {
    width: 2rem;
    height: 2rem;
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
