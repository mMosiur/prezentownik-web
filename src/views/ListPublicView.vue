<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClaimStore, type PublicItem } from '@/stores/claim'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'

const route = useRoute()
const router = useRouter()
const claimStore = useClaimStore()
const authStore = useAuthStore()
const listId = route.params.listId as string

// Stays true until we are sure the visitor is NOT the list owner, so claim
// data is never rendered - even for a split second - to the person who
// should be surprised by the gifts.
const isCheckingOwnership = ref(true)
const loadError = ref(false)

const showClaimModal = ref(false)
const selectedItem = ref<PublicItem | null>(null)
const claimForm = ref({
  claimerName: '',
  quantityClaimed: 1
})
const error = ref('')
const isSubmittingClaim = ref(false)

const showUnclaimModal = ref(false)
const itemToUnclaim = ref<PublicItem | null>(null)
const unclaimError = ref('')
const isUnclaiming = ref(false)

onMounted(async () => {
  // The public fetch fails with 403 when the caller is the list owner - that
  // must NOT stop us from attempting the owner redirect below, so any error
  // here is captured instead of being allowed to propagate.
  let publicFetchFailed = false
  try {
    await claimStore.fetchPublicList(listId)
  } catch {
    publicFetchFailed = true
  }

  if (authStore.isAuthenticated) {
    try {
      await authStore.fetchUser()
      const listStore = (await import('@/stores/list')).useListStore()
      await listStore.fetchListDetails(listId)
      // Fetching the owner-only details succeeded, so this visitor is the
      // list's author. Redirect immediately to the management view without
      // ever displaying claim information on this page.
      await router.replace({ name: 'list-manage', params: { listId }, query: { fromPublic: '1' } })
      return
    } catch {
      // Not the owner - fall through and show the public page below.
    }
  }

  if (publicFetchFailed) {
    loadError.value = true
  }
  isCheckingOwnership.value = false
})

useEscapeKey(() => {
  if (showClaimModal.value && !isSubmittingClaim.value) showClaimModal.value = false
  else if (showUnclaimModal.value && !isUnclaiming.value) showUnclaimModal.value = false
})

function openClaim(item: PublicItem) {
  selectedItem.value = item
  claimForm.value = {
    claimerName: authStore.user?.displayName || '',
    quantityClaimed: 1
  }
  error.value = ''
  showClaimModal.value = true
}

async function handleClaim() {
  if (!selectedItem.value || isSubmittingClaim.value) return

  error.value = ''
  isSubmittingClaim.value = true
  try {
    await claimStore.claimItem(listId, selectedItem.value.id, {
      claimerName: claimForm.value.claimerName.trim() || null,
      quantityClaimed: claimForm.value.quantityClaimed
    })
    showClaimModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, 'Nie udało się zarezerwować prezentu. Spróbuj ponownie.')
    error.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || 'Nie udało się zarezerwować prezentu. Spróbuj ponownie.'
  } finally {
    isSubmittingClaim.value = false
  }
}

function openUnclaimModal(item: PublicItem) {
  itemToUnclaim.value = item
  unclaimError.value = ''
  showUnclaimModal.value = true
}

async function confirmUnclaim() {
  if (!itemToUnclaim.value || isUnclaiming.value) return

  unclaimError.value = ''
  isUnclaiming.value = true
  try {
    await claimStore.unclaimItem(listId, itemToUnclaim.value.id)
    showUnclaimModal.value = false
    itemToUnclaim.value = null
  } catch (err: unknown) {
    const parsed = parseApiError(err, 'Nie udało się anulować rezerwacji.')
    unclaimError.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || 'Nie udało się anulować rezerwacji.'
  } finally {
    isUnclaiming.value = false
  }
}

function isClaimedByMe(itemId: string) {
  const item = claimStore.currentPublicList?.items?.find(i => i.id === itemId)
  return Boolean(item?.isClaimedByCurrentUser) || Boolean(claimStore.getRevocationToken(itemId))
}

function getProgress(item: PublicItem) {
  if (item.type === 2) return 0
  return Math.min(100, (Number(item.totalClaimed) / Number(item.targetQuantity)) * 100)
}
</script>

