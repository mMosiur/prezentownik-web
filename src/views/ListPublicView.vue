<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useClaimStore, type PublicItem } from '@/stores/claim'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'

const { t } = useI18n()
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
const isGuideExpanded = ref(false)

const showClaimModal = ref(false)
const selectedItem = ref<PublicItem | null>(null)
const claimForm = ref({
  claimantName: '',
  quantityClaimed: 1
})
const error = ref('')
const isSubmittingClaim = ref(false)

const showUnclaimModal = ref(false)
const itemToUnclaim = ref<PublicItem | null>(null)
const unclaimError = ref('')
const isUnclaiming = ref(false)

onMounted(async () => {
  try {
    await claimStore.fetchPublicList(listId)
    isCheckingOwnership.value = false
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      // The public endpoint returned 403 Forbidden because the current authenticated user
      // is the owner of this list. Redirect immediately to the management view so they do not
      // see claims or spoil the surprise.
      await router.replace({ name: 'list-manage', params: { listId }, query: { fromPublic: '1' } })
      return
    }
    loadError.value = true
    isCheckingOwnership.value = false
  }
})

useEscapeKey(() => {
  if (showClaimModal.value && !isSubmittingClaim.value) showClaimModal.value = false
  else if (showUnclaimModal.value && !isUnclaiming.value) showUnclaimModal.value = false
})

function openClaim(item: PublicItem) {
  selectedItem.value = item
  claimForm.value = {
    claimantName: authStore.user?.displayName || '',
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
      claimantName: claimForm.value.claimantName.trim() || null,
      quantityClaimed: claimForm.value.quantityClaimed
    })
    showClaimModal.value = false
  } catch (err: unknown) {
    const parsed = parseApiError(err, t('listPublic.claimModal.failed'))
    error.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || t('listPublic.claimModal.failed')
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
    const parsed = parseApiError(err, t('listPublic.unclaimModal.failed'))
    unclaimError.value = parsed.message || Object.values(parsed.fieldErrors || {})[0] || t('listPublic.unclaimModal.failed')
  } finally {
    isUnclaiming.value = false
  }
}

function isClaimedByMe(itemId: string) {
  const item = claimStore.currentPublicList?.items?.find(i => i.id === itemId)
  return Boolean(item?.isClaimedByCurrentUser) || Boolean(claimStore.getRevocationToken(itemId))
}

function getProgress(item: PublicItem) {
  if (item.type === 2 || !item.targetQuantity || Number(item.targetQuantity) <= 0) return 0
  const claimed = Number(item.totalClaimed) || 0
  const target = Number(item.targetQuantity)
  return Math.min(100, Math.max(0, (claimed / target) * 100))
}
</script>

