import { useAuthStore } from '@/stores/auth'

import { applyRouteSeo } from '../../../shared/seo.js'

export function registerRouterGuards(router) {
  router.beforeEach(async (to) => {
    applyRouteSeo(to, {
      siteName: 'Coffee Book',
      description: 'Coffee Book 咖啡书屋，提供精品咖啡、图书阅读、文化活动、社区分享与空间预约服务。',
      keywords: 'Coffee Book,咖啡书屋,精品咖啡,图书阅读,文化活动,社区,空间预约',
    })

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
