import { useAuthStore } from '@/stores/auth'

import { applyRouteSeo } from '../../../shared/seo.js'

export function registerRouterGuards(router) {
  router.beforeEach(async (to) => {
    applyRouteSeo(to, {
      siteName: 'Coffee Book Admin',
      description: 'Coffee Book 后台运营管理系统。',
      keywords: 'Coffee Book,后台管理,运营管理',
    })

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