<template>
  <div class="container mt-2">
    <div v-if="claimStore.currentPublicList && !isCheckingOwnership">
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

      <div v-if="claimStore.currentPublicList.items.length === 0" class="empty-state text-center">
        <p>Ta lista jest jeszcze pusta.</p>
      </div>

      <div v-else class="items-grid mt-2">
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

              <div v-if="item.claims && item.claims.length > 0" class="claims-list">
                <p class="claims-label">Kto już zarezerwował:</p>
                <ul>
                  <li v-for="(claim, claimIndex) in item.claims" :key="claimIndex">
                    {{ claim.claimerName || 'Anonim' }}
                    <span v-if="item.type !== 0" class="claim-qty">&times;{{ claim.quantityClaimed }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="item-actions">
              <div v-if="isClaimedByMe(item.id)" class="my-claim">
                <span class="badge">Twój wybór!</span>
                <button @click="openUnclaimModal(item)" class="btn btn-sm btn-outline">Anuluj</button>
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
        <div v-if="showClaimModal && selectedItem" class="modal-overlay" @click="!isSubmittingClaim && (showClaimModal = false)">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="claim-modal-title">
            <div class="modal-header">
              <h2 id="claim-modal-title">Rezerwacja: {{ selectedItem.name }}</h2>
              <button class="close-btn" aria-label="Zamknij" :disabled="isSubmittingClaim" @click="showClaimModal = false">&times;</button>
            </div>
            <form @submit.prevent="handleClaim" class="mt-1">
              <div class="form-group">
                <label>Twoje imię (opcjonalnie)</label>
                <input v-model="claimForm.claimerName" placeholder="Np. Marek" :disabled="isSubmittingClaim" />
              </div>
              <div v-if="selectedItem.type === 1" class="form-group">
                <label>Ilość</label>
                <input 
                  v-model="claimForm.quantityClaimed" 
                  type="number" 
                  min="1" 
                  :max="Number(selectedItem.targetQuantity) - Number(selectedItem.totalClaimed)" 
                  required 
                  :disabled="isSubmittingClaim"
                />
              </div>
              <div v-if="error" class="error-message text-center mb-1">{{ error }}</div>
              <div class="modal-actions">
                <button type="button" @click="showClaimModal = false" class="btn btn-outline" :disabled="isSubmittingClaim">Anuluj</button>
                <button type="submit" class="btn" :disabled="isSubmittingClaim">
                  {{ isSubmittingClaim ? 'Rezerwowanie...' : 'Zarezerwuj' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Unclaim Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showUnclaimModal && itemToUnclaim" class="modal-overlay" @click="!isUnclaiming && (showUnclaimModal = false)">
          <div class="modal card" @click.stop role="dialog" aria-modal="true" aria-labelledby="unclaim-title">
            <div class="modal-header">
              <h2 id="unclaim-title">Anuluj rezerwację</h2>
              <button class="close-btn" aria-label="Zamknij" :disabled="isUnclaiming" @click="showUnclaimModal = false">&times;</button>
            </div>

            <div v-if="unclaimError" class="error-message mt-1">{{ unclaimError }}</div>

            <div class="confirm-content mt-1">
              <p>
                Czy na pewno chcesz anulować rezerwację prezentu <strong>«{{ itemToUnclaim.name }}»</strong>?
              </p>
            </div>

            <div class="modal-actions">
              <button type="button" @click="showUnclaimModal = false" class="btn btn-outline" :disabled="isUnclaiming">
                Wróć
              </button>
              <button type="button" @click="confirmUnclaim" class="btn btn-danger-solid" :disabled="isUnclaiming">
                {{ isUnclaiming ? 'Anulowanie...' : 'Anuluj rezerwację' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
    <div v-else-if="loadError" class="text-center mt-2">
      <p>Nie udało się znaleźć tej listy prezentowej. Sprawdź, czy link jest poprawny.</p>
    </div>
    <div v-else class="text-center mt-2">
      <p>Ładowanie listy prezentowej...</p>
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
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.empty-state {
  color: #888;
  padding: 2rem;
}

.item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-info h3 {
  font-size: 1.2rem;
  margin-bottom: 0.35rem;
}

.item-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.claims-list {
  margin-top: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--color-border);
}

.claims-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #999;
  margin-bottom: 0.35rem;
}

.claims-list ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.claims-list li {
  font-size: 0.8rem;
  color: var(--color-text);
  background: var(--color-accent-soft);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
}

.claim-qty {
  font-weight: 700;
  color: var(--color-accent);
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

.confirm-content {
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--color-heading);
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
