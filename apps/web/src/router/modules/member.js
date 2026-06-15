import MemberLayout from '@/layouts/MemberLayout.vue'
import LayoutPreview from '@/views/LayoutPreview.vue'
import AccountOverviewView from '@/views/member/AccountOverviewView.vue'
import ActivitiesView from '@/views/member/ActivitiesView.vue'
import AddressesView from '@/views/member/AddressesView.vue'
import BookingsView from '@/views/member/BookingsView.vue'
import FavoritesView from '@/views/member/FavoritesView.vue'
import MembershipView from '@/views/member/MembershipView.vue'
import MyPostsView from '@/views/member/MyPostsView.vue'
import NotificationsView from '@/views/member/NotificationsView.vue'
import OrderDetailView from '@/views/member/orders/OrderDetailView.vue'
import OrdersView from '@/views/member/orders/OrdersView.vue'
import PointsView from '@/views/member/PointsView.vue'
import ProfileView from '@/views/member/ProfileView.vue'
import SecurityView from '@/views/member/SecurityView.vue'

import { ROUTE_NAMES } from '../route-names'

const memberMeta = {
  requiresAuth: true,
}

export const memberRoutes = [
  {
    path: '/account',
    component: MemberLayout,
    meta: memberMeta,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.ACCOUNT,
        component: AccountOverviewView,
        meta: { ...memberMeta, title: '账户概览' },
      },
      {
        path: 'profile',
        name: ROUTE_NAMES.PROFILE,
        component: ProfileView,
        meta: { ...memberMeta, title: '个人资料' },
      },
      {
        path: 'security',
        component: SecurityView,
        meta: { ...memberMeta, title: '安全设置' },
      },
      {
        path: 'membership',
        name: ROUTE_NAMES.MEMBERSHIP,
        component: MembershipView,
        meta: { ...memberMeta, title: '会员权益' },
      },
      {
        path: 'points',
        component: PointsView,
        meta: { ...memberMeta, title: '积分记录' },
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
        path: 'posts',
        component: MyPostsView,
        meta: { ...memberMeta, title: '我的帖子' },
      },
      {
        path: 'notifications',
        component: NotificationsView,
        meta: { ...memberMeta, title: '通知中心' },
      },
      {
        path: 'addresses',
        component: AddressesView,
        meta: { ...memberMeta, title: '地址管理' },
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
        meta: { ...memberMeta, title: '会员中心布局预览', layoutPreview: 'MemberLayout' },
      },
    ],
  },
]
