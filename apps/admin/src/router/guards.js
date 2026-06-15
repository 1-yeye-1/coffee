import { useAuthStore } from '@/stores/auth'

export function registerRouterGuards(router) {
  router.beforeEach(async (to) => {
    const siteName = 'Coffee Book Admin'
    document.title = to.meta.title ? `${to.meta.title} | ${siteName}` : siteName

    const authStore = useAuthStore()
    await authStore.restoreSession()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return '/dashboard'
    }

    return true
  })
}
