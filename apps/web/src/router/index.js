import { createRouter, createWebHistory } from 'vue-router'

import { registerRouterGuards } from './guards'
import { authRoutes } from './modules/auth'
import { memberRoutes } from './modules/member'
import { publicRoutes } from './modules/public'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...publicRoutes, ...authRoutes, ...memberRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

registerRouterGuards(router)

export default router
