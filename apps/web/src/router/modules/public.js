import PublicLayout from '@/layouts/PublicLayout.vue'

const HomeView = () => import('@/views/public/HomeView.vue')
const ComponentPreview = () => import('@/views/ComponentPreview.vue')
const LayoutPreview = () => import('@/views/LayoutPreview.vue')
const PlaceholderView = () => import('@/views/PlaceholderView.vue')
const BookDetailView = () => import('@/views/public/books/BookDetailView.vue')
const BooksView = () => import('@/views/public/books/BooksView.vue')
const CoffeeView = () => import('@/views/public/coffee/CoffeeView.vue')
const ProductDetailView = () => import('@/views/public/coffee/ProductDetailView.vue')
const CartView = () => import('@/views/public/cart/CartView.vue')
const CheckoutView = () => import('@/views/public/checkout/CheckoutView.vue')
const BookingView = () => import('@/views/public/booking/BookingView.vue')
const CommunityView = () => import('@/views/public/community/CommunityView.vue')
const CreatePostView = () => import('@/views/public/community/CreatePostView.vue')
const PostDetailView = () => import('@/views/public/community/PostDetailView.vue')
const EventDetailView = () => import('@/views/public/events/EventDetailView.vue')
const EventsView = () => import('@/views/public/events/EventsView.vue')
const PublicUserProfileView = () => import('@/views/public/users/PublicUserProfileView.vue')
const AboutView = () => import('@/views/public/info/AboutView.vue')
const ContactView = () => import('@/views/public/info/ContactView.vue')
const HelpView = () => import('@/views/public/info/HelpView.vue')
const PrivacyView = () => import('@/views/public/info/PrivacyView.vue')
const TermsView = () => import('@/views/public/info/TermsView.vue')

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
        path: 'users/:id',
        component: PublicUserProfileView,
        meta: { title: '用户主页' },
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
        component: TermsView,
        meta: { title: '服务条款' },
      },
      {
        path: 'privacy',
        name: ROUTE_NAMES.PRIVACY,
        component: PrivacyView,
        meta: { title: '隐私政策' },
      },
      {
        path: 'about',
        name: ROUTE_NAMES.ABOUT,
        component: AboutView,
        meta: { title: '关于我们' },
      },
      {
        path: 'contact',
        name: ROUTE_NAMES.CONTACT,
        component: ContactView,
        meta: { title: '联系我们' },
      },
      {
        path: 'help',
        name: ROUTE_NAMES.HELP,
        component: HelpView,
        meta: { title: '帮助中心' },
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
