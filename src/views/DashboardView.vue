<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useListStore } from '@/stores/list'
import { useRouter } from 'vue-router'

const listStore = useListStore()
const router = useRouter()

const showCreateModal = ref(false)
const newList = ref({ name: '', description: '' })
const error = ref('')

onMounted(async () => {
  await listStore.fetchLists()
})

async function handleCreateList() {
  error.value = ''
  try {
    const created = await listStore.createList({
      name: newList.value.name,
      description: newList.value.description || null
    })
    showCreateModal.value = false
    newList.value = { name: '', description: '' }
    router.push({ name: 'list-manage', params: { listId: created.id } })
  } catch (err: any) {
    error.value = err.response?.data?.title || 'Nie udało się utworzyć listy.'
  }
}

function goToList(id: string) {
  router.push({ name: 'list-manage', params: { listId: id } })
}

const copiedId = ref<string | null>(null)
function copyShareLink(id: string) {
  const link = `${window.location.origin}/lists/${id}`
  navigator.clipboard.writeText(link)
  copiedId.value = id
  setTimeout(() => {
    copiedId.value = null
  }, 2000)
}
</script>

<template>
  <div class="container">
    <div class="dashboard-header mt-2">
      <h1>Moje Listy Prezentów</h1>
      <button @click="showCreateModal = true" class="btn">Nowa Lista</button>
    </div>

    <div v-if="listStore.isLoading && listStore.lists.length === 0" class="text-center mt-2">
      <p>Ładowanie list...</p>
    </div>
    
    <div v-else-if="listStore.lists.length === 0" class="empty-state card text-center mt-2">
      <div class="empty-icon">📂</div>
      <h2>Nie masz jeszcze żadnych list</h2>
      <p class="mt-1">Stwórz swoją pierwszą listę, aby zacząć zbierać pomysły na prezenty.</p>
      <button @click="showCreateModal = true" class="btn mt-2">Utwórz pierwszą listę</button>
    </div>

    <div v-else class="list-grid mt-2">
      <div v-for="list in listStore.lists" :key="list.id" class="card list-card" @click="goToList(list.id)">
        <div class="card-content">
          <h3>{{ list.name }}</h3>
          <p v-if="list.description" class="description">{{ list.description }}</p>
        </div>
        <div class="card-footer" @click.stop>
          <button @click="goToList(list.id)" class="btn btn-sm btn-outline">Zarządzaj</button>
          <button @click="copyShareLink(list.id)" class="btn btn-sm btn-outline">
            {{ copiedId === list.id ? 'Skopiowano!' : 'Udostępnij link' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
        <div class="modal card" @click.stop>
          <div class="modal-header">
            <h2>Nowa Lista Prezentów</h2>
            <button class="close-btn" @click="showCreateModal = false">&times;</button>
          </div>
          <form @submit.prevent="handleCreateList" class="mt-1">
            <div class="form-group">
              <label>Nazwa listy</label>
              <input v-model="newList.name" required placeholder="Np. Baby Shower, Urodziny 2024" />
            </div>
            <div class="form-group">
              <label>Opis (opcjonalnie)</label>
              <textarea v-model="newList.description" rows="3" placeholder="Dodaj krótki opis lub okazję..."></textarea>
            </div>
            <div v-if="error" class="error-message text-center mb-1">{{ error }}</div>
            <div class="modal-actions">
              <button type="button" @click="showCreateModal = false" class="btn btn-outline">Anuluj</button>
              <button type="submit" class="btn" :disabled="listStore.isLoading">
                {{ listStore.isLoading ? 'Tworzenie...' : 'Utwórz listę' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
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
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.empty-state {
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
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

@media (max-width: 480px) {
  .dashboard-header h1 {
    font-size: 1.75rem;
  }
  
  .list-grid {
    grid-template-columns: 1fr;
  }
}
</style>
