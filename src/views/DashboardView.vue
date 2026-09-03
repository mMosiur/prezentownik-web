<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useListStore, type ListSummary } from '@/stores/list'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useToast } from '@/composables/useToast'
import ShareListModal from '@/components/ShareListModal.vue'

const { t } = useI18n()
const listStore = useListStore()
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

const searchQuery = ref('')

const showCreateModal = ref(false)
const newList = ref({ name: '', description: '' })
const createError = ref('')
const createFieldErrors = ref<Record<string, string>>({})
const isCreating = ref(false)

const showEditModal = ref(false)
const editingListId = ref<string | null>(null)
const editListForm = ref({ name: '', description: '' })
const editError = ref('')
const editFieldErrors = ref<Record<string, string>>({})
const isEditing = ref(false)

const showDeleteModal = ref(false)
const listToDelete = ref<ListSummary | null>(null)
const deleteError = ref('')
const isDeleting = ref(false)

const showShareModal = ref(false)
const listToShare = ref<ListSummary | null>(null)

onMounted(async () => {
  await listStore.fetchLists()
})

useEscapeKey(() => {
  if (showCreateModal.value && !isCreating.value) showCreateModal.value = false
  else if (showEditModal.value && !isEditing.value) showEditModal.value = false
  else if (showDeleteModal.value && !isDeleting.value) showDeleteModal.value = false
})

const filteredLists = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return listStore.lists
  return listStore.lists.filter(l => 
    l.name.toLowerCase().includes(query) || 
    (l.description && l.description.toLowerCase().includes(query))
  )
})

const userGreetingName = computed(() => {
  return authStore.user?.displayName || authStore.user?.email?.split('@')[0] || ''
})

function openCreateModal() {
  newList.value = { name: '', description: '' }
  createError.value = ''
  createFieldErrors.value = {}
  showCreateModal.value = true
}

function clearCreateFieldError(field: string) {
  if (createFieldErrors.value[field]) {
    delete createFieldErrors.value[field]
  }
  if (createError.value) {
    createError.value = ''
  }
}

async function handleCreateList() {
  if (isCreating.value) return

  createError.value = ''
  createFieldErrors.value = {}

  const trimmedName = newList.value.name.trim()
  if (!trimmedName) {
    createFieldErrors.value.name = t('dashboard.createModal.nameRequired')
    return
  }

  isCreating.value = true
  try {
    const created = await listStore.createList({
      name: trimmedName,
      description: newList.value.description?.trim() || null
    })
    toast.success(t('common.toasts.listCreated'))
    showCreateModal.value = false
    newList.value = { name: '', description: '' }
    router.push({ name: 'list-manage', params: { listId: created.id } })
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('dashboard.createModal.failed'))
    createError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      createFieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!(createFieldErrors.value.name || createFieldErrors.value.description)
      if (!hasMatchingFieldError && !createError.value) {
        createError.value = Object.values(parsed.fieldErrors)[0] || t('dashboard.createModal.failed')
      }
    }
  } finally {
    isCreating.value = false
  }
}

function openEditModal(list: ListSummary) {
  editingListId.value = list.id
  editListForm.value = {
    name: list.name,
    description: list.description ?? ''
  }
  editError.value = ''
  editFieldErrors.value = {}
  showEditModal.value = true
}

function clearEditFieldError(field: string) {
  if (editFieldErrors.value[field]) {
    delete editFieldErrors.value[field]
  }
  if (editError.value) {
    editError.value = ''
  }
}

async function handleUpdateList() {
  if (isEditing.value || !editingListId.value) return

  editError.value = ''
  editFieldErrors.value = {}

  const trimmedName = editListForm.value.name.trim()
  if (!trimmedName) {
    editFieldErrors.value.name = t('dashboard.editModal.nameRequired')
    return
  }

  isEditing.value = true
  try {
    await listStore.updateList(editingListId.value, {
      name: trimmedName,
      description: editListForm.value.description?.trim() || null
    })
    toast.success(t('common.toasts.listUpdated'))
    showEditModal.value = false
    editingListId.value = null
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('dashboard.editModal.failed'))
    editError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      editFieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!(editFieldErrors.value.name || editFieldErrors.value.description)
      if (!hasMatchingFieldError && !editError.value) {
        editError.value = Object.values(parsed.fieldErrors)[0] || t('dashboard.editModal.failed')
      }
    }
  } finally {
    isEditing.value = false
  }
}

