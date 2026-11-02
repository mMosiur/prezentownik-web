import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export type PublicList = components['schemas']['PublicListDto']
export type PublicItem = components['schemas']['PublicItemDto']
export type PublicClaim = components['schemas']['PublicClaimDto']
export type CreateClaimRequest = components['schemas']['CreateClaimRequest']
export type CreateClaimResponse = components['schemas']['CreateClaimResponse']
export type AdoptClaimsRequest = components['schemas']['AdoptClaimsRequest']
export type AdoptClaimsResponse = components['schemas']['AdoptClaimsResponse']

export class ClaimAlreadyExistsError extends Error {
  constructor() {
    super('A reservation already exists for this gift.')
    this.name = 'ClaimAlreadyExistsError'
  }
}

export const useClaimStore = defineStore('claim', () => {
  const currentPublicList = ref<PublicList | null>(null)
  const isLoading = ref(false)
  const tokenPersistenceWarning = ref(false)
  const inMemoryRevocationTokens = new Map<string, string[]>()
  const volatileRevocationTokens = new Map<string, Set<string>>()
  const pendingAnonymousClaims = new Set<string>()

  function updateTokenPersistenceWarning() {
    tokenPersistenceWarning.value = Array.from(volatileRevocationTokens.values()).some(tokens => tokens.size > 0)
  }

  function getRevocationTokens(itemId: string): string[] {
    const tokens = new Set(inMemoryRevocationTokens.get(itemId) ?? [])
    const storageKeyPrefix = `claim_token_${itemId}_`

    try {
      const storage = window.localStorage
      const legacyToken = storage.getItem(`claim_${itemId}`)
      if (legacyToken) tokens.add(legacyToken)

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(storageKeyPrefix)) {
          const token = storage.getItem(key)
          if (token) tokens.add(token)
        }
      }
    } catch {
      // In-memory tokens remain available for the current page session.
    }

    return Array.from(tokens)
  }

  function getRevocationToken(itemId: string): string | null {
    return getRevocationTokens(itemId).at(-1) ?? null
  }

  function canPersistRevocationTokens(): boolean {
    try {
      const storage = window.localStorage
      const key = `__claim_storage_check_${crypto.randomUUID()}`
      storage.setItem(key, '1')
      storage.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  function setRevocationToken(itemId: string, token: string): boolean {
    const tokens = new Set(getRevocationTokens(itemId))
    tokens.add(token)
    inMemoryRevocationTokens.set(itemId, Array.from(tokens))

    try {
      const storage = window.localStorage
      for (const storedToken of tokens) {
        storage.setItem(`claim_token_${itemId}_${storedToken}`, storedToken)
      }
      try {
        storage.removeItem(`claim_${itemId}`)
      } catch {
        // The new per-claim keys are already durable; keep the legacy key for a later cleanup.
      }
      volatileRevocationTokens.delete(itemId)
      updateTokenPersistenceWarning()
      return true
    } catch {
      const volatileTokens = volatileRevocationTokens.get(itemId) ?? new Set<string>()
      volatileTokens.add(token)
      volatileRevocationTokens.set(itemId, volatileTokens)
      tokenPersistenceWarning.value = true
      return false
    }
  }

  function removeRevocationToken(itemId: string, tokenToRemove?: string) {
    const tokens = tokenToRemove ? getRevocationTokens(itemId).filter(token => token !== tokenToRemove) : []
    if (tokens.length > 0) {
      inMemoryRevocationTokens.set(itemId, tokens)
    } else {
      inMemoryRevocationTokens.delete(itemId)
    }

    const volatileTokens = volatileRevocationTokens.get(itemId)
    if (volatileTokens) {
      if (tokenToRemove) volatileTokens.delete(tokenToRemove)
      else volatileTokens.clear()
      if (volatileTokens.size === 0) volatileRevocationTokens.delete(itemId)
      updateTokenPersistenceWarning()
    }

    try {
      const storage = window.localStorage
      if (tokenToRemove) {
        storage.removeItem(`claim_token_${itemId}_${tokenToRemove}`)
        if (storage.getItem(`claim_${itemId}`) === tokenToRemove) {
          storage.removeItem(`claim_${itemId}`)
        }
      } else {
        for (let i = storage.length - 1; i >= 0; i--) {
          const key = storage.key(i)
          if (key?.startsWith(`claim_token_${itemId}_`)) storage.removeItem(key)
        }
        storage.removeItem(`claim_${itemId}`)
      }
    } catch {
      // The server-side mutation has already succeeded; do not turn it into a reported failure.
    }
  }

  function getAllStoredRevocationTokens(): string[] {
    const tokens: string[] = []
    for (const storedTokens of inMemoryRevocationTokens.values()) {
      tokens.push(...storedTokens)
    }

    try {
      const storage = window.localStorage
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith('claim_token_')) {
          const token = storage.getItem(key)
          if (token) tokens.push(token)
        } else if (key?.startsWith('claim_')) {
          const token = storage.getItem(key)
          if (token) tokens.push(token)
        }
      }
    } catch {
      // Return any tokens retained in memory when browser storage is unavailable.
    }

    return Array.from(new Set(tokens))
  }

  function removeStoredRevocationToken(tokenToRemove: string) {
    const normalizedTokenToRemove = tokenToRemove.toLowerCase()
    for (const [itemId, tokens] of inMemoryRevocationTokens) {
      const remainingTokens = tokens.filter(token => token.toLowerCase() !== normalizedTokenToRemove)
      if (remainingTokens.length > 0) inMemoryRevocationTokens.set(itemId, remainingTokens)
      else inMemoryRevocationTokens.delete(itemId)
    }
    for (const [itemId, tokens] of volatileRevocationTokens) {
      for (const token of tokens) {
        if (token.toLowerCase() === normalizedTokenToRemove) tokens.delete(token)
      }
      if (tokens.size === 0) volatileRevocationTokens.delete(itemId)
    }
    updateTokenPersistenceWarning()

    try {
      const storage = window.localStorage
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i)
        const storedToken = key ? storage.getItem(key) : null
        if (key?.startsWith('claim_token_') && storedToken?.toLowerCase() === normalizedTokenToRemove) {
          storage.removeItem(key)
        } else if (key?.startsWith('claim_') && storedToken?.toLowerCase() === normalizedTokenToRemove) {
          storage.removeItem(key)
        }
      }
    } catch {
      // Keep adoption best-effort when browser storage is unavailable.
    }
  }

  async function adoptStoredClaims() {
    const tokens = getAllStoredRevocationTokens()
    if (tokens.length === 0) return

    try {
      const response = await client.post<AdoptClaimsResponse>('/lists/claims/adopt', {
        revocationTokens: tokens
      })
      if (response.data.adoptedClaimsRevocationTokens?.length) {
        response.data.adoptedClaimsRevocationTokens.forEach(removeStoredRevocationToken)
      }
    } catch {
      // Retain tokens so adoption can be retried later.
    }
  }

  async function fetchPublicList(listId: string) {
    isLoading.value = true
    try {
      const response = await client.get<PublicList>(`/lists/${listId}`)
      currentPublicList.value = response.data
      // Sort items by orderNumber ascending
      if (currentPublicList.value.items) {
        currentPublicList.value.items.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
      }
    } finally {
      isLoading.value = false
    }
  }

  async function claimItem(listId: string, itemId: string, request: CreateClaimRequest, isAuthenticated: boolean) {
    const submitClaim = async () => {
      if (!isAuthenticated && (pendingAnonymousClaims.has(itemId) || getRevocationTokens(itemId).length > 0)) {
        throw new ClaimAlreadyExistsError()
      }

      if (!isAuthenticated) pendingAnonymousClaims.add(itemId)
      try {
        const response = await client.post<CreateClaimResponse>(`/lists/${listId}/items/${itemId}/claims`, request)
        let tokenStorageFailed = false
        if (response.data.revocationToken) {
          tokenStorageFailed = !setRevocationToken(itemId, response.data.revocationToken)
        }

        try {
          await fetchPublicList(listId)
          return {
            claimId: typeof response.data.claimId === 'string' ? response.data.claimId : null,
            revocationToken: response.data.revocationToken,
            refreshError: null,
            tokenStorageFailed
          }
        } catch (refreshError: unknown) {
          return {
            claimId: typeof response.data.claimId === 'string' ? response.data.claimId : null,
            revocationToken: response.data.revocationToken,
            refreshError,
            tokenStorageFailed
          }
        }
      } finally {
        if (!isAuthenticated) pendingAnonymousClaims.delete(itemId)
      }
    }

    if (!isAuthenticated && typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(`prezentownik-claim-${itemId}`, submitClaim)
    }

    return submitClaim()
  }

  async function unclaimSpecificClaim(
    listId: string,
    itemId: string,
    claimId: string | null,
    revocationToken: string | null,
    allowIdentityFallback: boolean
  ) {
    if (revocationToken) {
      try {
        await client.delete(`/lists/${listId}/items/${itemId}/claims`, {
          params: { revocationToken }
        })
      } catch (tokenError: unknown) {
        if (!allowIdentityFallback || !claimId) throw tokenError
        await client.delete(`/lists/${listId}/items/${itemId}/claims/${claimId}`)
      }
      removeRevocationToken(itemId, revocationToken)
    } else {
      if (!claimId) throw new Error('An exact claim identifier is required to remove this claim.')
      await client.delete(`/lists/${listId}/items/${itemId}/claims/${claimId}`)
    }

    try {
      await fetchPublicList(listId)
      return { refreshError: null }
    } catch (refreshError: unknown) {
      return { refreshError }
    }
  }

  async function unclaimItem(listId: string, itemId: string) {
    const token = getRevocationToken(itemId)

    await client.delete(`/lists/${listId}/items/${itemId}/claims`, {
      params: token ? { revocationToken: token } : undefined
    })
    if (token) removeRevocationToken(itemId, token)

    try {
      await fetchPublicList(listId)
      return { refreshError: null }
    } catch (refreshError: unknown) {
      return { refreshError }
    }
  }

  return {
    currentPublicList, isLoading, tokenPersistenceWarning,
    fetchPublicList, claimItem, unclaimItem, unclaimSpecificClaim,
    getRevocationToken, getRevocationTokens, setRevocationToken, removeRevocationToken,
    getAllStoredRevocationTokens, adoptStoredClaims, canPersistRevocationTokens
  }
})
