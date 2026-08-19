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
export type ReorderItemsRequest = components['schemas']['ReorderItemsRequest']

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
    const response = await client.put<ListSummary>(`/user/lists/${listId}`, data)
    if (currentList.value && currentList.value.id === listId) {
      currentList.value.name = response.data?.name ?? data.name
      currentList.value.description = response.data?.description ?? data.description
    }
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      list.name = response.data?.name ?? data.name
      list.description = response.data?.description ?? data.description
    }
    return response.data
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

  async function reorderItems(listId: string, itemIds: string[]) {
    const previousItems = currentList.value?.items ? [...currentList.value.items] : null
    if (currentList.value?.items) {
      const itemsMap = new Map(currentList.value.items.map(i => [i.id, i]))
      const reordered: Item[] = []
      for (let i = 0; i < itemIds.length; i++) {
        const id = itemIds[i]
        if (id !== undefined) {
          const item = itemsMap.get(id)
          if (item) {
            reordered.push({ ...item, orderNumber: i + 1 })
          }
        }
      }
      currentList.value.items = reordered
    }

    try {
      const response = await client.put<ListDetails>(`/user/lists/${listId}/items/reorder`, { itemIds })
      currentList.value = response.data
      if (currentList.value.items) {
        currentList.value.items.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
      }
      return response.data
    } catch (err) {
      if (previousItems && currentList.value) {
        currentList.value.items = previousItems
      }
      throw err
    }
  }

  return { 
    lists, currentList, isLoading, 
    fetchLists, fetchListDetails, 
    createList, updateList, deleteList,
    addItem, updateItem, deleteItem,
    reorderItems
  }
})
