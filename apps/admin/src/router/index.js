import { createRouter, createWebHistory } from 'vue-router'

import { registerRouterGuards } from './guards'
import { adminRoutes } from './modules/admin'
import { authRoutes } from './modules/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...authRoutes, ...adminRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

registerRouterGuards(router)

export default router
