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

  let fetchListDetailsCounter = 0
  let reorderCounter = 0
  let activeListDetailsId: string | null = null

  function clearCurrentList() {
    currentList.value = null
    activeListDetailsId = null
    fetchListDetailsCounter++
    reorderCounter++
  }

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
    activeListDetailsId = listId
    const fetchId = ++fetchListDetailsCounter
    isLoading.value = true
    try {
      const response = await client.get<ListDetails>(`/user/lists/${listId}`)
      if (fetchId !== fetchListDetailsCounter || activeListDetailsId !== listId) {
        return response.data
      }
      currentList.value = response.data
      // Sort items by orderNumber ascending
      if (currentList.value.items) {
        currentList.value.items.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
      }
      reorderCounter++
      return response.data
    } finally {
      if (fetchId === fetchListDetailsCounter) {
        isLoading.value = false
      }
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
    if (activeListDetailsId === listId) {
      activeListDetailsId = null
      fetchListDetailsCounter++
      reorderCounter++
    }
  }

  async function addItem(listId: string, item: UpsertItemRequest) {
    const response = await client.post<Item>(`/user/lists/${listId}/items`, item)
    if (currentList.value?.id === listId) {
      currentList.value.items = [...currentList.value.items, response.data]
        .sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
    }

    let refreshError: unknown = null
    if (activeListDetailsId === listId) {
      try {
        await fetchListDetails(listId)
      } catch (err: unknown) {
        refreshError = err
      }
    }
    return { item: response.data, refreshError }
  }

  async function updateItem(listId: string, itemId: string, item: UpsertItemRequest) {
    const response = await client.put<Item>(`/user/lists/${listId}/items/${itemId}`, item)
    if (currentList.value?.id === listId) {
      const itemIndex = currentList.value.items.findIndex(existingItem => existingItem.id === itemId)
      if (itemIndex === -1) {
        currentList.value.items.push(response.data)
      } else {
        currentList.value.items[itemIndex] = response.data
      }
      currentList.value.items.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
    }

    let refreshError: unknown = null
    if (activeListDetailsId === listId) {
      try {
        await fetchListDetails(listId)
      } catch (err: unknown) {
        refreshError = err
      }
    }
    return { item: response.data, refreshError }
  }

  async function deleteItem(listId: string, itemId: string) {
    await client.delete(`/user/lists/${listId}/items/${itemId}`)
    if (currentList.value?.id === listId) {
      currentList.value.items = currentList.value.items.filter(item => item.id !== itemId)
    }

    let refreshError: unknown = null
    if (activeListDetailsId === listId) {
      try {
        await fetchListDetails(listId)
      } catch (err: unknown) {
        refreshError = err
      }
    }
    return { refreshError }
  }

  async function reorderItems(listId: string, itemIds: string[]) {
    const isCurrent = currentList.value?.id === listId && activeListDetailsId === listId
    const previousItemIds = isCurrent && currentList.value?.items ? currentList.value.items.map(i => i.id) : []
    const reorderId = ++reorderCounter

    if (isCurrent && currentList.value?.items) {
      const itemsMap = new Map(currentList.value.items.map(i => [i.id, i]))
      const reordered: Item[] = []
      for (let i = 0; i < itemIds.length; i++) {
        const id = itemIds[i]
        if (id !== undefined) {
          const item = itemsMap.get(id)
          if (item) {
            reordered.push({ ...item, orderNumber: i + 1 })
            itemsMap.delete(id)
          }
        }
      }
      if (itemsMap.size > 0) {
        const remaining = Array.from(itemsMap.values()).sort(
          (a, b) => Number(a.orderNumber) - Number(b.orderNumber)
        )
        for (let i = 0; i < remaining.length; i++) {
          const rem = remaining[i]
          if (rem) {
            reordered.push({ ...rem, orderNumber: reordered.length + 1 })
          }
        }
      }
      currentList.value.items = reordered
    }

    try {
      const response = await client.put<ListDetails>(`/user/lists/${listId}/items/reorder`, { itemIds })
      if (currentList.value?.id === listId && activeListDetailsId === listId && reorderId === reorderCounter) {
        if (currentList.value.items) {
          const serverItemsMap = new Map((response.data.items || []).map(i => [i.id, i]))
          const reconciled: Item[] = []
          for (const item of currentList.value.items) {
            const serverItem = serverItemsMap.get(item.id)
            if (serverItem) {
              reconciled.push({
                ...item,
                orderNumber: serverItem.orderNumber
              })
            } else {
              reconciled.push(item)
            }
          }
          reconciled.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber))
          currentList.value.items = reconciled
        }
      }
      return response.data
    } catch (err) {
      if (
        currentList.value?.id === listId &&
        activeListDetailsId === listId &&
        reorderId === reorderCounter &&
        currentList.value.items &&
        previousItemIds.length > 0
      ) {
        const currentMap = new Map(currentList.value.items.map(item => [item.id, item]))
        const rolledBack: Item[] = []

        for (const prevId of previousItemIds) {
          const currentItem = currentMap.get(prevId)
          if (currentItem) {
            rolledBack.push(currentItem)
            currentMap.delete(prevId)
          }
        }

        if (currentMap.size > 0) {
          const addedItems = Array.from(currentMap.values()).sort(
            (a, b) => Number(a.orderNumber) - Number(b.orderNumber)
          )
          rolledBack.push(...addedItems)
        }

        for (let i = 0; i < rolledBack.length; i++) {
          const item = rolledBack[i]
          if (item) {
            rolledBack[i] = {
              ...item,
              orderNumber: i + 1
            }
          }
        }

        currentList.value.items = rolledBack
      }
      throw err
    }
  }

  return { 
    lists, currentList, isLoading, 
    fetchLists, fetchListDetails, clearCurrentList,
    createList, updateList, deleteList,
    addItem, updateItem, deleteItem,
    reorderItems
  }
})
