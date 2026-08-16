import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'

export interface UserInfo {
  email: string
  displayName: string | null
}

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const isLoading = ref(true)

  async function fetchUser() {
    isLoading.value = true
    try {
      // Use /auth/me as verified in backend code
      const response = await client.get<UserInfo>('/auth/me')
      user.value = response.data
    } catch (error) {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function login(data: LoginRequest) {
    await client.post('/auth/login?useCookies=true', data)
    await fetchUser()
  }

  async function register(data: RegisterRequest) {
    await client.post('/auth/register', data)
  }

  async function logout() {
    try {
      await client.post('/auth/logout')
    } catch {
      // Ignore if logout endpoint fails or doesn't exist
    } finally {
      user.value = null
    }
  }

  return { user, isAuthenticated, isLoading, fetchUser, login, register, logout }
})
