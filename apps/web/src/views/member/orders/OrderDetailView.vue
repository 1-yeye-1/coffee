<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseToast, EmptyState } from '@/components/base'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/commerce.css'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const orderStore = useOrderStore()
const toastVisible = ref(route.query.created === '1')
const toastTitle = ref(route.query.created === '1' ? '订单创建成功' : '')
const toastMessage = ref(route.query.created === '1' ? '订单已保存到本地订单中心。' : '')
const order = computed(() => orderStore.currentOrder || orderStore.getOrderById(route.params.id))

const statusMeta = {
  pending_payment: { label: '待支付', badge: 'warning', step: 1 },
  paid: { label: '已支付', badge: 'info', step: 3 },
  completed: { label: '已完成', badge: 'success', step: 4 },
  cancelled: { label: '已取消', badge: 'neutral', step: 1 },
}
const timeline = ['提交订单', '支付订单', '商家处理', '订单完成']
const pickupNames = {
  city: 'Coffee Book 城市阅读店',
  campus: 'Coffee Book 校园店',
  riverside: 'Coffee Book 江畔店',
}
const paymentNames = {
  wechat: '微信支付',
  alipay: '支付宝',
  store: '到店支付',
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

function notify(title, message) {
  toastVisible.value = false
  toastTitle.value = title
  toastMessage.value = message
  nextTick(() => {
    toastVisible.value = true
  })
}

async function pay() {
  await orderStore.payOrder(order.value.id)
  notify('支付状态已更新', '该订单已标记为已支付。')
}

async function cancel() {
  await orderStore.cancelOrder(order.value.id)
  notify('订单已取消', '该订单已标记为已取消。')
}

async function confirm() {
  await orderStore.confirmOrder(order.value.id)
  notify('订单已完成', '感谢确认收货。')
}

function loadOrder() { return orderStore.fetchOrderDetail(route.params.id) }
watch(() => route.params.id, loadOrder)
onMounted(loadOrder)

function buyAgain() {
  order.value.items.forEach((item) => cartStore.addItem(item, item.quantity))
  notify('已重新加入购物车', '订单商品已加入购物车。')
}
</script>

<template>
  <div class="member-order-detail cb-fade-in">
    <BaseButton variant="ghost" size="sm" @click="router.push('/account/orders')">← 返回我的订单</BaseButton>

    <template v-if="order">
      <section class="order-status-card">
        <div class="order-status-card__top">
          <div>
            <span class="section-eyebrow">Order Detail</span>
            <h2>订单号 {{ order.id }}</h2>
            <p class="text-muted">创建于 {{ formatDate(order.createdAt) }}</p>
          </div>
          <BaseBadge :variant="statusMeta[order.status].badge">{{ statusMeta[order.status].label }}</BaseBadge>
        </div>

        <div class="order-timeline" aria-label="订单状态时间线">
          <div
            v-for="(step, index) in timeline"
            :key="step"
            class="order-timeline__step"
            :class="{ 'is-active': index < statusMeta[order.status].step }"
          >
            <span>{{ step }}</span>
          </div>
        </div>

        <div class="order-detail-actions">
          <BaseButton v-if="order.status === 'pending_payment'" @click="pay">去支付</BaseButton>
          <BaseButton v-if="order.status === 'pending_payment'" variant="outline" @click="cancel">取消订单</BaseButton>
          <BaseButton v-if="order.status === 'paid'" @click="confirm">确认收货</BaseButton>
          <BaseButton v-if="order.status === 'completed'" @click="buyAgain">再次购买</BaseButton>
          <BaseButton v-if="order.status === 'cancelled'" @click="buyAgain">重新购买</BaseButton>
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
                <p>{{ item.category }}<template v-if="item.flavor?.length"> · {{ item.flavor.join(' · ') }}</template></p>
                <strong>¥{{ item.price }} × {{ item.quantity }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>{{ order.deliveryType === 'pickup' ? '自取信息' : '配送信息' }}</h2></div>
          <div class="detail-list">
            <template v-if="order.deliveryType === 'pickup'">
              <div class="detail-list__row"><span>自取门店</span><strong>{{ pickupNames[order.pickupStore] }}</strong></div>
              <div class="detail-list__row"><span>取货方式</span><strong>出示订单号到店领取</strong></div>
            </template>
            <template v-else>
              <div class="detail-list__row"><span>收货人</span><strong>{{ order.address.recipient }}</strong></div>
              <div class="detail-list__row"><span>手机号</span><strong>{{ order.address.phone }}</strong></div>
              <div class="detail-list__row"><span>收货地址</span><strong>{{ order.address.region }} {{ order.address.detail }}</strong></div>
            </template>
            <div v-if="order.orderNote" class="detail-list__row"><span>订单备注</span><strong>{{ order.orderNote }}</strong></div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>支付信息</h2></div>
          <div class="detail-list">
            <div class="detail-list__row"><span>支付方式</span><strong>{{ paymentNames[order.paymentMethod] }}</strong></div>
            <div class="detail-list__row"><span>支付状态</span><strong>{{ statusMeta[order.status].label }}</strong></div>
            <div class="detail-list__row"><span>支付时间</span><strong>{{ formatDate(order.timeline.paidAt) }}</strong></div>
          </div>
        </section>

        <section class="commerce-panel">
          <div class="commerce-panel__header"><h2>金额明细</h2></div>
          <div class="detail-list">
            <div class="detail-list__row"><span>商品总价</span><strong>¥{{ order.amounts.subtotal }}</strong></div>
            <div class="detail-list__row"><span>优惠</span><strong>-¥{{ order.amounts.discount }}</strong></div>
            <div class="detail-list__row"><span>积分抵扣</span><strong>-¥{{ order.amounts.pointsDeduction }}</strong></div>
            <div class="detail-list__row"><span>配送费</span><strong>¥{{ order.amounts.shippingFee }}</strong></div>
            <div class="detail-list__row summary-row--total"><span>实付金额</span><strong>¥{{ order.amounts.total }}</strong></div>
          </div>
        </section>
      </div>
    </template>

    <EmptyState
      v-else
      title="未找到该订单"
      description="订单不存在，或本地订单数据已经被清除。"
      action-label="返回我的订单"
      @action="router.push('/account/orders')"
    >
      <template #icon>◇</template>
    </EmptyState>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" :title="toastTitle">
        {{ toastMessage }}
      </BaseToast>
    </div>
  </div>
</template>
