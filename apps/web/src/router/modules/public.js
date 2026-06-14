import PublicLayout from '@/layouts/PublicLayout.vue'
import ComponentPreview from '@/views/ComponentPreview.vue'
import LayoutPreview from '@/views/LayoutPreview.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import HomeView from '@/views/public/HomeView.vue'
import BookDetailView from '@/views/public/books/BookDetailView.vue'
import BooksView from '@/views/public/books/BooksView.vue'
import CoffeeView from '@/views/public/coffee/CoffeeView.vue'
import ProductDetailView from '@/views/public/coffee/ProductDetailView.vue'
import CartView from '@/views/public/cart/CartView.vue'
import CheckoutView from '@/views/public/checkout/CheckoutView.vue'
import BookingView from '@/views/public/booking/BookingView.vue'
import CommunityView from '@/views/public/community/CommunityView.vue'
import CreatePostView from '@/views/public/community/CreatePostView.vue'
import PostDetailView from '@/views/public/community/PostDetailView.vue'
import EventDetailView from '@/views/public/events/EventDetailView.vue'
import EventsView from '@/views/public/events/EventsView.vue'

import { ROUTE_NAMES } from '../route-names'

export const publicRoutes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.HOME,
        component: HomeView,
        meta: { title: '首页' },
      },
      {
        path: 'coffee',
        name: ROUTE_NAMES.COFFEE,
        component: CoffeeView,
        meta: { title: '咖啡商城' },
      },
      {
        path: 'coffee/:slug',
        name: ROUTE_NAMES.COFFEE_DETAIL,
        component: ProductDetailView,
        meta: { title: '商品详情' },
      },
      {
        path: 'books',
        name: ROUTE_NAMES.BOOKS,
        component: BooksView,
        meta: { title: '图书中心' },
      },
      {
        path: 'books/:slug',
        name: ROUTE_NAMES.BOOK_DETAIL,
        component: BookDetailView,
        meta: { title: '图书详情' },
      },
      {
        path: 'events',
        name: ROUTE_NAMES.EVENTS,
        component: EventsView,
        meta: { title: '活动中心' },
      },
      {
        path: 'events/:slug',
        name: ROUTE_NAMES.EVENT_DETAIL,
        component: EventDetailView,
        meta: { title: '活动详情' },
      },
      {
        path: 'community',
        name: ROUTE_NAMES.COMMUNITY,
        component: CommunityView,
        meta: { title: '社区' },
      },
      {
        path: 'community/create',
        name: ROUTE_NAMES.COMMUNITY_CREATE,
        component: CreatePostView,
        meta: { title: '发布帖子' },
      },
      {
        path: 'community/posts/:id',
        component: PostDetailView,
        meta: { title: '帖子详情' },
      },
      {
        path: 'community/:slug',
        name: ROUTE_NAMES.COMMUNITY_POST,
        component: PostDetailView,
        meta: { title: '帖子详情' },
      },
      {
        path: 'booking',
        name: ROUTE_NAMES.BOOKING,
        component: BookingView,
        meta: { title: '空间预约' },
      },
      {
        path: 'cart',
        name: ROUTE_NAMES.CART,
        component: CartView,
        meta: { title: '购物车' },
      },
      {
        path: 'checkout',
        name: ROUTE_NAMES.CHECKOUT,
        component: CheckoutView,
        meta: { title: '确认订单' },
      },
      {
        path: 'search',
        name: ROUTE_NAMES.SEARCH,
        component: PlaceholderView,
        meta: { title: '全站搜索' },
      },
      {
        path: 'terms',
        name: ROUTE_NAMES.TERMS,
        component: PlaceholderView,
        meta: { title: '服务条款' },
      },
      {
        path: 'privacy',
        name: ROUTE_NAMES.PRIVACY,
        component: PlaceholderView,
        meta: { title: '隐私政策' },
      },
      {
        path: 'components',
        name: ROUTE_NAMES.COMPONENT_PREVIEW,
        component: ComponentPreview,
        meta: { title: 'Component Library' },
      },
      {
        path: 'layout-preview',
        name: ROUTE_NAMES.LAYOUT_PREVIEW,
        component: LayoutPreview,
        meta: { title: '布局系统', layoutPreview: 'PublicLayout' },
      },
      {
        path: '403',
        component: PlaceholderView,
        meta: { title: '无权访问' },
      },
      {
        path: '404',
        name: ROUTE_NAMES.NOT_FOUND,
        component: PlaceholderView,
        meta: { title: '页面未找到' },
      },
      {
        path: ':pathMatch(.*)*',
        component: PlaceholderView,
        meta: { title: '页面未找到' },
      },
    ],
  },
]
