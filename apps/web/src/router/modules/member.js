import MemberLayout from '@/layouts/MemberLayout.vue'
import LayoutPreview from '@/views/LayoutPreview.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import OrderDetailView from '@/views/member/orders/OrderDetailView.vue'
import OrdersView from '@/views/member/orders/OrdersView.vue'
import ActivitiesView from '@/views/member/ActivitiesView.vue'
import BookingsView from '@/views/member/BookingsView.vue'
import FavoritesView from '@/views/member/FavoritesView.vue'
import MembershipView from '@/views/member/MembershipView.vue'
import ProfileView from '@/views/member/ProfileView.vue'

import { ROUTE_NAMES } from '../route-names'

const memberMeta = {
  requiresAuth: true,
}

const memberSections = [
  ['security', '安全设置'],
  ['points', '积分记录'],
  ['posts', '我的帖子'],
  ['notifications', '通知中心'],
  ['addresses', '地址管理'],
]

export const memberRoutes = [
  {
    path: '/account',
    component: MemberLayout,
    meta: memberMeta,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.ACCOUNT,
        component: PlaceholderView,
        meta: { ...memberMeta, title: '账户概览' },
      },
      ...memberSections.map(([path, title]) => ({
        path,
        component: PlaceholderView,
        meta: { ...memberMeta, title },
      })),
      {
        path: 'profile',
        name: ROUTE_NAMES.PROFILE,
        component: ProfileView,
        meta: { ...memberMeta, title: '个人资料' },
      },
      {
        path: 'membership',
        name: ROUTE_NAMES.MEMBERSHIP,
        component: MembershipView,
        meta: { ...memberMeta, title: '会员权益' },
      },
      {
        path: 'favorites',
        name: ROUTE_NAMES.FAVORITES,
        component: FavoritesView,
        meta: { ...memberMeta, title: '我的收藏' },
      },
      {
        path: 'bookings',
        name: ROUTE_NAMES.MEMBER_BOOKINGS,
        component: BookingsView,
        meta: { ...memberMeta, title: '我的预约' },
      },
      {
        path: 'activities',
        name: ROUTE_NAMES.ACTIVITIES,
        component: ActivitiesView,
        meta: { ...memberMeta, title: '活动报名记录' },
      },
      {
        path: 'orders',
        name: ROUTE_NAMES.ORDERS,
        component: OrdersView,
        meta: { ...memberMeta, title: '我的订单' },
      },
      {
        path: 'orders/:id',
        name: ROUTE_NAMES.ORDER_DETAIL,
        component: OrderDetailView,
        meta: { ...memberMeta, title: '订单详情' },
      },
      {
        path: 'layout-preview',
        name: ROUTE_NAMES.MEMBER_LAYOUT_PREVIEW,
        component: LayoutPreview,
        meta: { ...memberMeta, title: 'Member Layout', layoutPreview: 'MemberLayout' },
      },
    ],
  },
]
