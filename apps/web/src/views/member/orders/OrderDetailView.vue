<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseModal, BaseToast, EmptyState } from '@/components/base'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/commerce.css'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const orderStore = useOrderStore()
const toastVisible = ref(route.query.created === '1')
const toastTitle = ref(route.query.created === '1' ? '订单创建成功' : '')
const toastMessage = ref(route.query.created === '1' ? '订单已创建，请在有效时间内完成模拟支付。' : '')
const toastVariant = ref('success')
const cancelOpen = ref(false)
const cancelling = ref(false)
const refreshing = ref(false)
const paying = ref(false)
const confirming = ref(false)
let pollTimer = null
const order = computed(() => orderStore.currentOrder || orderStore.getOrderById(route.params.id))
const cancellableStatuses = new Set(['pending_payment', 'pending_review', 'pending', 'unpaid', 'created'])
const statusMeta = {
  pending_payment: { label: '待支付', badge: 'warning', step: 1 },
  pending_review: { label: '待后台确认', badge: 'warning', step: 2 },
  paid: { label: '已支付', badge: 'info', step: 3 },
  completed: { label: '已完成', badge: 'success', step: 4 },
  cancelled: { label: '已取消', badge: 'neutral', step: 1 },
  payment_expired: { label: '支付已过期', badge: 'neutral', step: 1 },
}
const timeline = ['提交订单', '模拟支付', '后台确认', '订单完成']
const pickupNames = {
  city: 'Coffee Book 城市阅读店',
  campus: 'Coffee Book 校园店',
  riverside: 'Coffee Book 江畔店',
}
const paymentNames = { wechat: '微信支付', alipay: '支付宝', store: '到店支付' }
const shouldPoll = computed(() => ['pending_payment', 'pending_review'].includes(order.value?.status))
const paymentStatusText = {
  created: '待支付',
  reviewing: '待后台确认',
  confirmed: '支付已确认',
  rejected: '支付被驳回',
  expired: '支付已过期',
}
const refundStatusText = {
  refunding: '退款处理中',
  refunded: '退款已完成',
  refund_rejected: '退款被驳回',
}
const operationalRows = computed(() => {
  if (!order.value) return []
  const item = order.value
  return [
    item.paymentStatus ? ['支付状态', paymentStatusText[item.paymentStatus] || item.paymentStatus] : null,
    item.cancelReason ? ['取消原因', item.cancelReason] : null,
    item.timeline?.cancelledAt ? ['取消时间', formatDate(item.timeline.cancelledAt)] : null,
    refundStatusText[item.status] ? ['退款状态', refundStatusText[item.status]] : null,
    item.refund?.reason ? ['退款原因', item.refund.reason] : null,
    item.refund?.amount !== null && item.refund?.amount !== undefined ? ['退款金额', `￥${item.refund.amount}`] : null,
    item.refund?.note ? ['退款审核备注', item.refund.note] : null,
    item.refund?.refundedAt ? ['退款完成时间', formatDate(item.refund.refundedAt)] : null,
  ].filter(Boolean)
})

function meta(status) {
  return statusMeta[status] || { label: status, badge: 'neutral', step: 1 }
}

