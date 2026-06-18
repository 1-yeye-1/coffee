<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseTable, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const router = useRouter()
const adminStore = useAdminStore()
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
const columns = [
  { key: 'orderNo', label: '订单号' }, { key: 'userName', label: '用户' },
  { key: 'amountText', label: '金额' }, { key: 'status', label: '状态' }, { key: 'createdText', label: '时间' },
]
const quickActions = [
  ['图书管理', '/books'], ['商品管理', '/products'], ['订单管理', '/orders'],
  ['活动管理', '/events'], ['社区管理', '/community'], ['预约管理', '/bookings'], ['操作日志', '/logs'],
]

onMounted(() => adminStore.fetchDashboard())
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Overview</span><h1>运营仪表盘</h1><p>所有业务指标均由数据库实时聚合。</p></div><BaseBadge variant="success">API 数据</BaseBadge></header>
    <p v-if="adminStore.apiError" class="form-error" role="status">{{ adminStore.apiError }}</p>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] ?? 0 }}</strong><small>{{ item[2] }}</small></div></section>
    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天订单</h2><BaseBadge variant="info">Orders</BaseBadge></div><div v-if="orderTrend.some(item => item.value)" class="admin-bars"><div v-for="item in orderTrend" :key="item.date" class="admin-bar"><span :style="{ height: `${item.value / maxValue(orderTrend) * 100}%` }" /><small>{{ item.date.slice(5) }}</small></div></div><EmptyState v-else title="暂无订单趋势数据" /></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天新增用户</h2><BaseBadge variant="premium">Users</BaseBadge></div><div v-if="userTrend.some(item => item.value)" class="admin-bars"><div v-for="item in userTrend" :key="item.date" class="admin-bar"><span :style="{ height: `${item.value / maxValue(userTrend) * 100}%` }" /><small>{{ item.date.slice(5) }}</small></div></div><EmptyState v-else title="暂无用户趋势数据" /></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>快捷操作</h2></div><div class="admin-quick-grid"><button v-for="item in quickActions" :key="item[1]" class="admin-quick-action" type="button" @click="router.push(item[1])"><strong>{{ item[0] }}</strong></button></div></section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>最近订单</h2><BaseButton size="sm" variant="ghost" @click="router.push('/orders')">查看全部</BaseButton></div><BaseTable :columns="columns" :items="recentOrders" empty-text="暂无订单" /></section>
  </div>
</template>
