<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useListStore, type Item, type UpsertItemRequest, type UpdateListRequest } from '@/stores/list'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import ShareListModal from '@/components/ShareListModal.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const listStore = useListStore()
const authStore = useAuthStore()
const listId = route.params.listId as string

const showShareModal = ref(false)
const redirectedFromPublic = ref(route.query.fromPublic === '1')
const isNotOwner = ref(false)

const showItemModal = ref(false)
const editingItem = ref<Item | null>(null)
const isSavingItem = ref(false)
const itemFormError = ref('')
const itemForm = ref<{
  name: string
  description: string | null
  type: number
  targetQuantity: number | null
}>({
  name: '',
  description: '',
  type: 0,
  targetQuantity: 1
})

const showEditListModal = ref(false)
const isSavingList = ref(false)
const listEditError = ref('')
const listEditFieldErrors = ref<Record<string, string>>({})
const listForm = ref<{
  name: string
  description: string
}>({
  name: '',
  description: ''
})

const showDeleteListModal = ref(false)
const isDeletingList = ref(false)
const deleteListError = ref('')

const showDeleteItemModal = ref(false)
const itemToDelete = ref<Item | null>(null)
const isDeletingItem = ref(false)
const deleteItemError = ref('')

const isReordering = ref(false)
const reorderError = ref('')
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

onMounted(async () => {
  try {
    await listStore.fetchListDetails(listId)
  } catch (err: unknown) {
    // 401/403 means we're not logged in as the list's owner (or not logged
    // in at all) - show a dedicated notice instead of a confusing redirect.
    // 404 is treated the same way, since the backend hides other people's
    // lists behind a generic "not found" to avoid leaking their existence.
    if (axios.isAxiosError(err) && [401, 403, 404].includes(err.response?.status ?? 0)) {
      isNotOwner.value = true
    }
  }
})

useEscapeKey(() => {
  if (showShareModal.value) showShareModal.value = false
  else if (showItemModal.value && !isSavingItem.value) showItemModal.value = false
  else if (showEditListModal.value && !isSavingList.value) showEditListModal.value = false
  else if (showDeleteListModal.value && !isDeletingList.value) showDeleteListModal.value = false
  else if (showDeleteItemModal.value && !isDeletingItem.value) showDeleteItemModal.value = false
})

function dismissRedirectNotice() {
  redirectedFromPublic.value = false
  router.replace({ name: 'list-manage', params: { listId } })
}

function openEditList() {
  if (!listStore.currentList) return
  listForm.value = {
    name: listStore.currentList.name,
    description: listStore.currentList.description ?? ''
  }
  listEditError.value = ''
  listEditFieldErrors.value = {}
  showEditListModal.value = true
}

function clearListFieldError(field: string) {
  if (listEditFieldErrors.value[field]) {
    delete listEditFieldErrors.value[field]
  }
  if (listEditError.value) {
    listEditError.value = ''
  }
}

async function saveListDetails() {
  if (isSavingList.value) return

  listEditError.value = ''
  listEditFieldErrors.value = {}

  const trimmedName = listForm.value.name.trim()
  if (!trimmedName) {
    listEditFieldErrors.value.name = t('listManage.editListModal.nameRequired')
    return
  }

  isSavingList.value = true
  try {
    const payload: UpdateListRequest = {
      name: trimmedName,
      description: listForm.value.description?.trim() || null
    }
    await listStore.updateList(listId, payload)
    showEditListModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('listManage.editListModal.failed'))
    listEditError.value = parsed.message
    if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
      listEditFieldErrors.value = { ...parsed.fieldErrors }
      const hasMatchingFieldError = !!(listEditFieldErrors.value.name || listEditFieldErrors.value.description)
      if (!hasMatchingFieldError && !listEditError.value) {
        listEditError.value = Object.values(parsed.fieldErrors)[0] || t('listManage.editListModal.failed')
      }
    }
  } finally {
    isSavingList.value = false
  }
}

function openDeleteListModal() {
  deleteListError.value = ''
  showDeleteListModal.value = true
}

async function confirmDeleteList() {
  if (isDeletingList.value || !listStore.currentList) return

  deleteListError.value = ''
  isDeletingList.value = true
  try {
    await listStore.deleteList(listId)
    showDeleteListModal.value = false
    router.push({ name: 'dashboard' })
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('listManage.deleteListModal.failed'))
    deleteListError.value = parsed.message
  } finally {
    isDeletingList.value = false
  }
}

