import AuthLayout from '@/layouts/AuthLayout.vue'
import LoginView from '@/views/admin/LoginView.vue'

const PlaceholderView = () => import('@/views/PlaceholderView.vue')

import { ROUTE_NAMES } from '../route-names'

export const authRoutes = [
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.LOGIN,
        component: LoginView,
        meta: { title: '后台登录', guestOnly: true },
      },
    ],
  },
  {
    path: '/forgot-password',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.FORGOT_PASSWORD,
        component: PlaceholderView,
        meta: { title: '忘记密码', guestOnly: true },
      },
    ],
  },
  {
    path: '/reset-password',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.RESET_PASSWORD,
        component: PlaceholderView,
        meta: { title: '重置密码', guestOnly: true },
      },
    ],
  },
]
