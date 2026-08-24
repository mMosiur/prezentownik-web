import axios from 'axios'
import type { components } from './schema'

export type HttpValidationProblemDetails = components['schemas']['HttpValidationProblemDetails']

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to ensure Accept-Language is always set
client.interceptors.request.use((config) => {
  const userLang = localStorage.getItem('user-language') || 'pl'
  if (config.headers && !config.headers['Accept-Language']) {
    config.headers['Accept-Language'] = userLang
  }
  return config
})

// Interceptor to handle common error formats
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data
      
      // Handle Problem Details (400 Bad Request with validation errors)
      if (error.response.status === 400 && data.errors) {
        console.error('Validation Error:', data.errors)
      }
      
      // Handle Business Rule Violations (400 Bad Request with message)
      if (error.response.status === 400 && data.message) {
        console.error('Business Rule Violation:', data.message)
      }
      
      // Handle Unauthorized
      if (error.response.status === 401) {
        // Redirect to login or refresh token
      }
    }
    return Promise.reject(error)
  }
)

export default client
