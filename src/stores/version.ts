import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export type VersionResponse = components['schemas']['VersionResponse']

export const useVersionStore = defineStore('version', () => {
  const version = ref<string | null>(null)
  const commit = ref<string | null>(null)
  const isLoading = ref(false)
  const isLoaded = ref(false)

  const shortCommit = computed(() => {
    if (!commit.value || commit.value === 'unknown') {
      return null
    }
    if (/^[0-9a-f]{7,}$/i.test(commit.value)) {
      return commit.value.slice(0, 7)
    }
    return commit.value
  })

  const formattedVersion = computed(() => {
    if (!version.value) return null
    const v = version.value.startsWith('v') || version.value.startsWith('V')
      ? version.value
      : `v${version.value}`
    if (shortCommit.value) {
      return `${v} (${shortCommit.value})`
    }
    return v
  })

  async function fetchVersion() {
    if (isLoading.value || isLoaded.value) return
    isLoading.value = true
    try {
      const response = await client.get<VersionResponse>('/version')
      if (response.data) {
        version.value = response.data.version
        commit.value = response.data.commit
        isLoaded.value = true
      }
    } catch {
      // Silently ignore so version fetch failure does not disrupt application flows
    } finally {
      isLoading.value = false
    }
  }

  return {
    version,
    commit,
    shortCommit,
    formattedVersion,
    isLoading,
    isLoaded,
    fetchVersion,
  }
})
