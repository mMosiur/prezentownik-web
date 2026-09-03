<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useListStore, type Item, type UpsertItemRequest, type UpdateListRequest } from '@/stores/list'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useToast } from '@/composables/useToast'
import ShareListModal from '@/components/ShareListModal.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const listStore = useListStore()
const authStore = useAuthStore()
const toast = useToast()
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
  description: string
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
    toast.success(t('common.toasts.listUpdated'))
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
    toast.success(t('common.toasts.listDeleted'))
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

function setItemType(type: number) {
  itemForm.value.type = type
  if (type === 1 && (!itemForm.value.targetQuantity || itemForm.value.targetQuantity < 1)) {
    itemForm.value.targetQuantity = 2
  } else if (type === 0) {
    itemForm.value.targetQuantity = 1
  }
}

function incrementQuantity() {
  const current = Number(itemForm.value.targetQuantity) || 1
  itemForm.value.targetQuantity = current + 1
}

function decrementQuantity() {
  const current = Number(itemForm.value.targetQuantity) || 1
  if (current > 1) {
    itemForm.value.targetQuantity = current - 1
  }
}

async function saveItem() {
  if (isSavingItem.value) return

  itemFormError.value = ''
  isSavingItem.value = true
  try {
    const payload: UpsertItemRequest = {
      name: itemForm.value.name.trim(),
      description: itemForm.value.description?.trim() || null,
      type: itemForm.value.type,
      targetQuantity: itemForm.value.type === 1 ? Number(itemForm.value.targetQuantity) : (itemForm.value.type === 0 ? 1 : null)
    }
    if (editingItem.value) {
      await listStore.updateItem(listId, editingItem.value.id, payload)
      toast.success(t('common.toasts.itemUpdated'))
    } else {
      await listStore.addItem(listId, payload)
      toast.success(t('common.toasts.itemAdded'))
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
    toast.success(t('common.toasts.itemDeleted'))
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

function extractUrl(text: string | null): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/[^\s]+)/i)
  return match ? match[0] : null
}
</script>

