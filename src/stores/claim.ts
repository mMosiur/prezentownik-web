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

export const useClaimStore = defineStore('claim', () => {
  const currentPublicList = ref<PublicList | null>(null)
  const isLoading = ref(false)

  function getRevocationToken(itemId: string): string | null {
    return localStorage.getItem(`claim_${itemId}`)
  }

  function setRevocationToken(itemId: string, token: string) {
    localStorage.setItem(`claim_${itemId}`, token)
  }

  function removeRevocationToken(itemId: string) {
    localStorage.removeItem(`claim_${itemId}`)
  }

  function getAllStoredRevocationTokens(): string[] {
    const tokens: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('claim_')) {
        const token = localStorage.getItem(key)
        if (token) {
          tokens.push(token)
        }
      }
    }
    return tokens
  }

  async function adoptStoredClaims() {
    const tokens = getAllStoredRevocationTokens()
    if (tokens.length === 0) return

    try {
      const response = await client.post<AdoptClaimsResponse>('/lists/claims/adopt', {
        revocationTokens: tokens
      })
      if (response.data.adoptedClaimsRevocationTokens?.length) {
        const adoptedSet = new Set(
          response.data.adoptedClaimsRevocationTokens.map((token: string) => token.toLowerCase())
        )
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('claim_')) {
            const token = localStorage.getItem(key)
            if (token && adoptedSet.has(token.toLowerCase())) {
              keysToRemove.push(key)
            }
          }
        }
        keysToRemove.forEach((key: string) => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('Failed to adopt stored claims', error)
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

  async function claimItem(listId: string, itemId: string, request: CreateClaimRequest) {
    const response = await client.post<CreateClaimResponse>(`/lists/${listId}/items/${itemId}/claims`, request)
    if (response.data.revocationToken) {
      setRevocationToken(itemId, response.data.revocationToken)
    }
    await fetchPublicList(listId)
  }

  async function unclaimItem(listId: string, itemId: string) {
    const token = getRevocationToken(itemId)

    await client.delete(`/lists/${listId}/items/${itemId}/claims`, {
      params: token ? { revocationToken: token } : undefined
    })
    removeRevocationToken(itemId)
    await fetchPublicList(listId)
  }

  return { 
    currentPublicList, isLoading, 
    fetchPublicList, claimItem, unclaimItem,
    getRevocationToken, setRevocationToken, removeRevocationToken,
    getAllStoredRevocationTokens, adoptStoredClaims
  }
})
