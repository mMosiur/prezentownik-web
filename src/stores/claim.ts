import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export type PublicList = components['schemas']['PublicListDto']
export type PublicItem = components['schemas']['PublicItemDto']
export type PublicClaim = components['schemas']['PublicClaimDto']
export type CreateClaimRequest = components['schemas']['CreateClaimRequest']
export type CreateClaimResponse = components['schemas']['CreateClaimResponse']

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
    setRevocationToken(itemId, response.data.revocationToken)
    await fetchPublicList(listId)
  }

  async function unclaimItem(listId: string, itemId: string) {
    const token = getRevocationToken(itemId)
    if (!token) return

    await client.delete(`/lists/${listId}/items/${itemId}/claims`, {
      params: { revocationToken: token }
    })
    removeRevocationToken(itemId)
    await fetchPublicList(listId)
  }

  return { 
    currentPublicList, isLoading, 
    fetchPublicList, claimItem, unclaimItem,
    getRevocationToken
  }
})
