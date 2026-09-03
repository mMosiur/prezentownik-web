<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useClaimStore, type PublicItem } from '@/stores/claim'
import { useAuthStore } from '@/stores/auth'
import { parseApiError } from '@/utils/errors'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const claimStore = useClaimStore()
const authStore = useAuthStore()
const toast = useToast()
const listId = route.params.listId as string

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

const ownerInitials = computed(() => {
  const name = claimStore.currentPublicList?.ownerDisplayName || ''
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]
  const second = parts[1]
  if (first && second && first.length > 0 && second.length > 0) {
    return (first[0]! + second[0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
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

function maxClaimable(item: PublicItem) {
  if (item.type !== 1) return 1
  return Math.max(1, Number(item.targetQuantity || 1) - Number(item.totalClaimed || 0))
}

function incrementClaimQuantity() {
  if (!selectedItem.value) return
  const max = maxClaimable(selectedItem.value)
  if (claimForm.value.quantityClaimed < max) {
    claimForm.value.quantityClaimed++
  }
}

function decrementClaimQuantity() {
  if (claimForm.value.quantityClaimed > 1) {
    claimForm.value.quantityClaimed--
  }
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
    toast.success(t('common.toasts.claimed'))
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
    toast.success(t('common.toasts.unclaimed'))
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

function extractUrl(text: string | null): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/[^\s]+)/i)
  return match ? match[0] : null
}
</script>

<template>
  <div class="container list-public-container mt-2">
    <div v-if="claimStore.currentPublicList && !isCheckingOwnership">
      <!-- Public Hero Card -->
      <header class="public-header text-center">
        <div class="card header-card">
          <!-- Owner badge / avatar -->
          <div class="owner-pill-badge">
            <div class="owner-avatar-circle">
              {{ ownerInitials }}
            </div>
            <div class="owner-text-wrap">
              <span class="owner-prefix">{{ t('listPublic.ownerPrefix') }}</span>
              <strong class="owner-name">{{ claimStore.currentPublicList.ownerDisplayName || t('listPublic.anonymousOwner') }}</strong>
            </div>
          </div>

          <h1 class="list-title mt-1">{{ claimStore.currentPublicList.name }}</h1>
          
          <p v-if="claimStore.currentPublicList.description" class="list-description mt-1">
            {{ claimStore.currentPublicList.description }}
          </p>

          <!-- Collapsible Guide Accordion -->
          <div class="hero-guide mt-2" :class="{ 'is-expanded': isGuideExpanded }">
            <button 
              type="button" 
              class="guide-header-btn" 
              @click="isGuideExpanded = !isGuideExpanded"
              :aria-expanded="isGuideExpanded"
              aria-controls="hero-guide-content"
            >
              <div class="guide-header-left">
                <span class="guide-icon">💡</span>
                <span class="guide-title">{{ t('listPublic.guideTitle') }}</span>
              </div>
              <span class="guide-chevron" :class="{ 'is-rotated': isGuideExpanded }" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            
            <Transition name="accordion">
              <div v-show="isGuideExpanded" id="hero-guide-content" class="guide-body">
                <p class="guide-lead">
                  {{ t('listPublic.guideLead') }}
                </p>
                <p class="guide-how-it-works mt-1">
                  {{ t('listPublic.guideHowItWorks') }}
                </p>
                <div class="guide-steps mt-1">
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
            </Transition>
          </div>
        </div>
      </header>

      <!-- Empty State -->
      <div v-if="claimStore.currentPublicList.items.length === 0" class="empty-state card text-center mt-2">
        <span class="empty-emoji">🎁</span>
        <h3 class="mt-1">{{ t('listPublic.empty') }}</h3>
      </div>

      <!-- Items Grid -->
      <div v-else class="items-grid mt-2">
        <div
          v-for="item in claimStore.currentPublicList.items"
          :key="item.id"
          class="card item-card"
          :class="{
            'is-claimed-by-me': isClaimedByMe(item.id),
            'is-fully-claimed': item.type !== 2 && Number(item.totalClaimed) >= Number(item.targetQuantity)
          }"
        >
          <div class="item-body">
            <div class="item-info">
              <div class="item-title-row">
                <h3 class="item-title">{{ item.name }}</h3>
                <span v-if="isClaimedByMe(item.id)" class="claimed-badge">
                  ⭐ {{ t('listPublic.yourChoice') }}
                </span>
              </div>

              <p v-if="item.description" class="item-description mt-1">{{ item.description }}</p>
              
              <!-- Store link button if URL detected -->
              <div v-if="extractUrl(item.description)" class="item-url-wrap mt-1">
                <a
                  :href="extractUrl(item.description)!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-sm btn-outline btn-store-link"
                >
                  <span>{{ t('listPublic.openLink') }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>

              <!-- Quantity Progress Indicator -->
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
                  <div class="unlimited-badge">
                    <span>♾️</span>
                    <span class="status-text">{{ t('listPublic.claimedProgressUnlimited', { claimed: item.totalClaimed }) }}</span>
                  </div>
                </template>
              </div>

              <!-- Claimants avatars & names list -->
              <div v-if="item.claims && item.claims.length > 0" class="claims-list mt-1">
                <p class="claims-label">{{ t('listPublic.whoClaimed') }}</p>
                <div class="claimants-pills">
                  <span v-for="(claim, claimIndex) in item.claims" :key="claimIndex" class="claimant-pill">
                    <span class="claimant-avatar-circle">
                      {{ (claim.claimantName || '?').slice(0, 1).toUpperCase() }}
                    </span>
                    <span class="claimant-name">{{ claim.claimantName || t('listPublic.anonymousClaimant') }}</span>
                    <span v-if="item.type !== 0" class="claim-qty">&times;{{ claim.quantityClaimed }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Item Action buttons -->
            <div class="item-actions">
              <div v-if="isClaimedByMe(item.id)" class="my-claim-action">
                <button @click="openUnclaimModal(item)" class="btn btn-sm btn-outline btn-unclaim">
                  {{ t('listPublic.unclaim') }}
                </button>
              </div>
              <button 
                v-else-if="item.type === 2 || Number(item.totalClaimed) < Number(item.targetQuantity)" 
                @click="openClaim(item)" 
                class="btn btn-block btn-claim"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
                <span>{{ t('listPublic.selectGift') }}</span>
              </button>
              <div v-else class="fully-claimed">
                <span class="check-icon">✓</span>
                <span>{{ t('listPublic.fullyClaimed') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Claim Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showClaimModal && selectedItem" class="modal-overlay" @click="!isSubmittingClaim && (showClaimModal = false)">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="claim-modal-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">🎁</span>
                  <h2 id="claim-modal-title">{{ t('listPublic.claimModal.title', { name: selectedItem.name }) }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isSubmittingClaim" @click="showClaimModal = false">&times;</button>
              </div>

              <div v-if="error" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ error }}</span>
              </div>

              <form @submit.prevent="handleClaim" class="mt-2" novalidate>
                <div class="form-group">
                  <label for="claimant-name">{{ t('listPublic.claimModal.nameLabel') }}</label>
                  <input
                    id="claimant-name"
                    v-model="claimForm.claimantName"
                    :placeholder="t('listPublic.claimModal.namePlaceholder')"
                    :disabled="isSubmittingClaim"
                  />
                </div>

                <!-- Stepper for Quantity Type Items -->
                <div v-if="selectedItem.type === 1" class="form-group mt-1">
                  <label for="claim-quantity">{{ t('listPublic.claimModal.quantityLabel') }}</label>
                  <div class="stepper-box">
                    <button
                      type="button"
                      class="stepper-btn"
                      @click="decrementClaimQuantity"
                      :disabled="isSubmittingClaim || claimForm.quantityClaimed <= 1"
                    >
                      -
                    </button>
                    <input 
                      id="claim-quantity"
                      v-model.number="claimForm.quantityClaimed" 
                      type="number" 
                      min="1" 
                      :max="maxClaimable(selectedItem)" 
                      required 
                      class="stepper-input"
                      :disabled="isSubmittingClaim"
                    />
                    <button
                      type="button"
                      class="stepper-btn"
                      @click="incrementClaimQuantity"
                      :disabled="isSubmittingClaim || claimForm.quantityClaimed >= maxClaimable(selectedItem)"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" @click="showClaimModal = false" class="btn btn-outline" :disabled="isSubmittingClaim">
                    {{ t('common.actions.cancel') }}
                  </button>
                  <button type="submit" class="btn btn-claim-submit" :disabled="isSubmittingClaim">
                    <span v-if="isSubmittingClaim" class="spinner spinner-sm" aria-hidden="true"></span>
                    <span>{{ isSubmittingClaim ? t('listPublic.claimModal.submitting') : t('listPublic.claimModal.submit') }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Unclaim Confirmation Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showUnclaimModal && itemToUnclaim" class="modal-overlay" @click="!isUnclaiming && (showUnclaimModal = false)">
            <div class="modal card card-elevated" @click.stop role="dialog" aria-modal="true" aria-labelledby="unclaim-title">
              <div class="modal-header">
                <div class="modal-title-wrap">
                  <span class="modal-title-icon">⚠️</span>
                  <h2 id="unclaim-title">{{ t('listPublic.unclaimModal.title') }}</h2>
                </div>
                <button class="close-btn" :aria-label="t('common.actions.close')" :disabled="isUnclaiming" @click="showUnclaimModal = false">&times;</button>
              </div>

              <div v-if="unclaimError" class="alert alert-error mt-1" role="alert">
                <span class="alert-desc">{{ unclaimError }}</span>
              </div>

              <div class="confirm-content mt-1">
                <p class="confirm-message">
                  <i18n-t keypath="listPublic.unclaimModal.confirmMessage" tag="span" scope="global">
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
                  <span v-if="isUnclaiming" class="spinner spinner-sm" aria-hidden="true"></span>
                  <span>{{ isUnclaiming ? t('listPublic.unclaimModal.submitting') : t('listPublic.unclaimModal.submit') }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="text-center card mt-2 not-found-card">
      <span class="not-found-emoji">🔍</span>
      <h2 class="mt-1">{{ t('listPublic.notFound') }}</h2>
      <RouterLink :to="{ name: 'home' }" class="btn btn-outline mt-2">
        {{ t('common.actions.back') }}
      </RouterLink>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state card text-center mt-2" aria-live="polite" aria-busy="true">
      <span class="spinner spinner-lg spinner-accent" aria-hidden="true"></span>
      <p class="loading-text">{{ t('listPublic.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
.list-public-container {
  padding-bottom: 3.5rem;
}

/* Public Header Card */
.header-card {
  padding: 2.5rem 2rem;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 242, 235, 0.95) 100%);
  border: 1px solid var(--color-border);
}

.owner-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 1rem 0.35rem 0.45rem;
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-xs);
}

.owner-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.owner-text-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.owner-prefix {
  color: var(--color-text-muted);
}

.owner-name {
  color: var(--color-heading);
}

.list-title {
  font-size: 2.1rem;
  color: var(--color-heading);
}

.list-description {
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  font-size: 1.05rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Guide Accordion */
.hero-guide {
  margin-top: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-elevated);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.hero-guide.is-expanded {
  border-color: var(--color-accent-soft);
  box-shadow: var(--shadow-sm);
}

.guide-header-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-heading);
  transition: background var(--transition-fast);
}

.guide-header-btn:hover {
  background: var(--color-accent-soft);
}

.guide-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.guide-icon {
  font-size: 1.25rem;
}

.guide-title {
  font-weight: 700;
  font-size: 0.98rem;
}

.guide-chevron {
  color: var(--color-text-light);
  display: flex;
  align-items: center;
  transition: transform var(--transition-normal);
}

.guide-chevron.is-rotated {
  transform: rotate(180deg);
}

.guide-body {
  padding: 1.25rem;
  text-align: left;
  border-top: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--color-text);
}

.guide-lead {
  font-weight: 500;
}

.guide-how-it-works {
  color: var(--color-text-muted);
}

.guide-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.guide-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* Accordion transition */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Items Grid & Cards */
.items-grid {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.item-card {
  padding: 1.5rem;
  margin-bottom: 0;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background-elevated);
  transition: all var(--transition-normal);
}

.item-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

.item-card.is-claimed-by-me {
  border: 2px solid var(--color-accent);
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(59, 119, 108, 0.04) 100%);
  box-shadow: 0 4px 18px var(--color-accent-glow);
}

.item-card.is-fully-claimed:not(.is-claimed-by-me) {
  opacity: 0.75;
  background: var(--color-background-soft);
}

.item-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.item-info {
  flex: 1;
  min-width: 260px;
}

.item-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.item-title {
  font-size: 1.25rem;
  color: var(--color-heading);
  margin: 0;
}

.claimed-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
}

.item-description {
  font-size: 0.94rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.btn-store-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  border-radius: var(--radius-full);
}

/* Progress bar */
.progress-container {
  width: 100%;
  max-width: 280px;
  height: 8px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 0.35rem;
}

.progress-bar {
  height: 100%;
  background: var(--color-accent-gradient);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.status-text {
  font-size: 0.86rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.unlimited-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Claimants */
.claims-list {
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}

.claims-label {
  font-size: 0.8rem;
  color: var(--color-text-light);
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.claimants-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.claimant-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem 0.15rem 0.25rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  color: var(--color-text);
}

.claimant-avatar-circle {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.claim-qty {
  font-weight: 700;
  color: var(--color-accent);
}

/* Action buttons */
.item-actions {
  display: flex;
  align-items: center;
  min-width: 160px;
  justify-content: flex-end;
}

.btn-claim {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  box-shadow: 0 4px 14px var(--color-accent-glow);
}

.my-claim-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-unclaim {
  color: var(--color-danger);
  border-color: rgba(224, 49, 49, 0.3);
}

.btn-unclaim:hover {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}

.fully-claimed {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.92rem;
  border: 1px solid var(--color-border);
}

.check-icon {
  font-weight: 900;
  color: var(--color-success);
}

/* Stepper */
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

.not-found-card {
  padding: 3.5rem 2rem;
}

.not-found-emoji {
  font-size: 3.5rem;
}

@media (max-width: 650px) {
  .header-card {
    padding: 1.75rem 1.25rem;
  }

  .list-title {
    font-size: 1.65rem;
  }

  .guide-steps {
    grid-template-columns: 1fr;
  }

  .item-body {
    flex-direction: column;
    align-items: stretch;
  }

  .item-actions {
    width: 100%;
    margin-top: 0.75rem;
  }

  .btn-claim,
  .fully-claimed,
  .my-claim-action {
    width: 100%;
    justify-content: center;
  }
}
</style>