<template>
  <div class="container mt-2">
    <div v-if="claimStore.currentPublicList && !isCheckingOwnership">
      <header class="public-header text-center">
        <div class="card header-card">
          <p class="owner-info">
            <span class="owner-prefix">{{ t('listPublic.ownerPrefix') }}</span>
            <span class="owner-name">{{ claimStore.currentPublicList.ownerDisplayName || t('listPublic.anonymousOwner') }}</span>
          </p>
          <h1 class="list-title">{{ claimStore.currentPublicList.name }}</h1>
          
          <p v-if="claimStore.currentPublicList.description" class="list-description">
            {{ claimStore.currentPublicList.description }}
          </p>

          <div class="hero-guide" :class="{ 'is-expanded': isGuideExpanded }">
            <button 
              type="button" 
              class="guide-header-btn" 
              @click="isGuideExpanded = !isGuideExpanded"
              :aria-expanded="isGuideExpanded"
              aria-controls="hero-guide-content"
            >
              <div class="guide-header-left">
                <span class="guide-icon">🎁</span>
                <span class="guide-title">{{ t('listPublic.guideTitle') }}</span>
              </div>
              <span class="guide-chevron" :class="{ 'is-rotated': isGuideExpanded }" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </span>
            </button>
            <div v-show="isGuideExpanded" id="hero-guide-content" class="guide-body">
              <p class="guide-lead">
                {{ t('listPublic.guideLead') }}
              </p>
              <p class="guide-how-it-works">
                {{ t('listPublic.guideHowItWorks') }}
              </p>
              <div class="guide-steps">
                <div class="guide-step">
                  <span class="step-num">1</span>
                  <span>{{ t('listPublic.guideStep1') }}</span>
                </div>
                <div class="guide-step">
                  <span class="step-num">2</span>
                  <span>{{ t('listPublic.guideStep2') }}</span>
                </div>
                <div class="guide-step">
                  <span class="step-num">3</span>
                  <span>{{ t('listPublic.guideStep3') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div v-if="claimStore.currentPublicList.items.length === 0" class="empty-state text-center">
        <p>{{ t('listPublic.empty') }}</p>
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
                    {{ t('listPublic.claimedProgress', { claimed: item.totalClaimed, target: item.targetQuantity }) }}
                  </p>
                </template>
                <template v-else>
                  <p class="status-text">{{ t('listPublic.claimedProgressUnlimited', { claimed: item.totalClaimed }) }}</p>
                </template>
              </div>

              <div v-if="item.claims && item.claims.length > 0" class="claims-list">
                <p class="claims-label">{{ t('listPublic.whoClaimed') }}</p>
                <ul>
                  <li v-for="(claim, claimIndex) in item.claims" :key="claimIndex">
                    {{ claim.claimantName || t('listPublic.anonymousClaimant') }}
                    <span v-if="item.type !== 0" class="claim-qty">&times;{{ claim.quantityClaimed }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="item-actions">
              <div v-if="isClaimedByMe(item.id)" class="my-claim">
                <span class="badge">{{ t('listPublic.yourChoice') }}</span>
                <button @click="openUnclaimModal(item)" class="btn btn-sm btn-outline">{{ t('listPublic.unclaim') }}</button>
              </div>
              <button 
                v-else-if="item.type === 2 || Number(item.totalClaimed) < Number(item.targetQuantity)" 
                @click="openClaim(item)" 
                class="btn btn-block"
              >
                {{ t('listPublic.selectGift') }}
              </button>
              <div v-else class="fully-claimed">
                <span class="check-icon">✓</span> {{ t('listPublic.fullyClaimed') }}
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
              <h2 id="claim-modal-title">{{ t('listPublic.claimModal.title', { name: selectedItem.name }) }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isSubmittingClaim" @click="showClaimModal = false">&times;</button>
            </div>
            <form @submit.prevent="handleClaim" class="mt-1">
              <div class="form-group">
                <label>{{ t('listPublic.claimModal.nameLabel') }}</label>
                <input v-model="claimForm.claimantName" :placeholder="t('listPublic.claimModal.namePlaceholder')" :disabled="isSubmittingClaim" />
              </div>
              <div v-if="selectedItem.type === 1" class="form-group">
                <label>{{ t('listPublic.claimModal.quantityLabel') }}</label>
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
                <button type="button" @click="showClaimModal = false" class="btn btn-outline" :disabled="isSubmittingClaim">{{ t('common.actions.cancel') }}</button>
                <button type="submit" class="btn" :disabled="isSubmittingClaim">
                  {{ isSubmittingClaim ? t('listPublic.claimModal.submitting') : t('listPublic.claimModal.submit') }}
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
              <h2 id="unclaim-title">{{ t('listPublic.unclaimModal.title') }}</h2>
              <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isUnclaiming" @click="showUnclaimModal = false">&times;</button>
            </div>

            <div v-if="unclaimError" class="error-message mt-1">{{ unclaimError }}</div>

            <div class="confirm-content mt-1">
              <p>
                <i18n-t keypath="listPublic.unclaimModal.confirmMessage" tag="span">
                  <template #name>
                    <strong>«{{ itemToUnclaim.name }}»</strong>
                  </template>
                </i18n-t>
              </p>
            </div>

            <div class="modal-actions">
              <button type="button" @click="showUnclaimModal = false" class="btn btn-outline" :disabled="isUnclaiming">
                {{ t('common.actions.back') }}
              </button>
              <button type="button" @click="confirmUnclaim" class="btn btn-danger-solid" :disabled="isUnclaiming">
                {{ isUnclaiming ? t('listPublic.unclaimModal.submitting') : t('listPublic.unclaimModal.submit') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
    <div v-else-if="loadError" class="text-center mt-2">
      <p>{{ t('listPublic.notFound') }}</p>
    </div>
    <div v-else class="loading-state card text-center mt-2" aria-live="polite" aria-busy="true">
      <span class="spinner spinner-lg" aria-hidden="true"></span>
      <p class="loading-text">{{ t('listPublic.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
.header-card {
  padding: 3rem 1.5rem;
  margin-bottom: 2.5rem;
}

.owner-info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.owner-prefix {
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-accent);
  font-weight: 600;
  font-size: 0.85rem;
}

.owner-name {
  color: var(--color-heading);
  font-weight: 700;
  font-size: 1rem;
}

.list-title {
  font-size: 2.75rem;
  line-height: 1.2;
  margin-bottom: 0.75rem;
  color: var(--color-heading);
  overflow-wrap: break-word;
  word-break: break-word;
}

.list-description {
  max-width: 600px;
  margin: 0 auto;
  font-size: 1.1rem;
  color: #666;
  overflow-wrap: break-word;
  word-break: break-word;
}

.hero-guide {
  max-width: 620px;
  margin: 1.5rem auto 0;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  overflow: hidden;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.hero-guide:hover {
  border-color: var(--color-border-hover);
}

.guide-header-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  color: var(--color-heading);
  transition: background-color 0.15s;
}

.guide-header-btn:hover {
  background-color: rgba(79, 109, 104, 0.08);
}

.guide-header-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.guide-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.guide-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.guide-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.guide-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
  transition: transform 0.25s ease;
}

.guide-chevron.is-rotated {
  transform: rotate(180deg);
}

.guide-body {
  padding: 0 1.25rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid rgba(79, 109, 104, 0.12);
  padding-top: 0.85rem;
}

.guide-lead {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-heading);
}

.guide-how-it-works {
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--color-text);
  padding-top: 0.6rem;
  border-top: 1px dashed var(--color-border);
}

.guide-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.guide-step {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 0.25rem 0.65rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-heading);
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}

.item-card {
  height: 100%;
  margin-bottom: 0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  overflow-wrap: break-word;
  word-break: break-word;
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
  overflow-wrap: break-word;
  word-break: break-word;
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
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
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
  flex-wrap: wrap;
  gap: 0.5rem;
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
    padding: 1.75rem 1rem;
    margin-bottom: 1.5rem;
  }
  
  .list-title {
    font-size: 1.85rem;
  }

  .owner-info {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .owner-name {
    font-size: 0.9rem;
  }

  .hero-guide {
    margin-top: 1.25rem;
  }

  .guide-header-btn {
    padding: 0.65rem 0.85rem;
  }

  .guide-title {
    font-size: 0.95rem;
  }

  .guide-body {
    padding: 0 0.85rem 0.85rem 0.85rem;
    padding-top: 0.75rem;
  }

  .guide-lead {
    font-size: 0.9rem;
  }

  .guide-how-it-works {
    font-size: 0.85rem;
  }

  .guide-steps {
    flex-direction: column;
    align-items: flex-start;
  }

  .guide-step {
    width: 100%;
    box-sizing: border-box;
  }
  
  .items-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .my-claim {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .my-claim .badge {
    text-align: center;
  }

  .my-claim .btn {
    width: 100%;
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
