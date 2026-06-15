import AdminLayout from '@/layouts/AdminLayout.vue'
import AdminBookingsView from '@/views/admin/AdminBookingsView.vue'
import AdminBooksView from '@/views/admin/AdminBooksView.vue'
import AdminCommunityView from '@/views/admin/AdminCommunityView.vue'
import AdminEventsView from '@/views/admin/AdminEventsView.vue'
import AdminOrdersView from '@/views/admin/AdminOrdersView.vue'
import AdminProductsView from '@/views/admin/AdminProductsView.vue'
import DashboardView from '@/views/admin/DashboardView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

import { ROUTE_NAMES } from '../route-names'

const adminMeta = { requiresAuth: true }

export const adminRoutes = [
  { path: '/403', component: PlaceholderView, meta: { title: '无权访问' } },
  {
    path: '/',
    component: AdminLayout,
    meta: adminMeta,
    children: [
      { path: '', name: ROUTE_NAMES.ADMIN, redirect: '/dashboard' },
      { path: 'dashboard', name: ROUTE_NAMES.ADMIN_DASHBOARD, component: DashboardView, meta: { ...adminMeta, title: '仪表盘' } },
      { path: 'books', name: ROUTE_NAMES.ADMIN_BOOKS, component: AdminBooksView, meta: { ...adminMeta, title: '图书管理' } },
      { path: 'products', name: ROUTE_NAMES.ADMIN_PRODUCTS, component: AdminProductsView, meta: { ...adminMeta, title: '商品管理' } },
      { path: 'orders', name: ROUTE_NAMES.ADMIN_ORDERS, component: AdminOrdersView, meta: { ...adminMeta, title: '订单管理' } },
      { path: 'events', name: ROUTE_NAMES.ADMIN_EVENTS, component: AdminEventsView, meta: { ...adminMeta, title: '活动管理' } },
      { path: 'community', name: ROUTE_NAMES.ADMIN_COMMUNITY, component: AdminCommunityView, meta: { ...adminMeta, title: '社区审核' } },
      { path: 'bookings', name: ROUTE_NAMES.ADMIN_BOOKINGS, component: AdminBookingsView, meta: { ...adminMeta, title: '预约管理' } },
      { path: '404', name: ROUTE_NAMES.NOT_FOUND, component: PlaceholderView, meta: { ...adminMeta, title: '页面不存在' } },
      { path: ':pathMatch(.*)*', component: PlaceholderView, meta: { ...adminMeta, title: '页面不存在' } },
    ],
  },
]
