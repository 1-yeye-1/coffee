import AuthLayout from '@/layouts/AuthLayout.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import LoginView from '@/views/admin/LoginView.vue'

import { ROUTE_NAMES } from '../route-names'

export const authRoutes = [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: ROUTE_NAMES.LOGIN,
        component: LoginView,
        meta: { title: 'Login', guestOnly: true },
      },
      {
        path: 'forgot-password',
        name: ROUTE_NAMES.FORGOT_PASSWORD,
        component: PlaceholderView,
        meta: { title: 'Forgot Password', guestOnly: true },
      },
      {
        path: 'reset-password',
        name: ROUTE_NAMES.RESET_PASSWORD,
        component: PlaceholderView,
        meta: { title: 'Reset Password', guestOnly: true },
      },
    ],
  },
]
