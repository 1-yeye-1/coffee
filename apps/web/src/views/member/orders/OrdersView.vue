<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseModal, BaseTabs, BaseToast, EmptyState, ErrorPanel } from '@/components/base'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/commerce.css'

const router = useRouter()
const orderStore = useOrderStore()
const activeStatus = ref('all')
const cancelTarget = ref(null)
const cancelling = ref(false)
const refreshing = ref(false)
const toastVisible = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastVariant = ref('success')
let pollTimer = null

const cancellableStatuses = new Set(['pending_payment', 'pending_review', 'pending', 'unpaid', 'created'])
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
const visibleOrders = computed(() => activeStatus.value === 'all'
  ? orderStore.orders
  : orderStore.orders.filter((order) => order.status === activeStatus.value))
const shouldPoll = computed(() => orderStore.orders.some((order) => ['pending_payment', 'pending_review'].includes(order.status)))
const stats = computed(() => ({
  all: orderStore.orders.length,
  pending_payment: orderStore.orders.filter((order) => order.status === 'pending_payment').length,
  pending_review: orderStore.orders.filter((order) => order.status === 'pending_review').length,
  paid: orderStore.orders.filter((order) => order.status === 'paid').length,
}))

function meta(status) {
  return statusMeta[status] || { label: status, badge: 'neutral' }
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

function notify(title, message, variant = 'success') {
  toastVisible.value = false
  toastTitle.value = title
  toastMessage.value = message
  toastVariant.value = variant
  nextTick(() => { toastVisible.value = true })
}

async function refreshOrders(silent = false) {
  refreshing.value = true
  const before = new Map(orderStore.orders.map((order) => [order.id, order.status]))
  await orderStore.fetchOrders()
  refreshing.value = false
  const changed = orderStore.orders.some((order) => before.has(order.id) && before.get(order.id) !== order.status)
  if (!silent) notify('订单状态已刷新', changed ? '有订单状态发生更新。' : '当前订单状态已是最新。')
  else if (changed) notify('订单状态已更新', '后台审核结果已同步。')
}

function resetPolling() {
  window.clearInterval(pollTimer)
  if (shouldPoll.value) pollTimer = window.setInterval(() => refreshOrders(true), 12000)
}

async function pay(order) {
  try {
    await orderStore.payOrder(order.id)
    notify('已提交支付', '订单已进入后台确认流程。')
  } catch (error) {
    notify('支付提交失败', error.message || '请稍后重试。', 'error')
  }
}

function askCancel(order) {
  cancelTarget.value = order
}

async function confirmCancel() {
  if (!cancelTarget.value) return
  cancelling.value = true
  try {
    await orderStore.cancelOrder(cancelTarget.value.id)
    cancelTarget.value = null
    notify('订单已取消', '订单状态已更新为 cancelled。')
  } catch (error) {
    notify('取消失败', error.message || '当前订单不允许取消。', 'error')
  } finally {
    cancelling.value = false
  }
}

onMounted(async () => {
  await orderStore.fetchOrders()
  resetPolling()
})
watch(() => orderStore.orders.map((order) => order.status).join(','), resetPolling)
watch(activeStatus, () => refreshOrders(true))
onBeforeUnmount(() => window.clearInterval(pollTimer))
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

    <div class="orders-toolbar">
      <span v-if="shouldPoll" class="text-muted">待确认订单会自动同步状态。</span>
      <BaseButton variant="outline" :loading="refreshing" @click="refreshOrders(false)">刷新状态</BaseButton>
    </div>

    <ErrorPanel v-if="orderStore.error" title="订单同步失败" :message="orderStore.error" @retry="refreshOrders(false)" />

    <BaseTabs v-model="activeStatus" :tabs="tabs" variant="member">
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
              <span v-for="item in order.items.slice(0, 3)" :key="item.id" class="order-card__thumb">{{ item.name.slice(0, 1) }}</span>
            </div>
            <div>
              <strong>{{ order.items.map((item) => item.name).join('、') }}</strong>
              <p class="text-muted">共 {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} 件商品</p>
            </div>
          </div>

          <footer class="order-card__footer">
            <div><span class="text-muted">订单金额</span><strong> ￥{{ order.amounts.total }}</strong></div>
            <div class="order-card__actions">
              <BaseButton variant="outline" size="sm" @click="router.push(`/account/orders/${order.id}`)">查看详情</BaseButton>
              <BaseButton v-if="order.status === 'pending_payment'" size="sm" @click="pay(order)">去支付</BaseButton>
              <BaseButton v-if="cancellableStatuses.has(order.status)" variant="ghost" size="sm" @click="askCancel(order)">取消订单</BaseButton>
              <BaseButton v-if="order.status === 'paid'" size="sm" @click="orderStore.confirmOrder(order.id)">确认收货</BaseButton>
            </div>
          </footer>
        </article>

        <EmptyState v-if="!visibleOrders.length" title="暂无相关订单" description="当前分类下还没有订单记录。" action-label="去咖啡商城" @action="router.push('/coffee')">
          <template #icon>!</template>
        </EmptyState>
      </div>
    </BaseTabs>

    <BaseModal :model-value="Boolean(cancelTarget)" title="确认取消订单" @update:model-value="(value) => { if (!value) cancelTarget = null }">
      <div class="cancel-confirm">
        <p>确认取消订单 {{ cancelTarget?.orderNo || cancelTarget?.id }} 吗？取消后订单状态会变为 cancelled。</p>
        <div>
          <BaseButton variant="ghost" @click="cancelTarget = null">再想想</BaseButton>
          <BaseButton variant="danger" :loading="cancelling" @click="confirmCancel">确认取消</BaseButton>
        </div>
      </div>
    </BaseModal>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.orders-toolbar,
.cancel-confirm div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: space-between;
}
.cancel-confirm {
  display: grid;
  gap: var(--cb-space-4);
}

.orders-toolbar:has(.text-muted) .base-button {
  margin-left: auto;
}
</style>