function openDeleteModal(list: ListSummary) {
  listToDelete.value = list
  deleteError.value = ''
  showDeleteModal.value = true
}

async function handleDeleteList() {
  if (isDeleting.value || !listToDelete.value) return

  deleteError.value = ''
  isDeleting.value = true
  try {
    await listStore.deleteList(listToDelete.value.id)
    toast.success(t('common.toasts.listDeleted'))
    showDeleteModal.value = false
    listToDelete.value = null
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('dashboard.deleteModal.failed'))
    deleteError.value = parsed.message
  } finally {
    isDeleting.value = false
  }
}

function goToList(id: string) {
  router.push({ name: 'list-manage', params: { listId: id } })
}

function openShareModal(list: ListSummary) {
  listToShare.value = list
  showShareModal.value = true
}
</script>

<template>
  <div class="container dashboard-container">
    <!-- Top Greeting Banner -->
    <div class="dashboard-hero card">
      <div class="hero-left">
        <div class="hero-avatar">👤</div>
        <div class="hero-text">
          <h1>
            <span v-if="userGreetingName">{{ t('nav.welcome', { name: `, ${userGreetingName}` }) }}</span>
            <span v-else>{{ t('dashboard.title') }}</span>
          </h1>
          <p class="hero-subtitle">
            <span class="count-badge">{{ listStore.lists.length }}</span>
            <span>{{ listStore.lists.length === 1 ? 'aktywna lista' : 'aktywne listy' }}</span>
          </p>
        </div>
      </div>
      <div class="hero-actions">
        <button @click="openCreateModal" class="btn btn-create-list">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{{ t('dashboard.newList') }}</span>
        </button>
      </div>
    </div>

    <!-- Search & Filters Toolbar (shown if lists exist) -->
    <div v-if="listStore.lists.length > 0" class="toolbar-wrapper mt-2">
      <div class="search-box">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          :placeholder="t('dashboard.searchPlaceholder')"
          :aria-label="t('dashboard.searchPlaceholder')"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search-btn"
          @click="searchQuery = ''"
          :title="t('dashboard.clearSearch')"
        >
          &times;
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="listStore.isLoading && listStore.lists.length === 0" class="loading-state card text-center mt-2" aria-live="polite" aria-busy="true">
      <span class="spinner spinner-lg spinner-accent" aria-hidden="true"></span>
      <p class="loading-text">{{ t('dashboard.loading') }}</p>
    </div>
    
    <!-- Empty State (No lists created yet) -->
    <div v-else-if="listStore.lists.length === 0" class="empty-state card text-center mt-2">
      <div class="empty-illustration">
        <span class="empty-emoji">🎁</span>
        <div class="empty-sparkle sparkle-1">✨</div>
        <div class="empty-sparkle sparkle-2">🌟</div>
      </div>
      <h2>{{ t('dashboard.emptyTitle') }}</h2>
      <p class="empty-desc mt-1">{{ t('dashboard.emptySubtitle') }}</p>
      <button @click="openCreateModal" class="btn btn-lg mt-2 btn-create-first">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>{{ t('dashboard.createFirstList') }}</span>
      </button>
    </div>

    <!-- Empty State (No search results) -->
    <div v-else-if="filteredLists.length === 0" class="empty-search-state card text-center mt-2">
      <div class="search-empty-icon">🔍</div>
      <h3>{{ t('dashboard.noSearchResults') }}</h3>
      <button @click="searchQuery = ''" class="btn btn-outline btn-sm mt-1">
        {{ t('dashboard.clearSearch') }}
      </button>
    </div>

    <!-- Lists Grid -->
    <TransitionGroup v-else name="list-item" tag="div" class="list-grid mt-2">
      <div
        v-for="list in filteredLists"
        :key="list.id"
        class="card list-card card-interactive"
        @click="goToList(list.id)"
      >
        <div class="card-content">
          <div class="list-card-header">
            <div class="list-icon-badge">
              <span>📝</span>
            </div>
            <div class="list-title-wrap">
              <h3 class="list-title">{{ list.name }}</h3>
            </div>
          </div>
          
          <p v-if="list.description" class="description">
            {{ list.description }}
          </p>
          <p v-else class="description description-empty">
            <em>Brak opisu</em>
          </p>
        </div>

        <div class="card-footer" @click.stop>
          <button @click="goToList(list.id)" class="btn btn-sm btn-outline btn-action">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>{{ t('common.actions.manage') }}</span>
          </button>
          <button @click="openShareModal(list)" class="btn btn-sm btn-outline btn-action">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>{{ t('common.actions.share') }}</span>
          </button>
          <button @click="openDeleteModal(list)" class="btn btn-sm btn-outline btn-danger btn-action" :title="t('common.actions.delete')">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>{{ t('common.actions.delete') }}</span>
          </button>
        </div>
      </div>
    </TransitionGroup>

    <!-- Create Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
          <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="create-list-title">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-title-icon">✨</span>
                <h2 id="create-list-title">{{ t('dashboard.createModal.title') }}</h2>
              </div>
              <button class="close-btn" :aria-label="t('common.actions.close')" @click="showCreateModal = false">&times;</button>
            </div>

            <div v-if="createError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ createError }}</span>
            </div>

            <form @submit.prevent="handleCreateList" class="mt-2" novalidate>
              <div class="form-group" :class="{ 'has-error': !!createFieldErrors.name }">
                <label for="new-list-name">
                  {{ t('dashboard.createModal.nameLabel') }} <span class="required-mark">*</span>
                </label>
                <input
                  id="new-list-name"
                  v-model="newList.name"
                  required
                  :placeholder="t('dashboard.createModal.namePlaceholder')"
                  :disabled="isCreating"
                  @input="clearCreateFieldError('name')"
                />
                <p v-if="createFieldErrors.name" class="field-error-msg" role="alert">
                  {{ createFieldErrors.name }}
                </p>
              </div>
              <div class="form-group">
                <label for="new-list-description">{{ t('dashboard.createModal.descriptionLabel') }}</label>
                <textarea
                  id="new-list-description"
                  v-model="newList.description"
                  rows="3"
                  :placeholder="t('dashboard.createModal.descriptionPlaceholder')"
                  :disabled="isCreating"
                ></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" @click="showCreateModal = false" class="btn btn-outline" :disabled="isCreating">
                  {{ t('common.actions.cancel') }}
                </button>
                <button type="submit" class="btn" :disabled="isCreating">
                  <span v-if="isCreating" class="spinner spinner-sm" aria-hidden="true"></span>
                  <span>{{ isCreating ? t('dashboard.createModal.submitting') : t('dashboard.createModal.submit') }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
          <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="edit-dashboard-list-title">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-title-icon">✏️</span>
                <h2 id="edit-dashboard-list-title">{{ t('dashboard.editModal.title') }}</h2>
              </div>
              <button class="close-btn" :aria-label="t('common.actions.close')" @click="showEditModal = false">&times;</button>
            </div>

            <div v-if="editError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ editError }}</span>
            </div>

            <form @submit.prevent="handleUpdateList" class="mt-2" novalidate>
              <div class="form-group" :class="{ 'has-error': !!editFieldErrors.name }">
                <label for="edit-dashboard-list-name">
                  {{ t('dashboard.editModal.nameLabel') }} <span class="required-mark">*</span>
                </label>
                <input
                  id="edit-dashboard-list-name"
                  v-model="editListForm.name"
                  required
                  :placeholder="t('dashboard.editModal.namePlaceholder')"
                  :disabled="isEditing"
                  @input="clearEditFieldError('name')"
                />
                <p v-if="editFieldErrors.name" class="field-error-msg" role="alert">
                  {{ editFieldErrors.name }}
                </p>
              </div>
              <div class="form-group">
                <label for="edit-dashboard-list-description">{{ t('dashboard.editModal.descriptionLabel') }}</label>
                <textarea
                  id="edit-dashboard-list-description"
                  v-model="editListForm.description"
                  rows="3"
                  :placeholder="t('dashboard.editModal.descriptionPlaceholder')"
                  :disabled="isEditing"
                ></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" @click="showEditModal = false" class="btn btn-outline" :disabled="isEditing">
                  {{ t('common.actions.cancel') }}
                </button>
                <button type="submit" class="btn" :disabled="isEditing">
                  <span v-if="isEditing" class="spinner spinner-sm" aria-hidden="true"></span>
                  <span>{{ isEditing ? t('dashboard.editModal.submitting') : t('dashboard.editModal.submit') }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showDeleteModal" class="modal-overlay" @click="!isDeleting && (showDeleteModal = false)">
          <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-dashboard-list-title">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-title-icon">⚠️</span>
                <h2 id="delete-dashboard-list-title">{{ t('dashboard.deleteModal.title') }}</h2>
              </div>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeleting" @click="showDeleteModal = false">&times;</button>
            </div>

            <div v-if="deleteError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ deleteError }}</span>
            </div>

            <div class="confirm-content mt-1">
              <p class="confirm-message">
                <i18n-t keypath="dashboard.deleteModal.confirmMessage" tag="span" scope="global">
                  <template #name>
                    <strong>«{{ listToDelete?.name }}»</strong>
                  </template>
                </i18n-t>
              </p>
              <div class="confirm-warning-box mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>{{ t('dashboard.deleteModal.warning') }}</span>
              </div>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                @click="showDeleteModal = false"
                class="btn btn-outline"
                :disabled="isDeleting"
              >
                {{ t('common.actions.cancel') }}
              </button>
              <button
                type="button"
                @click="handleDeleteList"
                class="btn btn-danger-solid"
                :disabled="isDeleting"
              >
                <span v-if="isDeleting" class="spinner spinner-sm" aria-hidden="true"></span>
                <span>{{ isDeleting ? t('dashboard.deleteModal.submitting') : t('dashboard.deleteModal.submit') }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ShareListModal
      v-if="showShareModal && listToShare"
      :list-id="listToShare.id"
      :list-name="listToShare.name"
      @close="showShareModal = false"
    />
  </div>
</template>

<style scoped>
.dashboard-container {
  padding-bottom: 3rem;
}

/* Dashboard Hero Banner */
.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 242, 235, 0.95) 100%);
  border: 1px solid var(--color-border);
  padding: 1.75rem 2rem;
  margin-top: 1rem;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.hero-avatar {
  font-size: 2.2rem;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  background: var(--color-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.hero-text h1 {
  font-size: 1.65rem;
  margin-bottom: 0.2rem;
  color: var(--color-heading);
}

.hero-subtitle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.6rem;
  background: var(--color-accent);
  color: #ffffff;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
}

.btn-create-list {
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
}

/* Toolbar & Search */
.toolbar-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 460px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-light);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.7rem 2.4rem 0.7rem 2.6rem;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-background-elevated);
  font-size: 0.92rem;
  color: var(--color-heading);
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-full);
}