function formatDate(value) {
  if (!value) return '待完成'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function brewMethodText(value) {
  return { self_grind: '自己手磨', barista: '咖啡师制作' }[value] || '-'
}

function notify(title, message, variant = 'success') {
  toastVisible.value = false
  toastTitle.value = title
  toastMessage.value = message
  toastVariant.value = variant
  nextTick(() => { toastVisible.value = true })
}

async function loadOrder(silent = false) {
  const previous = order.value?.status
  refreshing.value = true
  await orderStore.fetchOrderDetail(route.params.id)
  refreshing.value = false
  if (silent && previous && order.value?.status && previous !== order.value.status) {
    notify('订单状态已更新', '后台审核结果已同步。')
  }
}

function resetPolling() {
  window.clearInterval(pollTimer)
  if (shouldPoll.value) pollTimer = window.setInterval(() => loadOrder(true), 12000)
}

async function refreshStatus() {
  await loadOrder(false)
  notify('订单状态已刷新', '当前订单状态已是最新。')
}

async function pay() {
  paying.value = true
  try {
    await orderStore.payOrder(order.value.id)
    notify('已提交支付', '订单已进入后台确认流程，请等待管理员审核。')
  } catch (error) {
    notify('支付提交失败', error.message || '请稍后重试。', 'error')
  } finally {
    paying.value = false
  }
}

async function cancel() {
  cancelling.value = true
  try {
    await orderStore.cancelOrder(order.value.id)
    cancelOpen.value = false
    notify('订单已取消', '该订单已标记为 cancelled。')
  } catch (error) {
    notify('取消失败', error.message || '当前订单不允许取消。', 'error')
  } finally {
    cancelling.value = false
  }
}

async function confirm() {
  confirming.value = true
  try {
    await orderStore.confirmOrder(order.value.id)
    notify('订单已完成', '感谢确认收货。')
  } catch (error) {
    notify('确认失败', error.message || '请稍后重试。', 'error')
  } finally {
    confirming.value = false
  }
}

function buyAgain() {
  order.value.items.forEach((item) => cartStore.addItem(item, item.quantity, { brewMethod: item.brewMethod }))
  notify('已重新加入购物车', '订单商品已加入购物车。')
}

function handleFocus() {
  if (shouldPoll.value) loadOrder(true)
}

watch(() => route.params.id, () => loadOrder(false))
watch(() => order.value?.status, resetPolling)
onMounted(async () => {
  await loadOrder(false)
  resetPolling()
  window.addEventListener('focus', handleFocus)
})
onBeforeUnmount(() => {
  window.clearInterval(pollTimer)
  window.removeEventListener('focus', handleFocus)
})
</script>

<template>
  <div class="member-order-detail cb-fade-in">
    <BaseButton variant="ghost" size="sm" @click="router.push('/account/orders')">返回我的订单</BaseButton>

    <template v-if="order">
      <section class="order-status-card">
        <div class="order-status-card__top">
          <div>
            <span class="section-eyebrow">订单详情</span>
            <h2>订单号 {{ order.orderNo || order.id }}</h2>
            <p class="text-muted">创建于 {{ formatDate(order.createdAt) }}</p>
          </div>
          <BaseBadge :variant="meta(order.status).badge">{{ meta(order.status).label }}</BaseBadge>
        </div>

        <div class="order-timeline" aria-label="订单状态时间线">
          <div v-for="(step, index) in timeline" :key="step" class="order-timeline__step" :class="{ 'is-active': index < meta(order.status).step }">
            <span>{{ step }}</span>
          </div>
        </div>

        <div v-if="operationalRows.length" class="order-operational-note">
          <div v-for="[label, value] in operationalRows" :key="label">
            <span>{{ label }}</span>
            <strong>{{ value || '暂无' }}</strong>
          </div>
        </div>

        <div class="order-detail-actions">
          <BaseButton variant="outline" :loading="refreshing" @click="refreshStatus">刷新状态</BaseButton>
          <BaseButton v-if="order.status === 'pending_payment'" :loading="paying" @click="pay">去支付</BaseButton>
          <BaseButton v-if="cancellableStatuses.has(order.status)" variant="outline" @click="cancelOpen = true">取消订单</BaseButton>
          <BaseButton v-if="order.status === 'paid'" :loading="confirming" @click="confirm">确认收货</BaseButton>
          <BaseButton v-if="['completed', 'cancelled', 'payment_expired'].includes(order.status)" @click="buyAgain">再次购买</BaseButton>
        </div>
      </section>

      <div class="order-detail-grid">
        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>商品清单</h2></div>
          <div class="checkout-items">
            <div v-for="item in order.items" :key="item.id" class="commerce-product">
              <div class="commerce-product__visual" aria-hidden="true" />
              <div class="commerce-product__copy">
                <h3>{{ item.name }}</h3>
                <p>{{ item.category }}<template v-if="item.flavor?.length"> / {{ item.flavor.join(' / ') }}</template></p>
                <p v-if="item.brewMethod">制作方式：{{ brewMethodText(item.brewMethod) }}</p>
                <strong>￥{{ item.price }} × {{ item.quantity }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>{{ order.deliveryType === 'pickup' ? '自取信息' : '配送信息' }}</h2></div>
          <div class="detail-list">
            <template v-if="order.deliveryType === 'pickup'">
              <div class="detail-list__row"><span>自取门店</span><strong>{{ pickupNames[order.pickupStore] || order.pickupStore || '门店自取' }}</strong></div>
              <div class="detail-list__row"><span>取货方式</span><strong>出示订单号到店领取</strong></div>
            </template>
            <template v-else>
              <div class="detail-list__row"><span>收货人</span><strong>{{ order.address?.recipient }}</strong></div>
              <div class="detail-list__row"><span>手机号</span><strong>{{ order.address?.phone }}</strong></div>
              <div class="detail-list__row"><span>收货地址</span><strong>{{ order.address?.region }} {{ order.address?.detail }}</strong></div>
            </template>
            <div v-if="order.orderNote" class="detail-list__row"><span>订单备注</span><strong>{{ order.orderNote }}</strong></div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>支付信息</h2></div>
          <div class="detail-list">
            <div class="detail-list__row"><span>支付方式</span><strong>{{ paymentNames[order.paymentMethod] || order.paymentMethod }}</strong></div>
            <div class="detail-list__row"><span>支付状态</span><strong>{{ meta(order.status).label }}</strong></div>
            <div class="detail-list__row"><span>支付有效期</span><strong>{{ formatDate(order.paymentExpiresAt) }}</strong></div>
            <div class="detail-list__row"><span>支付时间</span><strong>{{ formatDate(order.timeline?.paidAt) }}</strong></div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>金额明细</h2></div>
          <div class="detail-list">
            <div class="detail-list__row"><span>商品总价</span><strong>￥{{ order.amounts.subtotal }}</strong></div>
            <div class="detail-list__row"><span>优惠</span><strong>-￥{{ order.amounts.discount }}</strong></div>
            <div class="detail-list__row"><span>积分抵扣</span><strong>-￥{{ order.amounts.pointsDeduction }}</strong></div>
            <div class="detail-list__row"><span>配送费</span><strong>￥{{ order.amounts.shippingFee }}</strong></div>
            <div class="detail-list__row summary-row--total"><span>实付金额</span><strong>￥{{ order.amounts.total }}</strong></div>
          </div>
        </section>
      </div>
    </template>

    <EmptyState v-else title="未找到该订单" description="订单不存在，或本地订单数据已被清除。" action-label="返回我的订单" @action="router.push('/account/orders')">
      <template #icon>!</template>
    </EmptyState>

    <BaseModal v-model="cancelOpen" title="确认取消订单">
      <div class="cancel-confirm">
        <p>确认取消该订单吗？取消成功后订单状态会变为 cancelled。</p>
        <div>
          <BaseButton variant="ghost" @click="cancelOpen = false">再想想</BaseButton>
          <BaseButton variant="danger" :loading="cancelling" @click="cancel">确认取消</BaseButton>
        </div>
      </div>
    </BaseModal>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.cancel-confirm {
  display: grid;
  gap: var(--cb-space-4);
}
.cancel-confirm div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  justify-content: flex-end;
}
.order-operational-note {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  background: var(--cb-bg-soft);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}
.order-operational-note div {
  display: grid;
  gap: var(--cb-space-1);
}
.order-operational-note span {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}
.order-operational-note strong {
  color: var(--cb-text-primary);
  overflow-wrap: anywhere;
}
</style>