<template>
  <div class="container list-manage-container mt-2">
    <!-- List details view (when loaded and current user is owner) -->
    <div v-if="listStore.currentList && listStore.currentList.id === listId">
      <!-- Navigation Bar -->
      <div class="navigation-header">
        <RouterLink :to="{ name: 'dashboard' }" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>{{ t('listManage.backToDashboard') }}</span>
        </RouterLink>
      </div>

      <!-- Redirect notice (if owner visited the public list URL and got redirected here) -->
      <div v-if="redirectedFromPublic" class="alert alert-info mt-1" role="status">
        <div class="alert-content">
          <span class="alert-icon">ℹ️</span>
          <span class="alert-desc">{{ t('listManage.redirectNotice') }}</span>
        </div>
        <button class="close-btn" :aria-label="t('common.actions.close')" @click="dismissRedirectNotice">&times;</button>
      </div>

      <!-- Hero Header Card -->
      <div class="list-details-header card mt-1">
        <div class="header-content">
          <div class="header-title-row">
            <div class="list-name-group">
              <span class="list-hero-icon">📝</span>
              <h1>{{ listStore.currentList.name }}</h1>
              <button
                @click="openEditList"
                class="btn-icon-edit"
                :title="t('listManage.editListTooltip')"
                :aria-label="t('listManage.editListTooltip')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
            <span class="items-count-pill">
              {{ listStore.currentList.items.length }} {{ listStore.currentList.items.length === 1 ? 'prezent' : 'prezentów' }}
            </span>
          </div>

          <p v-if="listStore.currentList.description" class="list-description-text">
            {{ listStore.currentList.description }}
          </p>
        </div>

        <div class="header-actions">
          <button @click="showShareModal = true" class="btn btn-outline header-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>{{ t('common.actions.share') }}</span>
          </button>
          <button @click="openAddItem" class="btn header-btn btn-add-gift">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{{ t('listManage.addItem') }}</span>
          </button>
          <button @click="openDeleteListModal" class="btn btn-outline btn-danger header-btn btn-delete-list" :title="t('listManage.deleteList')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>{{ t('listManage.deleteList') }}</span>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="listStore.currentList.items.length === 0" class="empty-state card text-center mt-2">
        <div class="empty-illustration">
          <span class="empty-emoji">🎁</span>
        </div>
        <h3>{{ t('listManage.emptyTitle') }}</h3>
        <p class="empty-desc mt-1">{{ t('listManage.emptySubtitle') }}</p>
        <button @click="openAddItem" class="btn mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{{ t('listManage.addGift') }}</span>
        </button>
      </div>

      <!-- Items List -->
      <template v-else>
        <div v-if="reorderError" class="alert alert-error mt-2" role="alert">
          <span class="alert-desc">{{ reorderError }}</span>
          <button class="close-btn" :aria-label="t('common.actions.close')" @click="reorderError = ''">&times;</button>
        </div>

        <TransitionGroup name="list-item" tag="div" class="items-list mt-2">
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
            <!-- Drag Handle & Order Controls -->
            <div class="item-order" :title="t('listManage.dragTooltip')">
              <div class="drag-grip" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="5" r="1.5"></circle>
                  <circle cx="15" cy="5" r="1.5"></circle>
                  <circle cx="9" cy="12" r="1.5"></circle>
                  <circle cx="15" cy="12" r="1.5"></circle>
                  <circle cx="9" cy="19" r="1.5"></circle>
                  <circle cx="15" cy="19" r="1.5"></circle>
                </svg>
              </div>
              <button
                @click.stop="moveItem(index, 'up')"
                :disabled="index === 0 || isReordering"
                class="order-btn"
                :title="t('listManage.moveUp')"
                :aria-label="t('listManage.moveUp')"
              >
                ▲
              </button>
              <span class="order-number">{{ index + 1 }}</span>
              <button
                @click.stop="moveItem(index, 'down')"
                :disabled="index === listStore.currentList.items.length - 1 || isReordering"
                class="order-btn"
                :title="t('listManage.moveDown')"
                :aria-label="t('listManage.moveDown')"
              >
                ▼
              </button>
            </div>
            
            <!-- Item Content -->
            <div class="item-content">
              <div class="item-main">
                <div class="item-header-row">
                  <h3 class="item-title">{{ item.name }}</h3>
                  
                  <!-- Type Badge -->
                  <div class="item-badge" :class="`badge-type-${item.type}`">
                    <span v-if="item.type === 0">🎁 {{ t('listManage.itemTypes.single') }}</span>
                    <span v-else-if="item.type === 1">🔢 {{ t('listManage.quantitySuffix', { qty: item.targetQuantity }) }}</span>
                    <span v-else>♾️ {{ t('listManage.itemTypes.unlimited') }}</span>
                  </div>
                </div>

                <p v-if="item.description" class="item-description">{{ item.description }}</p>

                <!-- URL button if link is found -->
                <div v-if="extractUrl(item.description)" class="item-link-row mt-1">
                  <a
                    :href="extractUrl(item.description)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-sm btn-outline btn-item-url"
                    @click.stop
                  >
                    <span>{{ t('listManage.openLink') }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
              
              <!-- Item Actions -->
              <div class="item-actions">
                <button @click.stop="openEditItem(item)" class="btn btn-sm btn-outline item-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>{{ t('common.actions.edit') }}</span>
                </button>
                <button @click.stop="openDeleteItemModal(item)" class="btn btn-sm btn-outline btn-danger item-btn" :title="t('common.actions.delete')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>{{ t('common.actions.delete') }}</span>
                </button>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </template>

      <!-- Edit List Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showEditListModal" class="modal-overlay" @click="showEditListModal = false">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="edit-list-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">✏️</span>
                  <h2 id="edit-list-title">{{ t('listManage.editListModal.title') }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" @click="showEditListModal = false">&times;</button>
              </div>

              <div v-if="listEditError" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ listEditError }}</span>
              </div>

              <form @submit.prevent="saveListDetails" class="mt-2" novalidate>
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
                    <span v-if="isSavingList" class="spinner spinner-sm" aria-hidden="true"></span>
                    <span>{{ isSavingList ? t('common.actions.saving') : t('common.actions.saveChanges') }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Add/Edit Item Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showItemModal" class="modal-overlay" @click="!isSavingItem && (showItemModal = false)">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">🎁</span>
                  <h2 id="item-modal-title">{{ editingItem ? t('listManage.itemModal.titleEdit') : t('listManage.itemModal.titleAdd') }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isSavingItem" @click="showItemModal = false">&times;</button>
              </div>

              <div v-if="itemFormError" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ itemFormError }}</span>
              </div>

              <form @submit.prevent="saveItem" class="mt-2" novalidate>
                <div class="form-group">
                  <label for="item-name">
                    {{ t('listManage.itemModal.nameLabel') }} <span class="required-mark">*</span>
                  </label>
                  <input
                    id="item-name"
                    v-model="itemForm.name"
                    required
                    :placeholder="t('listManage.itemModal.namePlaceholder')"
                    :disabled="isSavingItem"
                  />
                </div>

                <div class="form-group">
                  <label for="item-description">{{ t('listManage.itemModal.descriptionLabel') }}</label>
                  <textarea
                    id="item-description"
                    v-model="itemForm.description"
                    rows="3"
                    :placeholder="t('listManage.itemModal.descriptionPlaceholder')"
                    :disabled="isSavingItem"
                  ></textarea>
                </div>

                <!-- Segmented Type Selector -->
                <div class="form-group">
                  <label>{{ t('listManage.itemModal.typeLabel') }}</label>
                  <div class="type-selector-grid">
                    <button
                      type="button"
                      class="type-choice-card"
                      :class="{ 'is-selected': itemForm.type === 0 }"
                      @click="setItemType(0)"
                    >
                      <div class="type-choice-icon">🎁</div>
                      <div class="type-choice-info">
                        <span class="type-choice-title">{{ t('listManage.itemTypes.single') }}</span>
                        <span class="type-choice-desc">{{ t('listManage.itemModal.typeHintSingle') }}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="type-choice-card"
                      :class="{ 'is-selected': itemForm.type === 1 }"
                      @click="setItemType(1)"
                    >
                      <div class="type-choice-icon">🔢</div>
                      <div class="type-choice-info">
                        <span class="type-choice-title">{{ t('listManage.itemTypes.quantity') }}</span>
                        <span class="type-choice-desc">{{ t('listManage.itemModal.typeHintQuantity') }}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="type-choice-card"
                      :class="{ 'is-selected': itemForm.type === 2 }"
                      @click="setItemType(2)"
                    >
                      <div class="type-choice-icon">♾️</div>
                      <div class="type-choice-info">
                        <span class="type-choice-title">{{ t('listManage.itemTypes.unlimited') }}</span>
                        <span class="type-choice-desc">{{ t('listManage.itemModal.typeHintUnlimited') }}</span>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Target Quantity Stepper for Quantity Type -->
                <div v-if="itemForm.type === 1" class="form-group mt-1">
                  <label for="item-quantity">{{ t('listManage.itemModal.targetQuantityLabel') }}</label>
                  <div class="stepper-box">
                    <button
                      type="button"
                      class="stepper-btn"
                      @click="decrementQuantity"
                      :disabled="isSavingItem || (Number(itemForm.targetQuantity) || 1) <= 1"
                    >
                      -
                    </button>
                    <input
                      id="item-quantity"
                      v-model.number="itemForm.targetQuantity"
                      type="number"
                      min="1"
                      class="stepper-input"
                      required
                      :disabled="isSavingItem"
                    />
                    <button
                      type="button"
                      class="stepper-btn"
                      @click="incrementQuantity"
                      :disabled="isSavingItem"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" @click="showItemModal = false" class="btn btn-outline" :disabled="isSavingItem">
                    {{ t('common.actions.cancel') }}
                  </button>
                  <button type="submit" class="btn" :disabled="isSavingItem">
                    <span v-if="isSavingItem" class="spinner spinner-sm" aria-hidden="true"></span>
                    <span>{{ isSavingItem ? t('common.actions.saving') : t('common.actions.save') }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete List Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showDeleteListModal" class="modal-overlay" @click="!isDeletingList && (showDeleteListModal = false)">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-manage-list-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">⚠️</span>
                  <h2 id="delete-manage-list-title">{{ t('listManage.deleteListModal.title') }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeletingList" @click="showDeleteListModal = false">&times;</button>
              </div>

              <div v-if="deleteListError" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ deleteListError }}</span>
              </div>

              <div class="confirm-content mt-1">
                <p class="confirm-message">
                  <i18n-t keypath="listManage.deleteListModal.confirmMessage" tag="span" scope="global">
                    <template #name>
                      <strong>«{{ listStore.currentList.name }}»</strong>
                    </template>
                  </i18n-t>
                </p>
                <div class="confirm-warning-box mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>{{ t('listManage.deleteListModal.warning') }}</span>
                </div>
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
                  <span v-if="isDeletingList" class="spinner spinner-sm" aria-hidden="true"></span>
                  <span>{{ isDeletingList ? t('listManage.deleteListModal.submitting') : t('listManage.deleteListModal.submit') }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Item Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showDeleteItemModal" class="modal-overlay" @click="!isDeletingItem && (showDeleteItemModal = false)">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="delete-item-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">⚠️</span>
                  <h2 id="delete-item-title">{{ t('listManage.deleteItemModal.title') }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isDeletingItem" @click="showDeleteItemModal = false">&times;</button>
              </div>

              <div v-if="deleteItemError" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ deleteItemError }}</span>
              </div>

              <div class="confirm-content mt-1">
                <p class="confirm-message">
                  <i18n-t keypath="listManage.deleteItemModal.confirmMessage" tag="span" scope="global">
                    <template #name>
                      <strong>«{{ itemToDelete?.name }}»</strong>
                    </template>
                  </i18n-t>
                </p>
                <div class="confirm-warning-box mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>{{ t('listManage.deleteItemModal.warning') }}</span>
                </div>
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
                  <span v-if="isDeletingItem" class="spinner spinner-sm" aria-hidden="true"></span>
                  <span>{{ isDeletingItem ? t('listManage.deleteItemModal.submitting') : t('listManage.deleteItemModal.submit') }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <ShareListModal
        v-if="showShareModal"
        :list-id="listId"
        :list-name="listStore.currentList.name"
        @close="showShareModal = false"
      />
    </div>

    <!-- Not owner notice -->
    <div v-else-if="isNotOwner" class="not-owner-card card mt-2 text-center">
      <div class="not-owner-icon">🔒</div>
      <h2>{{ t('listManage.notOwner.title') }}</h2>
      <p class="not-owner-desc mt-1">
        {{ t('listManage.notOwner.desc') }}
      </p>
      <div class="not-owner-actions mt-2">
        <RouterLink :to="{ name: 'dashboard' }" class="btn btn-outline">
          {{ t('listManage.backToDashboard') }}
        </RouterLink>
        <RouterLink :to="{ name: 'list-public', params: { listId } }" class="btn">
          {{ t('listManage.notOwner.viewAsGuest') }}
        </RouterLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state card text-center mt-2" aria-live="polite" aria-busy="true">
      <span class="spinner spinner-lg spinner-accent" aria-hidden="true"></span>
      <p class="loading-text">{{ t('listManage.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
.list-manage-container {
  padding-bottom: 3.5rem;
}

/* Navigation Back Link */
.navigation-header {
  margin-bottom: 0.75rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-accent);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.back-link:hover {
  background: var(--color-accent-soft);
  transform: translateX(-2px);
}

/* List Details Header Card */
.list-details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 242, 235, 0.95) 100%);
  border: 1px solid var(--color-border);
}

.header-content {
  flex: 1;
  min-width: 260px;
}

.header-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.list-name-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.list-hero-icon {
  font-size: 1.8rem;
}

.header-title-row h1 {
  font-size: 1.7rem;
  margin: 0;
  color: var(--color-heading);
}

.btn-icon-edit {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon-edit:hover {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.items-count-pill {
  padding: 0.2rem 0.65rem;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 700;
}

.list-description-text {
  margin-top: 0.6rem;
  font-size: 0.96rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.header-btn {
  padding: 0.65rem 1.15rem;
  font-size: 0.92rem;
}

.btn-add-gift {
  box-shadow: 0 4px 12px var(--color-accent-glow);
}

/* Items List & Cards */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.item-card {
  display: flex;
  align-items: stretch;
  padding: 0;
  margin-bottom: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-elevated);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  overflow: hidden;
}

.item-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

.item-card.is-dragging {
  opacity: 0.4;
  border: 2px dashed var(--color-accent);
}

.item-card.drag-over {
  transform: scale(1.01);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}

/* Order Controls & Handle */
.item-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  padding: 0.6rem 0.5rem;
  min-width: 44px;
  cursor: grab;
  user-select: none;
}

.drag-grip {
  color: var(--color-text-light);
  margin-bottom: 0.2rem;
}

.order-btn {
  background: none;
  border: none;
  font-size: 0.7rem;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.order-btn:hover:not(:disabled) {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.order-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.order-number {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
  margin: 0.15rem 0;
}

/* Item Content */
.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.15rem 1.4rem;
  flex: 1;
}

.item-main {
  flex: 1;
  min-width: 240px;
}

.item-header-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.item-title {
  font-size: 1.15rem;
  color: var(--color-heading);
  margin: 0;
  line-height: 1.3;
}

.item-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-type-0 {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.badge-type-1 {
  background: rgba(245, 159, 0, 0.12);
  color: #b36b00;
}

.badge-type-2 {
  background: rgba(74, 144, 226, 0.12);
  color: #2a6ac0;
}

.item-description {
  margin-top: 0.4rem;
  font-size: 0.92rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.btn-item-url {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.82rem;
  border-radius: var(--radius-full);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-btn {
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
}

/* Empty State */
.empty-state {
  padding: 3.5rem 2rem;
}

.empty-illustration {
  margin-bottom: 1rem;
}

.empty-emoji {
  font-size: 4rem;
}

.empty-desc {
  max-width: 440px;
  margin: 0.5rem auto 0;
  color: var(--color-text-muted);
}

/* Type Choice Cards in Item Modal */
.type-selector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
  margin-top: 0.35rem;
}

.type-choice-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.85rem 0.5rem;
  border: 1.5px solid var(--color-border);
  background: var(--color-background-elevated);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-choice-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-background-soft);
}

.type-choice-card.is-selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: 0 0 0 2px var(--color-accent-glow);
}

.type-choice-icon {
  font-size: 1.5rem;
  margin-bottom: 0.35rem;
}

.type-choice-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--color-heading);
}

.type-choice-desc {
  font-size: 0.74rem;
  color: var(--color-text-muted);
  line-height: 1.25;
  margin-top: 0.2rem;
}

/* Quantity Stepper */
.stepper-box {
  display: flex;
  align-items: center;
  max-width: 160px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-background-elevated);
}

.stepper-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  font-weight: 600;
  width: 44px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.stepper-btn:hover:not(:disabled) {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.stepper-input {
  flex: 1;
  border: none;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
  padding: 0;
  -moz-appearance: textfield;
}

.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Not Owner Card */
.not-owner-card {
  padding: 3.5rem 2rem;
  max-width: 580px;
  margin: 2rem auto 0;
}

.not-owner-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.not-owner-desc {
  color: var(--color-text-muted);
}

.not-owner-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
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
  max-width: 520px;
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

@media (max-width: 650px) {
  .list-details-header {
    flex-direction: column;
    padding: 1.25rem;
  }

  .header-actions {
    width: 100%;
  }

  .header-btn {
    flex: 1;
  }

  .type-selector-grid {
    grid-template-columns: 1fr;
  }

  .item-content {
    flex-direction: column;
    align-items: stretch;
  }

  .item-actions {
    margin-top: 0.75rem;
    justify-content: flex-end;
  }
}
</style>