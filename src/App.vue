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
const { currentLang, changeLanguage, supportedLanguages } = useLanguage()

const showDisplayNameModal = ref(false)
const displayNameInput = ref('')
const isSavingDisplayName = ref(false)
const displayNameError = ref('')
const iconUrl = `${import.meta.env.BASE_URL}favicon.svg`

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

@media (max-width: 640px) {
  .nav-wrapper {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .main-nav {
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-end;
  }

  .welcome-text {
    display: none;
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
    gap: 0.35rem;
  }
  
  .nav-link {
    font-size: 0.85rem;
  }

  .btn-sm {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
  }

  .set-name-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
  }

  .lang-select {
    padding: 0.25rem 1.4rem 0.25rem 0.5rem;
    font-size: 0.8rem;
    background-position: right 0.35rem center;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .modal-actions .btn {
    width: 100%;
  }
}
</style>
