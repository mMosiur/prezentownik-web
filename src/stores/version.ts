import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export type VersionResponse = components['schemas']['VersionResponse']

export const useVersionStore = defineStore('version', () => {
  const appVersion = ref(__APP_VERSION__)
  const appCommit = ref(__COMMIT_HASH__)

  const apiVersion = ref<string | null>(null)
  const apiCommit = ref<string | null>(null)
  const isLoading = ref(false)
  const isLoaded = ref(false)

  const appShortCommit = computed(() => {
    if (!appCommit.value || appCommit.value === 'unknown') {
      return null
    }
    if (/^[0-9a-f]{7,}$/i.test(appCommit.value)) {
      return appCommit.value.slice(0, 7)
    }
    return appCommit.value
  })

  const apiShortCommit = computed(() => {
    if (!apiCommit.value || apiCommit.value === 'unknown') {
      return null
    }
    if (/^[0-9a-f]{7,}$/i.test(apiCommit.value)) {
      return apiCommit.value.slice(0, 7)
    }
    return apiCommit.value
  })

  const formattedAppVersion = computed(() => {
    if (!appVersion.value) return null
    return appVersion.value.startsWith('v') || appVersion.value.startsWith('V')
      ? appVersion.value
      : `v${appVersion.value}`
  })

  const formattedApiVersion = computed(() => {
    if (!apiVersion.value) return null
    return apiVersion.value.startsWith('v') || apiVersion.value.startsWith('V')
      ? apiVersion.value
      : `v${apiVersion.value}`
  })

  async function fetchVersion() {
    if (isLoading.value || isLoaded.value) return
    isLoading.value = true
    try {
      const response = await client.get<VersionResponse>('/version')
      if (response.data) {
        apiVersion.value = response.data.version
        apiCommit.value = response.data.commit
        isLoaded.value = true
      }
    } catch {
      // Silently ignore so version fetch failure does not disrupt application flows
    } finally {
      isLoading.value = false
    }
  }

  return {
    appVersion,
    appCommit,
    appShortCommit,
    formattedAppVersion,
    apiVersion,
    apiCommit,
    apiShortCommit,
    formattedApiVersion,
    isLoading,
    isLoaded,
    fetchVersion,
  }
})
