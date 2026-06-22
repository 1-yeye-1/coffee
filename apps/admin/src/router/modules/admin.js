import AdminLayout from '@/layouts/AdminLayout.vue'
import DashboardView from '@/views/admin/DashboardView.vue'

const AdminBookingsView = () => import('@/views/admin/AdminBookingsView.vue')
const AdminBooksView = () => import('@/views/admin/AdminBooksView.vue')
const AdminCommunityView = () => import('@/views/admin/AdminCommunityView.vue')
const AdminEventsView = () => import('@/views/admin/AdminEventsView.vue')
const AdminOrdersView = () => import('@/views/admin/AdminOrdersView.vue')
const AdminProductsView = () => import('@/views/admin/AdminProductsView.vue')
const AdminLogsView = () => import('@/views/admin/AdminLogsView.vue')
const UploadFilesView = () => import('@/views/admin/UploadFilesView.vue')
const AdminUsersView = () => import('@/views/admin/AdminUsersView.vue')
const AdminSeatsView = () => import('@/views/admin/AdminSeatsView.vue')
const PlaceholderView = () => import('@/views/PlaceholderView.vue')

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
      { path: 'users', component: AdminUsersView, meta: { ...adminMeta, title: '用户管理' } },
      { path: 'events', name: ROUTE_NAMES.ADMIN_EVENTS, component: AdminEventsView, meta: { ...adminMeta, title: '活动管理' } },
      { path: 'community', name: ROUTE_NAMES.ADMIN_COMMUNITY, component: AdminCommunityView, meta: { ...adminMeta, title: '社区审核' } },
      { path: 'bookings', name: ROUTE_NAMES.ADMIN_BOOKINGS, component: AdminBookingsView, meta: { ...adminMeta, title: '预约管理' } },
      { path: 'seats', name: ROUTE_NAMES.ADMIN_SEATS, component: AdminSeatsView, meta: { ...adminMeta, title: '座位使用' } },
      { path: 'uploads', name: ROUTE_NAMES.ADMIN_UPLOAD_FILES, component: UploadFilesView, meta: { ...adminMeta, title: '上传文件' } },
      { path: 'logs', name: ROUTE_NAMES.ADMIN_LOGS, component: AdminLogsView, meta: { ...adminMeta, title: '操作日志' } },
      { path: '404', name: ROUTE_NAMES.NOT_FOUND, component: PlaceholderView, meta: { ...adminMeta, title: '页面不存在' } },
      { path: ':pathMatch(.*)*', component: PlaceholderView, meta: { ...adminMeta, title: '页面不存在' } },
    ],
  },
]
