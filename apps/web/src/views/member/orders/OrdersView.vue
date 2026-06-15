<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseTabs, EmptyState } from '@/components/base'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/commerce.css'

const router = useRouter()
const orderStore = useOrderStore()
const activeStatus = ref('all')

const statusMeta = {
  pending_payment: { label: '待支付', badge: 'warning' },
  pending_review: { label: '待确认', badge: 'warning' },
  paid: { label: '已支付', badge: 'info' },
  completed: { label: '已完成', badge: 'success' },
  cancelled: { label: '已取消', badge: 'neutral' },
  payment_expired: { label: '支付过期', badge: 'neutral' },
}
const tabs = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待确认', value: 'pending_review' },
  { label: '已支付', value: 'paid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]
const visibleOrders = computed(() =>
  activeStatus.value === 'all'
    ? orderStore.orders
    : orderStore.orders.filter((order) => order.status === activeStatus.value),
)
const stats = computed(() => ({
  all: orderStore.orders.length,
  pending_payment: orderStore.orders.filter((order) => order.status === 'pending_payment').length,
  pending_review: orderStore.orders.filter((order) => order.status === 'pending_review').length,
  paid: orderStore.orders.filter((order) => order.status === 'paid').length,
}))

function meta(status) {
  return statusMeta[status] || statusMeta.pending_payment
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(() => orderStore.fetchOrders())
</script>

<template>
  <div class="member-orders cb-fade-in">
    <header class="member-page-title">
      <span class="section-eyebrow">我的订单</span>
      <h2 class="page-title">我的订单</h2>
      <p class="text-muted">查看交易记录并管理订单状态。</p>
    </header>

    <section class="order-stats" aria-label="订单统计">
      <div class="order-stat"><strong>{{ stats.all }}</strong><span>全部订单</span></div>
      <div class="order-stat"><strong>{{ stats.pending_payment }}</strong><span>待支付</span></div>
      <div class="order-stat"><strong>{{ stats.pending_review }}</strong><span>待确认</span></div>
      <div class="order-stat"><strong>{{ stats.paid }}</strong><span>已支付</span></div>
    </section>

    <BaseTabs v-model="activeStatus" :tabs="tabs">
      <div class="order-list">
        <article v-for="order in visibleOrders" :key="order.id" class="order-card">
          <header class="order-card__header">
            <div class="order-card__meta">
              <strong>订单号 {{ order.orderNo || order.id }}</strong>
              <small>{{ formatDate(order.createdAt) }}</small>
            </div>
            <BaseBadge :variant="meta(order.status).badge">{{ meta(order.status).label }}</BaseBadge>
          </header>

          <div class="order-card__products">
            <div class="order-card__thumbs" aria-hidden="true">
              <span v-for="item in order.items.slice(0, 3)" :key="item.id" class="order-card__thumb">
                {{ item.name.slice(0, 1) }}
              </span>
            </div>
            <div>
              <strong>{{ order.items.map((item) => item.name).join('、') }}</strong>
              <p class="text-muted">共 {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} 件商品</p>
            </div>
          </div>

          <footer class="order-card__footer">
            <div>
              <span class="text-muted">订单金额</span>
              <strong> ¥{{ order.amounts.total }}</strong>
            </div>
            <div class="order-card__actions">
              <BaseButton variant="outline" size="sm" @click="router.push(`/account/orders/${order.id}`)">查看详情</BaseButton>
              <BaseButton v-if="order.status === 'pending_payment'" size="sm" @click="orderStore.payOrder(order.id)">去支付</BaseButton>
              <BaseButton
                v-if="order.status === 'pending_payment'"
                variant="ghost"
                size="sm"
                @click="orderStore.cancelOrder(order.id)"
              >
                取消订单
              </BaseButton>
              <BaseButton v-if="order.status === 'paid'" size="sm" @click="orderStore.confirmOrder(order.id)">确认收货</BaseButton>
            </div>
          </footer>
        </article>

        <EmptyState
          v-if="!visibleOrders.length"
          title="暂无相关订单"
          description="当前分类下还没有订单记录。"
          action-label="去咖啡商城"
          @action="router.push('/coffee')"
        >
          <template #icon>□</template>
        </EmptyState>
      </div>
    </BaseTabs>
  </div>
</template>
