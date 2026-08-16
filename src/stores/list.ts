import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export type ListSummary = components['schemas']['ListSummaryDto']
export type ListDetails = components['schemas']['ListDetailsDto']
export type Item = components['schemas']['ItemDto']
export type UpsertItemRequest = components['schemas']['UpsertItemRequest']
export type CreateListRequest = components['schemas']['CreateGiftListRequest']
export type UpdateListRequest = components['schemas']['UpdateGiftListRequest']

export const useListStore = defineStore('list', () => {
  const lists = ref<ListSummary[]>([])
  const currentList = ref<ListDetails | null>(null)
  const isLoading = ref(false)

  async function fetchLists() {
    isLoading.value = true
    try {
      const response = await client.get<ListSummary[]>('/user/lists')
      lists.value = response.data
    } finally {
      isLoading.value = false
    }
  }

  async function fetchListDetails(listId: string) {
    isLoading.value = true
    try {
      const response = await client.get<ListDetails>(`/user/lists/${listId}`)
      currentList.value = response.data
      // Sort items by orderNumber ascending
      if (currentList.value.items) {
        currentList.value.items.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
      }
    } finally {
      isLoading.value = false
    }
  }

  async function createList(data: CreateListRequest) {
    const response = await client.post<ListSummary>('/user/lists', data)
    lists.value.push(response.data)
    return response.data
  }

  async function updateList(listId: string, data: UpdateListRequest) {
    await client.put(`/user/lists/${listId}`, data)
    if (currentList.value && currentList.value.id === listId) {
      currentList.value.name = data.name
      currentList.value.description = data.description
    }
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      list.name = data.name
      list.description = data.description
    }
  }

  async function deleteList(listId: string) {
    await client.delete(`/user/lists/${listId}`)
    lists.value = lists.value.filter(l => l.id !== listId)
    if (currentList.value && currentList.value.id === listId) {
      currentList.value = null
    }
  }

  async function addItem(listId: string, item: UpsertItemRequest) {
    await client.post(`/user/lists/${listId}/items`, item)
    await fetchListDetails(listId)
  }

  async function updateItem(listId: string, itemId: string, item: UpsertItemRequest) {
    await client.put(`/user/lists/${listId}/items/${itemId}`, item)
    await fetchListDetails(listId)
  }

  async function deleteItem(listId: string, itemId: string) {
    await client.delete(`/user/lists/${listId}/items/${itemId}`)
    await fetchListDetails(listId)
  }

  return { 
    lists, currentList, isLoading, 
    fetchLists, fetchListDetails, 
    createList, updateList, deleteList,
    addItem, updateItem, deleteItem 
  }
})
