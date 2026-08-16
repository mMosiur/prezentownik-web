<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListStore, type UpsertItemRequest } from '@/stores/list'

const route = useRoute()
const router = useRouter()
const listStore = useListStore()
const listId = route.params.listId as string

const showItemModal = ref(false)
const editingItem = ref<any>(null)
const itemForm = ref<UpsertItemRequest>({
  name: '',
  description: '',
  type: 0,
  targetQuantity: 1,
  orderNumber: 0
})

onMounted(async () => {
  try {
    await listStore.fetchListDetails(listId)
  } catch (err: any) {
    if (err.response?.status === 404) {
      router.push({ name: 'dashboard' })
    }
  }
})

function openAddItem() {
  editingItem.value = null
  const maxOrder = listStore.currentList?.items?.reduce((max, item) => Math.max(max, Number(item.orderNumber)), 0) || 0
  itemForm.value = {
    name: '',
    description: '',
    type: 0,
    targetQuantity: 1,
    orderNumber: maxOrder + 1
  }
  showItemModal.value = true
}

function openEditItem(item: any) {
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    description: item.description,
    type: item.type,
    targetQuantity: item.targetQuantity,
    orderNumber: item.orderNumber
  }
  showItemModal.value = true
}

async function saveItem() {
  try {
    if (editingItem.value) {
      await listStore.updateItem(listId, editingItem.value.id, itemForm.value)
    } else {
      await listStore.addItem(listId, itemForm.value)
    }
    showItemModal.value = false
  } catch (err) {
    alert('Błąd podczas zapisywania elementu')
  }
}

async function deleteItem(itemId: string) {
  if (confirm('Czy na pewno chcesz usunąć ten prezent?')) {
    await listStore.deleteItem(listId, itemId)
  }
}

async function moveItem(index: number, direction: 'up' | 'down') {
  const items = listStore.currentList?.items
  if (!items) return
  
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= items.length) return

  const itemA = items[index]
  const itemB = items[newIndex]

  const tempOrder = itemA.orderNumber
  
  await listStore.updateItem(listId, itemA.id, {
    ...itemA,
    orderNumber: itemB.orderNumber
  } as UpsertItemRequest)

  await listStore.updateItem(listId, itemB.id, {
    ...itemB,
    orderNumber: tempOrder
  } as UpsertItemRequest)
}

function getItemTypeName(type: number) {
  switch (type) {
    case 0: return 'Pojedynczy'
    case 1: return 'Ilościowy'
    case 2: return 'Bez limitu'
    default: return 'Nieznany'
  }
}
</script>

<template>
  <div class="container mt-2">
    <div v-if="listStore.currentList">
      <div class="navigation-header">
        <RouterLink :to="{ name: 'dashboard' }" class="back-link">&larr; Powrót do moich list</RouterLink>
      </div>

      <div class="list-details-header card mt-1">
        <div class="header-content">
          <h1>{{ listStore.currentList.name }}</h1>
          <p v-if="listStore.currentList.description">{{ listStore.currentList.description }}</p>
        </div>
        <div class="header-actions">
          <button @click="openAddItem" class="btn">Dodaj prezent</button>
        </div>
      </div>

      <div v-if="listStore.currentList.items.length === 0" class="empty-state text-center mt-2">
        <div class="empty-icon">🎁</div>
        <h3>Ta lista jest jeszcze pusta</h3>
        <p>Dodaj pierwszy prezent, aby bliscy wiedzieli, co sprawi Ci radość.</p>
        <button @click="openAddItem" class="btn btn-outline mt-1">Dodaj prezent</button>
      </div>

      <div v-else class="items-list mt-2">
        <div v-for="(item, index) in listStore.currentList.items" :key="item.id" class="card item-card">
          <div class="item-order">
            <button @click="moveItem(index, 'up')" :disabled="index === 0" class="order-btn">&utrif;</button>
            <span class="order-number">{{ index + 1 }}</span>
            <button @click="moveItem(index, 'down')" :disabled="index === listStore.currentList.items.length - 1" class="order-btn">&dtrif;</button>
          </div>
          
          <div class="item-content">
            <div class="item-main">
              <h3>{{ item.name }}</h3>
              <p class="item-type">{{ getItemTypeName(item.type) }} <span v-if="item.type === 1">(Ilość: {{ item.targetQuantity }})</span></p>
              <p v-if="item.description" class="item-description">{{ item.description }}</p>
            </div>
            
            <div class="item-actions">
              <button @click="openEditItem(item)" class="btn btn-sm btn-outline">Edytuj</button>
              <button @click="deleteItem(item.id)" class="btn btn-sm btn-outline btn-danger">Usuń</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Item Modal -->
      <Teleport to="body">
        <div v-if="showItemModal" class="modal-overlay" @click="showItemModal = false">
          <div class="modal card" @click.stop>
            <div class="modal-header">
              <h2>{{ editingItem ? 'Edytuj prezent' : 'Dodaj nowy prezent' }}</h2>
              <button class="close-btn" @click="showItemModal = false">&times;</button>
            </div>
            <form @submit.prevent="saveItem" class="mt-1">
              <div class="form-group">
                <label>Nazwa prezentu</label>
                <input v-model="itemForm.name" required placeholder="Np. Ekspres do kawy" />
              </div>
              <div class="form-group">
                <label>Opis / Link do sklepu</label>
                <textarea v-model="itemForm.description" rows="3" placeholder="Dodaj szczegóły, kolor lub link..."></textarea>
              </div>
              <div class="form-group">
                <label>Typ prezentu</label>
                <select v-model="itemForm.type">
                  <option :value="0">Pojedynczy (1 sztuka)</option>
                  <option :value="1">Określona ilość</option>
                  <option :value="2">Bez limitu (Np. pieluchy, skarpetki)</option>
                </select>
              </div>
              <div v-if="itemForm.type === 1" class="form-group">
                <label>Docelowa ilość</label>
                <input v-model="itemForm.targetQuantity" type="number" min="1" required />
              </div>
              <div class="modal-actions">
                <button type="button" @click="showItemModal = false" class="btn btn-outline">Anuluj</button>
                <button type="submit" class="btn">Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </div>
    <div v-else class="text-center mt-2">
      <p>Ładowanie szczegółów listy...</p>
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

.header-content h1 {
  font-size: 2.25rem;
  margin-bottom: 0.5rem;
}

.header-content p {
  color: #666;
  font-size: 1.1rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-card {
  display: flex;
  padding: 1rem;
  margin-bottom: 0;
  gap: 1rem;
}

.item-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding-right: 1rem;
  border-right: 1px solid var(--color-border);
}

.order-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-accent);
  cursor: pointer;
  line-height: 1;
}

.order-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.order-number {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-heading);
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.item-main h3 {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.item-type {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.item-description {
  color: #666;
  font-size: 0.95rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-danger {
  color: #d63031;
  border-color: #d63031;
}

.btn-danger:hover {
  background-color: rgba(214, 48, 49, 0.1);
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

@media (max-width: 600px) {
  .list-details-header {
    padding: 1.5rem;
    text-align: center;
    justify-content: center;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions .btn {
    width: 100%;
  }
  
  .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .item-actions {
    margin-top: 1rem;
    justify-content: flex-end;
  }
}
</style>
