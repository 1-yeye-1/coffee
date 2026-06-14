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

const adminMeta = {
  requiresAuth: true,
  roles: ['admin'],
}

export const adminRoutes = [
  {
    path: '/403',
    component: PlaceholderView,
    meta: { title: 'Forbidden' },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: adminMeta,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.ADMIN,
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: ROUTE_NAMES.ADMIN_DASHBOARD,
        component: DashboardView,
        meta: { ...adminMeta, title: 'Dashboard' },
      },
      { path: 'books', name: ROUTE_NAMES.ADMIN_BOOKS, component: AdminBooksView, meta: { ...adminMeta, title: 'Books' } },
      { path: 'products', name: ROUTE_NAMES.ADMIN_PRODUCTS, component: AdminProductsView, meta: { ...adminMeta, title: 'Products' } },
      { path: 'orders', name: ROUTE_NAMES.ADMIN_ORDERS, component: AdminOrdersView, meta: { ...adminMeta, title: 'Orders' } },
      { path: 'events', name: ROUTE_NAMES.ADMIN_EVENTS, component: AdminEventsView, meta: { ...adminMeta, title: 'Events' } },
      { path: 'community', name: ROUTE_NAMES.ADMIN_COMMUNITY, component: AdminCommunityView, meta: { ...adminMeta, title: 'Community Review' } },
      { path: 'bookings', name: ROUTE_NAMES.ADMIN_BOOKINGS, component: AdminBookingsView, meta: { ...adminMeta, title: 'Bookings' } },
      {
        path: '404',
        name: ROUTE_NAMES.NOT_FOUND,
        component: PlaceholderView,
        meta: { ...adminMeta, title: 'Not Found' },
      },
      {
        path: ':pathMatch(.*)*',
        component: PlaceholderView,
        meta: { ...adminMeta, title: 'Not Found' },
      },
    ],
  },
]
