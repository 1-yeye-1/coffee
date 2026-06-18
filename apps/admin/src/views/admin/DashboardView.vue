<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseTable } from '@/components/base'
import { orderTrend, revenueTrend } from '@/data/admin'
import { useAdminStore } from '@/stores/admin'
import { useBookingStore } from '@/stores/booking'
import { useEventsStore } from '@/stores/events'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/admin-management.css'

const router = useRouter()
const adminStore = useAdminStore()
const orderStore = useOrderStore()
const bookingStore = useBookingStore()
const eventsStore = useEventsStore()
const maxRevenue = Math.max(...revenueTrend)
const maxOrders = Math.max(...orderTrend)
const totalRevenue = computed(() => orderStore.orders.filter((item) => ['paid', 'completed'].includes(item.status)).reduce((sum, item) => sum + item.amounts.total, 0))
const stats = computed(() => [
  { label: '用户数', value: adminStore.dashboardStats.users, hint: '数据库用户', icon: 'U' },
  { label: '图书数', value: adminStore.dashboardStats.books, hint: '数据库馆藏', icon: 'B' },
  { label: '商品数', value: adminStore.dashboardStats.products, hint: '数据库商品', icon: 'P' },
  { label: '订单数', value: adminStore.dashboardStats.orders ?? orderStore.orders.length, hint: '本阶段基础统计', icon: 'O' },
  { label: '今日营收', value: `¥${adminStore.dashboardStats.todayRevenue ?? totalRevenue.value}`, hint: '本阶段基础统计', icon: '¥' },
  { label: '待审核帖子', value: adminStore.dashboardStats.pendingPosts, hint: '等待处理', icon: 'Q' },
])
const quickActions = [
  { label: '图书管理', path: '/books', note: '维护馆藏' },
  { label: '商品管理', path: '/products', note: '更新商城' },
  { label: '订单管理', path: '/orders', note: '审核与履约' },
  { label: '活动管理', path: '/events', note: '创建活动' },
  { label: '社区管理', path: '/community', note: '内容审核' },
  { label: '预约管理', path: '/bookings', note: '空间运营' },
  { label: '座位使用', path: '/seats', note: '地图与占用' },
  { label: '上传文件', path: '/uploads', note: '文件管理' },
  { label: '操作日志', path: '/logs', note: '审计记录' },
]
const recentColumns = [
  { key: 'id', label: '订单号' }, { key: 'user', label: '用户' }, { key: 'amount', label: '金额' },
  { key: 'status', label: '状态' }, { key: 'time', label: '时间' },
]
const recentOrders = computed(() => orderStore.orders.slice(0, 5).map((item) => ({
  id: item.id, user: item.address?.recipient || 'Coffee Reader', amount: `¥${item.amounts.total}`, status: item.status, time: new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
})))
const statusText = { pending_payment: '待支付', pending_review: '待确认', paid: '已支付', completed: '已完成', cancelled: '已取消', payment_expired: '支付过期' }

onMounted(async () => {
  await Promise.all([
    adminStore.fetchDashboard(),
    adminStore.fetchAdminCollection('books'),
    adminStore.fetchAdminCollection('products'),
  ])
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Overview</span><h1>运营仪表盘</h1><p>查看 Coffee Book 今日运营情况与关键业务指标。</p></div><BaseBadge variant="success">系统运行正常</BaseBadge></header>
    <p v-if="adminStore.apiError" class="text-muted" role="status">后台 API 暂不可用，当前展示本地统计。</p>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item.label" class="admin-stat"><div class="admin-stat__top"><span>{{ item.label }}</span><span class="admin-stat__icon">{{ item.icon }}</span></div><strong>{{ item.value }}</strong><small>{{ item.hint }}</small></div></section>
    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>近 7 日订单趋势</h2><BaseBadge variant="info">订单</BaseBadge></div><div class="admin-bars"><div v-for="(value, index) in orderTrend" :key="value + index" class="admin-bar"><span :style="{ height: `${value / maxOrders * 100}%` }" /><small>{{ index + 1 }}日</small></div></div></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>近 7 日营收趋势</h2><BaseBadge variant="premium">Revenue</BaseBadge></div><div class="admin-bars"><div v-for="(value, index) in revenueTrend" :key="value + index" class="admin-bar"><span :style="{ height: `${value / maxRevenue * 100}%` }" /><small>{{ index + 1 }}日</small></div></div></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>快捷操作</h2></div><div class="admin-quick-grid"><button v-for="item in quickActions" :key="item.path" class="admin-quick-action" type="button" @click="router.push(item.path)"><strong>{{ item.label }}</strong><small>{{ item.note }}</small></button></div></section>
    <section class="admin-ranking-grid">
      <div class="admin-panel"><h2>热门图书</h2><div class="admin-ranking"><div v-for="book in adminStore.books.slice(0, 3)" :key="book.id" class="admin-ranking__item"><span>{{ book.title }}</span><strong>★ {{ book.rating }}</strong></div></div></div>
      <div class="admin-panel"><h2>热门商品</h2><div class="admin-ranking"><div v-for="product in [...adminStore.products].sort((a,b)=>b.sales-a.sales).slice(0,3)" :key="product.id" class="admin-ranking__item"><span>{{ product.name }}</span><strong>{{ product.sales }}</strong></div></div></div>
      <div class="admin-panel"><h2>热门活动</h2><div class="admin-ranking"><div v-for="event in [...adminStore.events].sort((a,b)=>b.attendees-a.attendees).slice(0,3)" :key="event.id" class="admin-ranking__item"><span>{{ event.title }}</span><strong>{{ event.attendees }} 人</strong></div></div></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>最近订单</h2><BaseButton size="sm" variant="ghost" @click="router.push('/orders')">查看全部</BaseButton></div><BaseTable :columns="recentColumns" :items="recentOrders" empty-text="暂无本地订单"><template #cell-status="{ value }"><BaseBadge :variant="value === 'completed' ? 'success' : value === 'paid' ? 'info' : value === 'cancelled' ? 'neutral' : 'warning'">{{ statusText[value] }}</BaseBadge></template></BaseTable></section>
  </div>
</template>
