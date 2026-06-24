<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, BaseTable } from '@/components/base'
import DashboardFeed from '@/components/dashboard/DashboardFeed.vue'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useDashboardMotion } from '@/composables/useDashboardMotion'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const router = useRouter()
const adminStore = useAdminStore()
const pageRef = ref(null)
const dashboardReady = ref(false)
const { animateDashboardStats, animateDashboardFeeds, animateProgressBars, pulseDashboardBadge } = useDashboardMotion(pageRef)
const { wiggleIcon } = useAnimeMotion()
const summary = computed(() => adminStore.dashboardStats || {})
const trends = computed(() => adminStore.dashboardTrends || {})
const recent = computed(() => adminStore.dashboardRecent || {})

const stats = computed(() => [
  ['今日订单', summary.value.todayOrders || 0, '数据库今日订单'],
  ['今日收入', `¥${summary.value.todayRevenue || summary.value.todaySales || 0}`, '已支付与已完成'],
  ['今日预约', summary.value.todayBookings || 0, '今日预约数'],
  ['今日新增用户', summary.value.todayUsers || 0, '新注册用户'],
  ['待处理订单', summary.value.pendingOrders || summary.value.pendingReviewOrders || 0, '待确认 / 退款'],
  ['待审核社区', summary.value.pendingPosts || 0, '社区审核队列'],
  ['低库存商品', summary.value.lowStockProducts || 0, '商品库存预警'],
  ['活动报名提醒', summary.value.eventSignupReminders || summary.value.todayEventRegistrations || 0, '报名或满员提醒'],
])

const overviewStats = computed(() => [
  ['用户总数', summary.value.users || 0, '全部用户'],
  ['商品总数', summary.value.products || 0, '数据库商品'],
  ['图书总数', summary.value.books || 0, '数据库馆藏'],
  ['订单总数', summary.value.orders || 0, '数据库订单'],
])

const orderTrend = computed(() => trends.value.orders || [])
const userTrend = computed(() => trends.value.users || [])
const maxValue = (items) => Math.max(1, ...items.map((item) => Number(item.value || 0)))
const barHeight = (item, items) => `${Math.max(8, (Number(item.value || 0) / maxValue(items)) * 100)}%`
const recentOrders = computed(() => (recent.value.orders || []).map((item) => ({ ...item, amountText: `¥${item.amount}`, createdText: new Date(item.createdAt).toLocaleString('zh-CN') })))
const recentBookings = computed(() => recent.value.bookings || [])
const recentPosts = computed(() => recent.value.posts || [])
const columns = [
  { key: 'orderNo', label: '订单号' },
  { key: 'userName', label: '用户' },
  { key: 'amountText', label: '金额' },
  { key: 'status', label: '状态' },
  { key: 'createdText', label: '时间' },
]
const quickActions = [
  ['订单管理', '/orders'],
  ['商品管理', '/products'],
  ['图书管理', '/books'],
  ['活动管理', '/events'],
  ['社区审核', '/community'],
  ['用户管理', '/users'],
  ['预约管理', '/bookings'],
  ['操作日志', '/logs'],
  ['上传文件', '/uploads'],
]

async function loadDashboard() {
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
}

function refreshOnFocus() {
  if (!document.hidden) loadDashboard()
}

onMounted(async () => {
  await loadDashboard()
  window.addEventListener('focus', refreshOnFocus)
})

onBeforeUnmount(() => window.removeEventListener('focus', refreshOnFocus))
</script>

<template>
  <div ref="pageRef" class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Overview</span>
        <h1>运营仪表盘</h1>
        <p>核心业务指标由数据库实时聚合，便于快速进入待处理事项。</p>
      </div>
      <div class="cb-cluster">
        <BaseBadge variant="success">API 数据</BaseBadge>
        <BaseButton size="sm" variant="outline" :loading="adminStore.apiLoading" @click="loadDashboard">刷新数据</BaseButton>
      </div>
    </header>

    <p v-if="adminStore.apiError" class="form-error" role="status">{{ adminStore.apiError }}</p>

    <Transition name="dashboard-swap" mode="out-in">
      <section v-if="!dashboardReady || adminStore.apiLoading" class="admin-stat-grid dashboard-skeleton-grid" aria-label="统计数据加载中">
        <BaseSkeleton v-for="index in 8" :key="index" variant="card" />
      </section>
      <section v-else class="admin-stat-grid">
        <div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong><small>{{ item[2] }}</small></div>
      </section>
    </Transition>

    <section class="admin-stat-grid dashboard-overview">
      <div v-for="item in overviewStats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong><small>{{ item[2] }}</small></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header"><h2>快捷入口</h2></div>
      <div class="admin-quick-grid">
        <button v-for="item in quickActions" :key="item[1]" class="admin-quick-action" type="button" data-motion="magnetic" data-cursor="操作" @pointerenter="wiggleIcon($event.currentTarget)" @click="router.push(item[1])">
          <strong>{{ item[0] }}</strong>
        </button>
      </div>
    </section>

    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天订单</h2><BaseBadge variant="info">DB Orders</BaseBadge></div><div class="admin-bars"><div v-for="item in orderTrend" :key="item.date" class="admin-bar"><em>{{ item.value || 0 }}</em><span :style="{ height: barHeight(item, orderTrend) }" /><small>{{ item.date.slice(5) }}</small></div></div></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天新增用户</h2><BaseBadge variant="premium">DB Users</BaseBadge></div><div class="admin-bars"><div v-for="item in userTrend" :key="item.date" class="admin-bar"><em>{{ item.value || 0 }}</em><span :style="{ height: barHeight(item, userTrend) }" /><small>{{ item.date.slice(5) }}</small></div></div></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header"><h2>最近订单</h2><BaseButton size="sm" variant="ghost" @click="router.push('/orders')">查看全部</BaseButton></div>
      <BaseTable :columns="columns" :items="recentOrders" :loading="adminStore.apiLoading" empty-text="暂无订单" />
    </section>

    <section class="dashboard-recent-grid">
      <DashboardFeed title="最近预约" :items="recentBookings" empty-title="暂无最近预约" @view-all="router.push('/bookings')" @open="router.push('/bookings')">
        <template #default="{ item }"><span><strong>{{ item.userName || item.contactName }}</strong><small>{{ item.date }} · {{ item.timeSlot || item.time }}</small></span><BaseBadge :variant="item.status === 'confirmed' ? 'success' : 'neutral'">{{ item.status }}</BaseBadge></template>
      </DashboardFeed>
      <DashboardFeed title="最近社区动态" :items="recentPosts" empty-title="暂无社区动态" @view-all="router.push('/community')" @open="router.push('/community')">
        <template #default="{ item }"><span><strong>{{ item.title }}</strong><small>{{ item.author }} · {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</small></span><BaseBadge :variant="item.status === 'published' ? 'success' : 'warning'">{{ item.status }}</BaseBadge></template>
      </DashboardFeed>
    </section>
  </div>
</template>
