<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useListStore, type ListSummary } from '@/stores/list'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import ShareListModal from '@/components/ShareListModal.vue'

const { t } = useI18n()
const listStore = useListStore()
const router = useRouter()

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

onMounted(async () => {
  await listStore.fetchLists()
})

useEscapeKey(() => {
  if (showCreateModal.value && !isCreating.value) showCreateModal.value = false
  else if (showEditModal.value && !isEditing.value) showEditModal.value = false
  else if (showDeleteModal.value && !isDeleting.value) showDeleteModal.value = false
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

const showShareModal = ref(false)
const listToShare = ref<ListSummary | null>(null)
function openShareModal(list: ListSummary) {
  listToShare.value = list
  showShareModal.value = true
}
</script>

<template>
  <div class="container">
    <div class="dashboard-header mt-2">
      <h1>{{ t('dashboard.title') }}</h1>
      <button @click="openCreateModal" class="btn">{{ t('dashboard.newList') }}</button>
    </div>

    <div v-if="listStore.isLoading && listStore.lists.length === 0" class="text-center mt-2">
      <p>{{ t('dashboard.loading') }}</p>
    </div>
    
    <div v-else-if="listStore.lists.length === 0" class="empty-state card text-center mt-2">
      <div class="empty-icon">📂</div>
      <h2>{{ t('dashboard.emptyTitle') }}</h2>
      <p class="mt-1">{{ t('dashboard.emptySubtitle') }}</p>
      <button @click="openCreateModal" class="btn mt-2">{{ t('dashboard.createFirstList') }}</button>
    </div>

    <div v-else class="list-grid mt-2">
      <div v-for="list in listStore.lists" :key="list.id" class="card list-card" @click="goToList(list.id)">
        <div class="card-content">
          <h3>{{ list.name }}</h3>
          <p v-if="list.description" class="description">{{ list.description }}</p>
        </div>
        <div class="card-footer" @click.stop>
          <button @click="goToList(list.id)" class="btn btn-sm btn-outline">{{ t('common.actions.manage') }}</button>
          <button @click="openShareModal(list)" class="btn btn-sm btn-outline">{{ t('common.actions.share') }}</button>
          <button @click="openDeleteModal(list)" class="btn btn-sm btn-outline btn-danger">{{ t('common.actions.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
        <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="create-list-title">
          <div class="modal-header">
            <h2 id="create-list-title">{{ t('dashboard.createModal.title') }}</h2>
            <button class="close-btn" :aria-label="t('common.actions.close')" @click="showCreateModal = false">&times;</button>
          </div>

          <div v-if="createError" class="alert alert-error mt-1" role="alert">
            <span class="alert-desc">{{ createError }}</span>
          </div>

          <form @submit.prevent="handleCreateList" class="mt-1" novalidate>
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
                {{ isCreating ? t('dashboard.createModal.submitting') : t('dashboard.createModal.submit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
        <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="edit-dashboard-list-title">
          <div class="modal-header">
            <h2 id="edit-dashboard-list-title">{{ t('dashboard.editModal.title') }}</h2>
            <button class="close-btn" :aria-label="t('common.actions.close')" @click="showEditModal = false">&times;</button>
          </div>

          <div v-if="editError" class="alert alert-error mt-1" role="alert">
            <span class="alert-desc">{{ editError }}</span>
          </div>

          <form @submit.prevent="handleUpdateList" class="mt-1" novalidate>
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
                {{ isEditing ? t('dashboard.editModal.submitting') : t('dashboard.editModal.submit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click="!isDeleting && (showDeleteModal = false)">
        <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-dashboard-list-title">
          <div class="modal-header">
            <h2 id="delete-dashboard-list-title">{{ t('dashboard.deleteModal.title') }}</h2>
            <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeleting" @click="showDeleteModal = false">&times;</button>
          </div>

          <div v-if="deleteError" class="alert alert-error mt-1" role="alert">
            <span class="alert-desc">{{ deleteError }}</span>
          </div>

          <div class="confirm-content mt-1">
            <p>
              <i18n-t keypath="dashboard.deleteModal.confirmMessage" tag="span">
                <template #name>
                  <strong>«{{ listToDelete?.name }}»</strong>
                </template>
              </i18n-t>
            </p>
            <p class="confirm-warning">
              {{ t('dashboard.deleteModal.warning') }}
            </p>
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
              {{ isDeleting ? t('dashboard.deleteModal.submitting') : t('dashboard.deleteModal.submit') }}
            </button>
          </div>
        </div>
      </div>
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
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.list-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  margin-bottom: 0;
  padding: 1.5rem;
}

.list-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.list-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.description {
  font-size: 0.95rem;
  color: #666;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.empty-state {
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.required-mark {
  color: #d63031;
  font-weight: bold;
}

.form-group.has-error input,
.form-group.has-error textarea {
  border-color: #d63031;
}

.field-error-msg {
  color: #d63031;
  font-size: 0.85rem;
  margin-top: 0.35rem;
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
  max-width: 500px;
  margin-bottom: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

.btn-danger {
  color: #d63031;
  border-color: #d63031;
}

.btn-danger:hover {
  background-color: rgba(214, 48, 49, 0.1);
}

.btn-danger-solid {
  background-color: #d63031;
  color: white;
  border: 1px solid #d63031;
}

.btn-danger-solid:hover:not(:disabled) {
  background-color: #c02626;
  border-color: #c02626;
  opacity: 1;
  transform: translateY(-1px);
}

.btn-danger-solid:disabled {
  background-color: #feb2b2;
  border-color: #feb2b2;
  cursor: not-allowed;
  transform: none;
}

.confirm-content {
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--color-heading);
}

.confirm-warning {
  color: #718096;
  font-size: 0.95rem;
  margin-top: 0.5rem;
}

@media (max-width: 480px) {
  .dashboard-header h1 {
    font-size: 1.75rem;
  }
  
  .list-grid {
    grid-template-columns: 1fr;
  }
}
</style>
