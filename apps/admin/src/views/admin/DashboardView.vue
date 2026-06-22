<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, BaseTable, EmptyState } from '@/components/base'
import DashboardFeed from '@/components/dashboard/DashboardFeed.vue'
import { useAdminStore } from '@/stores/admin'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useDashboardMotion } from '@/composables/useDashboardMotion'
import '@/assets/styles/pages/admin-management.css'

const router = useRouter()
const adminStore = useAdminStore()
const pageRef = ref(null)
const dashboardReady = ref(false)
const { animateDashboardStats, animateDashboardFeeds, animateProgressBars, pulseDashboardBadge } = useDashboardMotion(pageRef)
const { wiggleIcon } = useAnimeMotion()
const summary = computed(() => adminStore.dashboardStats)
const trends = computed(() => adminStore.dashboardTrends || {})
const recent = computed(() => adminStore.dashboardRecent || {})
const stats = computed(() => [
  ['用户总数', summary.value.users, `今日新增 ${summary.value.todayUsers || 0}`],
  ['商品总数', summary.value.products, '数据库商品'],
  ['图书总数', summary.value.books, '数据库馆藏'],
  ['活动总数', summary.value.events, '数据库活动'],
  ['预约总数', summary.value.bookings, `今日 ${summary.value.todayBookings || 0}`],
  ['社区帖子', summary.value.posts, `待审核 ${summary.value.pendingPosts || 0}`],
  ['订单总数', summary.value.orders, '数据库订单'],
  ['累计销售额', `¥${summary.value.sales || 0}`, '已支付及已完成'],
])
const orderTrend = computed(() => trends.value.orders || [])
const userTrend = computed(() => trends.value.users || [])
const maxValue = (items) => Math.max(1, ...items.map((item) => item.value))
const recentOrders = computed(() => (recent.value.orders || []).map((item) => ({
  ...item, amountText: `¥${item.amount}`, createdText: new Date(item.createdAt).toLocaleString('zh-CN'),
})))
const recentBookings = computed(() => recent.value.bookings || [])
const recentPosts = computed(() => recent.value.posts || [])
const columns = [
  { key: 'orderNo', label: '订单号' }, { key: 'userName', label: '用户' },
  { key: 'amountText', label: '金额' }, { key: 'status', label: '状态' }, { key: 'createdText', label: '时间' },
]
const quickActions = [
  ['图书管理', '/books'], ['商品管理', '/products'], ['订单管理', '/orders'],
  ['活动管理', '/events'], ['社区管理', '/community'], ['预约管理', '/bookings'], ['操作日志', '/logs'],
]

onMounted(async () => {
  try {
    await adminStore.fetchDashboard()
  } finally {
    dashboardReady.value = true
  }
  await nextTick()
  animateDashboardStats('.admin-stat', stats.value.map((item) => item[1]))
  animateDashboardFeeds()
  animateProgressBars()
  pulseDashboardBadge(pageRef.value?.querySelectorAll('.admin-page__header .base-badge, .dashboard-feed .base-badge'))
})
</script>

<template>
  <div ref="pageRef" class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Overview</span><h1>运营仪表盘</h1><p>所有业务指标均由数据库实时聚合。</p></div><BaseBadge variant="success">API 数据</BaseBadge></header>
    <p v-if="adminStore.apiError" class="form-error" role="status">{{ adminStore.apiError }}</p>
    <Transition name="dashboard-swap" mode="out-in">
      <section v-if="!dashboardReady || adminStore.apiLoading" class="admin-stat-grid dashboard-skeleton-grid" aria-label="统计数据加载中"><BaseSkeleton v-for="index in 8" :key="index" variant="card" /></section>
      <section v-else class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] ?? 0 }}</strong><small>{{ item[2] }}</small></div></section>
    </Transition>
    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天订单</h2><BaseBadge variant="info">Orders</BaseBadge></div><div v-if="orderTrend.some(item => item.value)" class="admin-bars"><div v-for="item in orderTrend" :key="item.date" class="admin-bar"><span :style="{ height: `${item.value / maxValue(orderTrend) * 100}%` }" /><small>{{ item.date.slice(5) }}</small></div></div><EmptyState v-else title="暂无订单趋势数据" /></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天新增用户</h2><BaseBadge variant="premium">Users</BaseBadge></div><div v-if="userTrend.some(item => item.value)" class="admin-bars"><div v-for="item in userTrend" :key="item.date" class="admin-bar"><span :style="{ height: `${item.value / maxValue(userTrend) * 100}%` }" /><small>{{ item.date.slice(5) }}</small></div></div><EmptyState v-else title="暂无用户趋势数据" /></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>快捷操作</h2></div><div class="admin-quick-grid"><button v-for="item in quickActions" :key="item[1]" class="admin-quick-action" type="button" data-motion="magnetic" data-cursor="ACTION" @pointerenter="wiggleIcon($event.currentTarget)" @click="router.push(item[1])"><strong>{{ item[0] }}</strong></button></div></section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>最近订单</h2><BaseButton size="sm" variant="ghost" @click="router.push('/orders')">查看全部</BaseButton></div><BaseTable :columns="columns" :items="recentOrders" :loading="adminStore.apiLoading" empty-text="暂无订单" /></section>
    <section class="dashboard-recent-grid">
      <DashboardFeed title="最近预约" :items="recentBookings" empty-title="暂无最近预约" @view-all="router.push('/bookings')" @open="router.push('/bookings')"><template #default="{ item }"><span><strong>{{ item.userName || item.contactName }}</strong><small>{{ item.date }} · {{ item.timeSlot || item.time }}</small></span><BaseBadge :variant="item.status === 'confirmed' ? 'success' : 'neutral'">{{ item.status }}</BaseBadge></template></DashboardFeed>
      <DashboardFeed title="最近社区动态" :items="recentPosts" empty-title="暂无社区动态" @view-all="router.push('/community')" @open="router.push('/community')"><template #default="{ item }"><span><strong>{{ item.title }}</strong><small>{{ item.author }} · {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</small></span><BaseBadge :variant="item.status === 'published' ? 'success' : 'warning'">{{ item.status }}</BaseBadge></template></DashboardFeed>
    </section>
  </div>
</template>
