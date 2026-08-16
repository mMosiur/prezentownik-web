<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClaimStore } from '@/stores/claim'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const claimStore = useClaimStore()
const authStore = useAuthStore()
const listId = route.params.listId as string

const showClaimModal = ref(false)
const selectedItem = ref<any>(null)
const claimForm = ref({
  claimerName: '',
  quantityClaimed: 1
})
const error = ref('')

onMounted(async () => {
  await claimStore.fetchPublicList(listId)
  
  if (authStore.isAuthenticated) {
     try {
       await authStore.fetchUser()
       const listStore = (await import('@/stores/list')).useListStore()
       await listStore.fetchListDetails(listId)
       // If it doesn't throw, we are the owner
       if (confirm('Jesteś właścicielem tej listy. Czy chcesz przejść do panelu zarządzania?')) {
         router.push({ name: 'list-manage', params: { listId } })
       }
     } catch (e) {
       // Not the owner
     }
  }
})

function openClaim(item: any) {
  selectedItem.value = item
  claimForm.value = {
    claimerName: '',
    quantityClaimed: 1
  }
  showClaimModal.value = true
}

async function handleClaim() {
  error.value = ''
  try {
    await claimStore.claimItem(listId, selectedItem.value.id, {
      claimerName: claimForm.value.claimerName || 'Anonim',
      quantityClaimed: claimForm.value.quantityClaimed
    })
    showClaimModal.value = false
  } catch (err: any) {
    error.value = err.response?.data?.message || err.response?.data?.title || 'Błąd podczas rezerwacji.'
  }
}

async function handleUnclaim(itemId: string) {
  if (confirm('Czy na pewno chcesz anulować swoją rezerwację?')) {
    try {
      await claimStore.unclaimItem(listId, itemId)
    } catch (err) {
      alert('Błąd podczas anulowania rezerwacji.')
    }
  }
}

function isClaimedByMe(itemId: string) {
  return !!claimStore.getRevocationToken(itemId)
}

function getProgress(item: any) {
  if (item.type === 2) return 0
  return Math.min(100, (Number(item.totalClaimed) / Number(item.targetQuantity)) * 100)
}
</script>

<template>
  <div class="container mt-2">
    <div v-if="claimStore.currentPublicList">
      <header class="public-header text-center">
        <div class="card header-card">
          <p class="owner-prefix">Lista prezentów od:</p>
          <h1>{{ claimStore.currentPublicList.ownerDisplayName || 'Anonima' }}</h1>
          <h2 class="list-name">{{ claimStore.currentPublicList.name }}</h2>
          <p v-if="claimStore.currentPublicList.description" class="list-description">
            {{ claimStore.currentPublicList.description }}
          </p>
        </div>
      </header>

      <div class="items-grid mt-2">
        <div v-for="item in claimStore.currentPublicList.items" :key="item.id" class="card item-card">
          <div class="item-body">
            <div class="item-info">
              <h3>{{ item.name }}</h3>
              <p v-if="item.description" class="item-description">{{ item.description }}</p>
              
              <div class="item-status mt-1">
                <template v-if="item.type !== 2">
                  <div class="progress-container">
                    <div class="progress-bar" :style="{ width: getProgress(item) + '%' }"></div>
                  </div>
                  <p class="status-text">
                    Zarezerwowano {{ item.totalClaimed }} z {{ item.targetQuantity }}
                  </p>
                </template>
                <template v-else>
                  <p class="status-text">Zarezerwowano: {{ item.totalClaimed }}</p>
                </template>
              </div>
            </div>

            <div class="item-actions">
              <div v-if="isClaimedByMe(item.id)" class="my-claim">
                <span class="badge">Twój wybór!</span>
                <button @click="handleUnclaim(item.id)" class="btn btn-sm btn-outline">Anuluj</button>
              </div>
              <button 
                v-else-if="item.type === 2 || Number(item.totalClaimed) < Number(item.targetQuantity)" 
                @click="openClaim(item)" 
                class="btn btn-block"
              >
                Wybierz prezent
              </button>
              <div v-else class="fully-claimed">
                <span class="check-icon">✓</span> W komplecie
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Claim Modal -->
      <Teleport to="body">
        <div v-if="showClaimModal" class="modal-overlay" @click="showClaimModal = false">
          <div class="modal card" @click.stop>
            <div class="modal-header">
              <h2>Rezerwacja: {{ selectedItem.name }}</h2>
              <button class="close-btn" @click="showClaimModal = false">&times;</button>
            </div>
            <form @submit.prevent="handleClaim" class="mt-1">
              <div class="form-group">
                <label>Twoje imię (opcjonalnie)</label>
                <input v-model="claimForm.claimerName" placeholder="Np. Marek" />
              </div>
              <div v-if="selectedItem.type === 1" class="form-group">
                <label>Ilość</label>
                <input 
                  v-model="claimForm.quantityClaimed" 
                  type="number" 
                  min="1" 
                  :max="Number(selectedItem.targetQuantity) - Number(selectedItem.totalClaimed)" 
                  required 
                />
              </div>
              <div v-if="error" class="error-message text-center mb-1">{{ error }}</div>
              <div class="modal-actions">
                <button type="button" @click="showClaimModal = false" class="btn btn-outline">Anuluj</button>
                <button type="submit" class="btn">Zarezerwuj</button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </div>
    <div v-else class="text-center mt-2">
      <p>Ładowanie listy prezentów...</p>
    </div>
  </div>
</template>

<style scoped>
.header-card {
  padding: 3rem 1rem;
  margin-bottom: 2.5rem;
}

.owner-prefix {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
  font-weight: 700;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.25rem;
}

.list-name {
  font-size: 1.5rem;
  color: var(--color-text);
  font-weight: 400;
  margin-bottom: 1rem;
}

.list-description {
  max-width: 600px;
  margin: 0 auto;
  font-size: 1.1rem;
  color: #666;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.item-card {
  height: 100%;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}

.item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-info h3 {
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}

.item-description {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.progress-container {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.5s ease-out;
}

.status-text {
  font-size: 0.85rem;
  color: #888;
  font-weight: 600;
}

.item-actions {
  margin-top: 1.5rem;
}

.btn-block {
  width: 100%;
}

.my-claim {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  background: var(--color-accent);
  color: white;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
}

.fully-claimed {
  text-align: center;
  color: #999;
  font-weight: 700;
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: var(--radius-md);
}

.check-icon {
  color: var(--color-accent);
}

/* Modal from Dashboard */
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

@media (max-width: 480px) {
  .header-card {
    padding: 2rem 1rem;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