.clear-search-btn:hover {
  color: var(--color-heading);
}

/* List Grid */
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1.5rem;
}

.list-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  margin-bottom: 0;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
}

.list-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 0.75rem;
}

.list-icon-badge {
  font-size: 1.5rem;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.list-title-wrap {
  flex: 1;
}

.list-title {
  font-size: 1.22rem;
  color: var(--color-heading);
  line-height: 1.3;
}

.description {
  font-size: 0.92rem;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 0.25rem;
}

.description-empty {
  font-style: italic;
  opacity: 0.6;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.btn-action {
  flex: 1;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
}

/* Empty States */
.empty-state {
  padding: 3.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-illustration {
  position: relative;
  display: inline-block;
  margin-bottom: 1.25rem;
}

.empty-emoji {
  font-size: 4.5rem;
  display: block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-sparkle {
  position: absolute;
  font-size: 1.4rem;
  animation: pulse 2s ease-in-out infinite alternate;
}

.sparkle-1 {
  top: -4px;
  right: -10px;
}

.sparkle-2 {
  bottom: 0px;
  left: -10px;
  animation-delay: 1s;
}

.empty-desc {
  max-width: 440px;
  color: var(--color-text-muted);
}

.btn-create-first {
  padding: 0.85rem 1.75rem;
}

.empty-search-state {
  padding: 2.5rem 1.5rem;
}

.search-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 45, 61, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 500px;
  margin-bottom: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title-icon {
  font-size: 1.4rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-heading);
}

.confirm-message {
  font-size: 1.05rem;
  color: var(--color-heading);
}

.confirm-warning-box {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 159, 0, 0.1);
  border: 1px solid rgba(245, 159, 0, 0.3);
  border-radius: var(--radius-md);
  color: #b36b00;
  font-size: 0.9rem;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.btn-danger-solid {
  background: var(--color-danger);
  color: #ffffff;
}

.btn-danger-solid:hover:not(:disabled) {
  background: var(--color-danger-hover);
  box-shadow: 0 4px 14px rgba(224, 49, 49, 0.35);
}

/* Modal animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 600px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: stretch;
    padding: 1.25rem 1.5rem;
  }

  .btn-create-list {
    width: 100%;
  }

  .card-footer {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
  }
}
</style>