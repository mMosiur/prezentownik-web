import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { components } from '@/api/schema'
import { useClaimStore } from '@/stores/claim'

export interface UserInfo {
  email: string
  displayName: string | null
}

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type UpdateUserInfoRequest = components['schemas']['UpdateUserInfoRequest']
export type ResendConfirmationEmailRequest = components['schemas']['ResendConfirmationEmailRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']

export interface LoginOptions {
  useCookies?: boolean
  useSessionCookies?: boolean
}

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
      if (user.value) {
        const claimStore = useClaimStore()
        await claimStore.adoptStoredClaims()
      }
    } catch (error) {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(data: UpdateUserInfoRequest) {
    await client.put('/auth/me', data)
    if (user.value) {
      user.value.displayName = data.displayName
    }
  }

  async function login(data: LoginRequest, options?: LoginOptions) {
    const params = new URLSearchParams()
    const useCookies = options?.useCookies ?? true
    params.set('useCookies', String(useCookies))
    if (options?.useSessionCookies !== undefined) {
      params.set('useSessionCookies', String(options.useSessionCookies))
    }

    await client.post(`/auth/login?${params.toString()}`, data)
    await fetchUser()
  }

  async function register(data: RegisterRequest) {
    await client.post('/auth/register', data)
  }

  async function confirmEmail(userId: string, code: string, changedEmail?: string) {
    const params = new URLSearchParams()
    params.set('userId', userId)
    params.set('code', code)
    if (changedEmail) {
      params.set('changedEmail', changedEmail)
    }
    await client.get(`/auth/confirmEmail?${params.toString()}`)
  }

  async function resendConfirmationEmail(data: ResendConfirmationEmailRequest) {
    await client.post('/auth/resendConfirmationEmail', data)
  }

  async function forgotPassword(data: ForgotPasswordRequest) {
    await client.post('/auth/forgotPassword', data)
  }

  async function resetPassword(data: ResetPasswordRequest) {
    await client.post('/auth/resetPassword', data)
  }

  async function logout() {
    try {
      // The backend's logout endpoint (ASP.NET Core Identity-style) requires
      // an empty JSON object body to actually sign the user out and clear the
      // auth cookie - without it the request fails and the cookie survives.
      await client.post('/auth/logout', {})
    } finally {
      user.value = null
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    fetchUser,
    updateUser,
    login,
    register,
    logout,
    confirmEmail,
    resendConfirmationEmail,
    forgotPassword,
    resetPassword,
  }
})
