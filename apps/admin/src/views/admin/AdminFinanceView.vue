<script setup>
import { computed, onMounted } from 'vue'

import { BaseBadge, BaseTable, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const finance = computed(() => adminStore.financeDashboard || { summary: {}, trends: [], statusDistribution: [], topProducts: [], orders: [] })
const stats = computed(() => [
  ['总销售额', finance.value.summary.totalSales], ['今日销售额', finance.value.summary.todaySales],
  ['待支付金额', finance.value.summary.pendingAmount], ['已退款金额', finance.value.summary.refundedAmount],
])
const maxRevenue = computed(() => Math.max(1, ...finance.value.trends.map((item) => item.value)))
const orders = computed(() => finance.value.orders.map((item) => ({ ...item, amountText: `¥${item.amount}`, createdText: new Date(item.createdAt).toLocaleString('zh-CN') })))
const columns = [
  { key: 'orderNo', label: '订单号' }, { key: 'userName', label: '用户' }, { key: 'amountText', label: '金额' },
  { key: 'method', label: '支付方式' }, { key: 'status', label: '状态' }, { key: 'createdText', label: '时间' },
]

onMounted(() => adminStore.fetchFinanceDashboard())
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Finance</span><h1>财务统计</h1><p>金额与排行由订单和订单项实时聚合。</p></div></header>
    <p v-if="adminStore.apiError" class="form-error">{{ adminStore.apiError }}</p>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>¥{{ item[1] || 0 }}</strong></div></section>
    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>最近 7 天销售趋势</h2><BaseBadge variant="premium">Revenue</BaseBadge></div><div v-if="finance.trends.some(item => item.value)" class="admin-bars"><div v-for="item in finance.trends" :key="item.date" class="admin-bar"><span :style="{height:`${item.value / maxRevenue * 100}%`}" /><small>{{ item.date.slice(5) }}</small></div></div><EmptyState v-else title="暂无销售趋势数据" /></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>订单状态分布</h2></div><div v-if="finance.statusDistribution.length" class="admin-ranking"><div v-for="item in finance.statusDistribution" :key="item.label" class="admin-ranking__item"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div></div><EmptyState v-else title="暂无订单数据" /></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>热销商品</h2></div><div v-if="finance.topProducts.length" class="admin-ranking"><div v-for="item in finance.topProducts" :key="item.name" class="admin-ranking__item"><span>{{ item.name }}</span><strong>{{ item.quantity }} 件 / ¥{{ item.revenue }}</strong></div></div><EmptyState v-else title="暂无热销商品" /></section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>订单记录</h2></div><BaseTable :columns="columns" :items="orders" empty-text="暂无订单记录" /></section>
  </div>
</template>
