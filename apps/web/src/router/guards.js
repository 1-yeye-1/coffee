import { useAuthStore } from '@/stores/auth'

export function registerRouterGuards(router) {
  router.beforeEach(async (to) => {
    const siteName = 'Coffee Book'
    document.title = to.meta.title ? `${to.meta.title} | ${siteName}` : siteName

    const authStore = useAuthStore()
    await authStore.restoreSession()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.meta.roles?.length && !to.meta.roles.includes(authStore.user?.role)) {
      return '/403'
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return '/'
    }

    return true
  })
}