function openAddItem() {
  editingItem.value = null
  itemFormError.value = ''
  itemForm.value = {
    name: '',
    description: '',
    type: 0,
    targetQuantity: 1
  }
  showItemModal.value = true
}

function openEditItem(item: Item) {
  editingItem.value = item
  itemFormError.value = ''
  itemForm.value = {
    name: item.name,
    description: item.description ?? '',
    type: item.type,
    targetQuantity: item.targetQuantity ? Number(item.targetQuantity) : (item.type === 0 ? 1 : null)
  }
  showItemModal.value = true
}

async function saveItem() {
  if (isSavingItem.value) return

  itemFormError.value = ''
  isSavingItem.value = true
  try {
    const payload: UpsertItemRequest = {
      name: itemForm.value.name,
      description: itemForm.value.description || null,
      type: itemForm.value.type,
      targetQuantity: itemForm.value.type === 1 ? Number(itemForm.value.targetQuantity) : (itemForm.value.type === 0 ? 1 : null)
    }
    if (editingItem.value) {
      await listStore.updateItem(listId, editingItem.value.id, payload)
    } else {
      await listStore.addItem(listId, payload)
    }
    showItemModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('listManage.itemModal.failed'))
    itemFormError.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || t('listManage.itemModal.failed')
  } finally {
    isSavingItem.value = false
  }
}

function openDeleteItemModal(item: Item) {
  itemToDelete.value = item
  deleteItemError.value = ''
  showDeleteItemModal.value = true
}

async function confirmDeleteItem() {
  if (isDeletingItem.value || !itemToDelete.value) return

  deleteItemError.value = ''
  isDeletingItem.value = true
  try {
    await listStore.deleteItem(listId, itemToDelete.value.id)
    showDeleteItemModal.value = false
    itemToDelete.value = null
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('listManage.deleteItemModal.failed'))
    deleteItemError.value = parsed.message
  } finally {
    isDeletingItem.value = false
  }
}

async function moveItem(index: number, direction: 'up' | 'down') {
  const items = listStore.currentList?.items
  if (!items || isReordering.value) return
  
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= items.length) return

  const itemIds = items.map(i => i.id)
  const [movedId] = itemIds.splice(index, 1)
  if (movedId) {
    itemIds.splice(newIndex, 0, movedId)
    isReordering.value = true
    reorderError.value = ''
    try {
      await listStore.reorderItems(listId, itemIds)
    } catch (err: unknown) {
      const parsed = parseApiError(err, t('listManage.reorderFailed'))
      reorderError.value = parsed.message
    } finally {
      isReordering.value = false
    }
  }
}

