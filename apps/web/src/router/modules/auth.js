import AuthLayout from '@/layouts/AuthLayout.vue'
import LayoutPreview from '@/views/LayoutPreview.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import LoginView from '@/views/public/auth/LoginView.vue'
import RegisterView from '@/views/public/auth/RegisterView.vue'

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
        meta: { title: '登录', guestOnly: true },
      },
      {
        path: 'register',
        name: ROUTE_NAMES.REGISTER,
        component: RegisterView,
        meta: { title: '注册', guestOnly: true },
      },
      {
        path: 'forgot-password',
        name: ROUTE_NAMES.FORGOT_PASSWORD,
        component: PlaceholderView,
        meta: { title: '忘记密码', guestOnly: true },
      },
      {
        path: 'reset-password',
        name: ROUTE_NAMES.RESET_PASSWORD,
        component: PlaceholderView,
        meta: { title: '重置密码', guestOnly: true },
      },
      {
        path: 'layout-preview/auth',
        name: ROUTE_NAMES.AUTH_LAYOUT_PREVIEW,
        component: LayoutPreview,
        meta: { title: 'Auth Layout', layoutPreview: 'AuthLayout' },
      },
    ],
  },
]
