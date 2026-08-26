import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guest: true }
    },
    {
      path: '/confirm-email',
      name: 'confirm-email',
      component: () => import('../views/ConfirmEmailView.vue'),
    },
    {
      path: '/resend-confirmation-email',
      name: 'resend-confirmation',
      component: () => import('../views/ResendConfirmationEmailView.vue'),
      meta: { guest: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { guest: true }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: { guest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { auth: true }
    },
    {
      path: '/dashboard/lists/:listId',
      name: 'list-manage',
      component: () => import('../views/ListManageView.vue'),
    },
    {
      path: '/lists/:listId',
      name: 'list-public',
      component: () => import('../views/ListPublicView.vue'),
    },
  ],
})

router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()
  
  if (authStore.isLoading) {
    await authStore.fetchUser()
  }

  if (to.meta.auth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  } else if (to.meta.guest && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  } else {
    return
  }
})

export default router