function onDragStart(event: DragEvent, index: number) {
  if (isReordering.value) {
    event.preventDefault()
    return
  }
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function onDragLeave(_event: DragEvent, index: number) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

async function onDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()
  const fromIndex = draggedIndex.value
  draggedIndex.value = null
  dragOverIndex.value = null

  if (fromIndex === null || fromIndex === targetIndex || isReordering.value) return

  const items = listStore.currentList?.items
  if (!items) return

  const itemIds = items.map(i => i.id)
  const [movedId] = itemIds.splice(fromIndex, 1)
  if (movedId) {
    itemIds.splice(targetIndex, 0, movedId)
    isReordering.value = true
    reorderError.value = ''
    try {
      await listStore.reorderItems(listId, itemIds)
    } catch (err: unknown) {
      const parsed = parseApiError(err, t('listManage.reorderFailed'))
      reorderError.value = parsed.message
    } finally {
      isReordering.value = false
    }
  }
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

function getItemTypeName(type: number) {
  switch (type) {
    case 0: return t('listManage.itemTypes.single')
    case 1: return t('listManage.itemTypes.quantity')
    case 2: return t('listManage.itemTypes.unlimited')
    default: return t('listManage.itemTypes.unknown')
  }
}
</script>

<template>
  <div class="container mt-2">
    <div v-if="listStore.currentList && listStore.currentList.id === listId">
      <div class="navigation-header">
        <RouterLink :to="{ name: 'dashboard' }" class="back-link">&larr; {{ t('listManage.backToDashboard') }}</RouterLink>
      </div>

      <div v-if="redirectedFromPublic" class="alert alert-info mt-1" role="status">
        <span class="alert-desc">{{ t('listManage.redirectNotice') }}</span>
        <button class="close-btn" :aria-label="t('common.actions.close')" @click="dismissRedirectNotice">&times;</button>
      </div>

      <div class="list-details-header card mt-1">
        <div class="header-content">
          <div class="header-title-row">
            <h1>{{ listStore.currentList.name }}</h1>
            <button
              @click="openEditList"
              class="btn-icon-edit"
              :title="t('listManage.editListTooltip')"
              :aria-label="t('listManage.editListTooltip')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <p v-if="listStore.currentList.description" class="list-description-text">{{ listStore.currentList.description }}</p>
        </div>
        <div class="header-actions">
          <button @click="showShareModal = true" class="btn btn-outline">{{ t('common.actions.share') }}</button>
          <button @click="openAddItem" class="btn">{{ t('listManage.addItem') }}</button>
          <button @click="openDeleteListModal" class="btn btn-outline btn-danger">{{ t('listManage.deleteList') }}</button>
        </div>
      </div>

      <div v-if="listStore.currentList.items.length === 0" class="empty-state text-center mt-2">
        <div class="empty-icon">🎁</div>
        <h3>{{ t('listManage.emptyTitle') }}</h3>
        <p>{{ t('listManage.emptySubtitle') }}</p>
        <button @click="openAddItem" class="btn btn-outline mt-1">{{ t('listManage.addGift') }}</button>
      </div>

      <template v-else>
        <div v-if="reorderError" class="alert alert-error mt-2" role="alert">
          <span class="alert-desc">{{ reorderError }}</span>
          <button class="close-btn" :aria-label="t('common.actions.close')" @click="reorderError = ''">&times;</button>
        </div>

        <div class="items-list mt-2">
        <div
          v-for="(item, index) in listStore.currentList.items"
          :key="item.id"
          class="card item-card"
          :class="{
            'is-dragging': draggedIndex === index,
            'drag-over': dragOverIndex === index
          }"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragenter="onDragOver($event, index)"
          @dragleave="onDragLeave($event, index)"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
        >
          <div class="item-order" :title="t('listManage.dragTooltip')">
            <button
              @click.stop="moveItem(index, 'up')"
              :disabled="index === 0 || isReordering"
              class="order-btn"
              :title="t('listManage.moveUp')"
              :aria-label="t('listManage.moveUp')"
            >
              &utrif;
            </button>
            <span class="order-number">{{ index + 1 }}</span>
            <button
              @click.stop="moveItem(index, 'down')"
              :disabled="index === listStore.currentList.items.length - 1 || isReordering"
              class="order-btn"
              :title="t('listManage.moveDown')"
              :aria-label="t('listManage.moveDown')"
            >
              &dtrif;
            </button>
          </div>
          
          <div class="item-content">
            <div class="item-main">
              <h3>{{ item.name }}</h3>
              <p class="item-type">{{ getItemTypeName(item.type) }} <span v-if="item.type === 1">({{ t('listManage.quantitySuffix', { qty: item.targetQuantity }) }})</span></p>
              <p v-if="item.description" class="item-description">{{ item.description }}</p>
            </div>
            
            <div class="item-actions">
              <button @click.stop="openEditItem(item)" class="btn btn-sm btn-outline">{{ t('common.actions.edit') }}</button>
              <button @click.stop="openDeleteItemModal(item)" class="btn btn-sm btn-outline btn-danger">{{ t('common.actions.delete') }}</button>
            </div>
          </div>
        </div>
        </div>
      </template>

      <!-- Edit List Modal -->
      <Teleport to="body">
        <div v-if="showEditListModal" class="modal-overlay" @click="showEditListModal = false">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="edit-list-title">
            <div class="modal-header">
              <h2 id="edit-list-title">{{ t('listManage.editListModal.title') }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" @click="showEditListModal = false">&times;</button>
            </div>

            <div v-if="listEditError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ listEditError }}</span>
            </div>

            <form @submit.prevent="saveListDetails" class="mt-1" novalidate>
              <div class="form-group" :class="{ 'has-error': !!listEditFieldErrors.name }">
                <label for="edit-list-name">
                  {{ t('listManage.editListModal.nameLabel') }} <span class="required-mark">*</span>
                </label>
                <input
                  id="edit-list-name"
                  v-model="listForm.name"
                  required
                  :placeholder="t('listManage.editListModal.namePlaceholder')"
                  :disabled="isSavingList"
                  @input="clearListFieldError('name')"
                />
                <p v-if="listEditFieldErrors.name" class="field-error-msg" role="alert">
                  {{ listEditFieldErrors.name }}
                </p>
              </div>

              <div class="form-group">
                <label for="edit-list-description">{{ t('listManage.editListModal.descriptionLabel') }}</label>
                <textarea
                  id="edit-list-description"
                  v-model="listForm.description"
                  rows="3"
                  :placeholder="t('listManage.editListModal.descriptionPlaceholder')"
                  :disabled="isSavingList"
                ></textarea>
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  @click="showEditListModal = false"
                  class="btn btn-outline"
                  :disabled="isSavingList"
                >
                  {{ t('common.actions.cancel') }}
                </button>
                <button
                  type="submit"
                  class="btn"
                  :disabled="isSavingList"
                >
                  {{ isSavingList ? t('common.actions.saving') : t('common.actions.saveChanges') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Item Modal -->
      <Teleport to="body">
        <div v-if="showItemModal" class="modal-overlay" @click="!isSavingItem && (showItemModal = false)">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
            <div class="modal-header">
              <h2 id="item-modal-title">{{ editingItem ? t('listManage.itemModal.titleEdit') : t('listManage.itemModal.titleAdd') }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isSavingItem" @click="showItemModal = false">&times;</button>
            </div>

            <div v-if="itemFormError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ itemFormError }}</span>
            </div>

            <form @submit.prevent="saveItem" class="mt-1">
              <div class="form-group">
                <label>{{ t('listManage.itemModal.nameLabel') }}</label>
                <input v-model="itemForm.name" required :placeholder="t('listManage.itemModal.namePlaceholder')" />
              </div>
              <div class="form-group">
                <label>{{ t('listManage.itemModal.descriptionLabel') }}</label>
                <textarea v-model="itemForm.description" rows="3" :placeholder="t('listManage.itemModal.descriptionPlaceholder')"></textarea>
              </div>
              <div class="form-group">
                <label>{{ t('listManage.itemModal.typeLabel') }}</label>
                <select v-model="itemForm.type">
                  <option :value="0">{{ t('listManage.itemModal.typeOptionSingle') }}</option>
                  <option :value="1">{{ t('listManage.itemModal.typeOptionQuantity') }}</option>
                  <option :value="2">{{ t('listManage.itemModal.typeOptionUnlimited') }}</option>
                </select>
              </div>
              <div v-if="itemForm.type === 1" class="form-group">
                <label>{{ t('listManage.itemModal.targetQuantityLabel') }}</label>
                <input v-model="itemForm.targetQuantity" type="number" min="1" required />
              </div>
              <div class="modal-actions">
                <button type="button" @click="showItemModal = false" class="btn btn-outline">{{ t('common.actions.cancel') }}</button>
                <button type="submit" class="btn">{{ t('common.actions.save') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Delete List Modal -->
      <Teleport to="body">
        <div v-if="showDeleteListModal" class="modal-overlay" @click="!isDeletingList && (showDeleteListModal = false)">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-manage-list-title">
            <div class="modal-header">
              <h2 id="delete-manage-list-title">{{ t('listManage.deleteListModal.title') }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeletingList" @click="showDeleteListModal = false">&times;</button>
            </div>

            <div v-if="deleteListError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ deleteListError }}</span>
            </div>

            <div class="confirm-content mt-1">
              <p>
                <i18n-t keypath="listManage.deleteListModal.confirmMessage" tag="span">
                  <template #name>
                    <strong>«{{ listStore.currentList.name }}»</strong>
                  </template>
                </i18n-t>
              </p>
              <p class="confirm-warning">
                {{ t('listManage.deleteListModal.warning') }}
              </p>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                @click="showDeleteListModal = false"
                class="btn btn-outline"
                :disabled="isDeletingList"
              >
                {{ t('common.actions.cancel') }}
              </button>
              <button
                type="button"
                @click="confirmDeleteList"
                class="btn btn-danger-solid"
                :disabled="isDeletingList"
              >
                {{ isDeletingList ? t('listManage.deleteListModal.submitting') : t('listManage.deleteListModal.submit') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Delete Item Modal -->
      <Teleport to="body">
        <div v-if="showDeleteItemModal" class="modal-overlay" @click="!isDeletingItem && (showDeleteItemModal = false)">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-item-title">
            <div class="modal-header">
              <h2 id="delete-item-title">{{ t('listManage.deleteItemModal.title') }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeletingItem" @click="showDeleteItemModal = false">&times;</button>
            </div>

            <div v-if="deleteItemError" class="alert alert-error mt-1" role="alert">
              <span class="alert-desc">{{ deleteItemError }}</span>
            </div>

            <div class="confirm-content mt-1">
              <p>
                <i18n-t keypath="listManage.deleteItemModal.confirmMessage" tag="span">
                  <template #name>
                    <strong>«{{ itemToDelete?.name }}»</strong>
                  </template>
                </i18n-t>
              </p>
              <p class="confirm-warning">
                {{ t('listManage.deleteItemModal.warning') }}
              </p>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                @click="showDeleteItemModal = false"
                class="btn btn-outline"
                :disabled="isDeletingItem"
              >
                {{ t('common.actions.cancel') }}
              </button>
              <button
                type="button"
                @click="confirmDeleteItem"
                class="btn btn-danger-solid"
                :disabled="isDeletingItem"
              >
                {{ isDeletingItem ? t('listManage.deleteItemModal.submitting') : t('listManage.deleteItemModal.submit') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <ShareListModal
        v-if="showShareModal"
        :list-id="listId"
        :list-name="listStore.currentList.name"
        @close="showShareModal = false"
      />
    </div>
    <div v-else-if="isNotOwner" class="not-owner-card card mt-2">
      <div class="not-owner-icon">🔒</div>
      <h2>{{ t('listManage.notOwner.title') }}</h2>
      <p class="not-owner-desc">
        {{ t('listManage.notOwner.desc') }}
      </p>

      <div class="not-owner-actions">
        <p>{{ t('listManage.notOwner.prompt') }}</p>
        <RouterLink :to="{ name: 'list-public', params: { listId } }" class="btn btn-outline">
          {{ t('listManage.notOwner.viewAsGuest') }}
        </RouterLink>
      </div>
    </div>
    <div v-else class="loading-state card text-center mt-2" aria-live="polite" aria-busy="true">
      <span class="spinner spinner-lg" aria-hidden="true"></span>
      <p class="loading-text">{{ t('listManage.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
.navigation-header {
  display: flex;
  align-items: center;
}

.back-link {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.list-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 2rem;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-icon-edit {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-icon-edit:hover {
  background-color: var(--color-accent-soft);
}

.header-content h1 {
  font-size: 2.25rem;
  margin-bottom: 0.25rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

.list-description-text {
  color: #666;
  font-size: 1.1rem;
  margin-top: 0.25rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
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

.alert-info {
  background-color: var(--color-accent-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  justify-content: space-between;
}

.alert-info .close-btn {
  flex-shrink: 0;
}

.alert-desc {
  line-height: 1.4;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.item-card {
  display: flex;
  padding: 0.65rem 0.85rem;
  margin-bottom: 0;
  gap: 0.85rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.item-card.is-dragging {
  opacity: 0.4;
  border: 1px dashed var(--color-accent);
}

.item-card.drag-over {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
  transform: translateY(-2px);
}

.item-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-border);
  cursor: grab;
  user-select: none;
}

.item-order:active {
  cursor: grabbing;
}

.order-btn {
  background: none;
  border: none;
  font-size: 1.15rem;
  color: var(--color-accent);
  cursor: pointer;
  line-height: 1;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.order-btn:hover:not(:disabled) {
  background-color: rgba(99, 102, 241, 0.1);
}

.order-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.order-number {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-heading);
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.item-main h3 {
  font-size: 1.05rem;
  margin-bottom: 0;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 0;
  max-width: 100%;
  flex-shrink: 1;
}

.item-type {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 0;
  white-space: nowrap;
}

.item-description {
  color: #666;
  font-size: 0.85rem;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  flex-basis: 100%;
}

.item-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.item-actions .btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
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

/* Modal styles similar to Dashboard */
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

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.not-owner-card {
  max-width: 560px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  text-align: center;
}

.not-owner-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.not-owner-desc {
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
  margin-top: 0.5rem;
}

.not-owner-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

@media (max-width: 600px) {
  .list-details-header {
    padding: 1.25rem 1rem;
    text-align: center;
    justify-content: center;
    gap: 1rem;
  }
  
  .header-content h1 {
    font-size: 1.6rem;
  }

  .header-title-row {
    justify-content: center;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
  
  .header-actions .btn {
    width: 100%;
  }
  
  .item-card {
    padding: 0.65rem 0.65rem;
  }

  .item-content {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .item-actions {
    margin-top: 0.5rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .item-actions .btn-sm {
    flex: 1 1 auto;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .modal-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .modal-actions .btn {
    width: 100%;
  }

  .item-card {
    gap: 0.5rem;
  }

  .item-order {
    padding-right: 0.5rem;
  }
}
</style>
