<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton, BaseInput, BaseSelect, BaseTextarea, EmptyState } from '@/components/base'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/commerce.css'

const router = useRouter()
const cartStore = useCartStore()
const checkoutStore = useCheckoutStore()
const orderStore = useOrderStore()
const validationError = ref('')

const pickupOptions = [
  { label: 'Coffee Book 城市阅读店', value: 'city' },
  { label: 'Coffee Book 校园店', value: 'campus' },
  { label: 'Coffee Book 江畔店', value: 'riverside' },
]
const couponOptions = [
  { label: '无优惠券', value: 'none' },
  { label: '新人满 99 减 10', value: 'new-10' },
  { label: '会员咖啡券 9 折', value: 'member-90' },
]
const snapshot = computed(() => checkoutStore.buildCheckoutSnapshot(cartStore.selectedItems))

function validate() {
  if (!cartStore.selectedItems.length) return false
  if (checkoutStore.deliveryType === 'delivery') {
    const { recipient, phone, region, detail } = checkoutStore.addressForm
    if (!recipient || !phone || !region || !detail) {
      validationError.value = '请完整填写收货人、手机号、所在地区和详细地址。'
      return false
    }
    if (!/^1\d{10}$/.test(phone)) {
      validationError.value = '请输入正确的 11 位手机号。'
      return false
    }
  }
  if (!checkoutStore.paymentMethod) {
    validationError.value = '请选择支付方式。'
    return false
  }
  validationError.value = ''
  return true
}

async function submitOrder() {
  if (!validate()) return
  const selectedIds = cartStore.selectedItems.map((item) => item.id)
  try {
    const order = await orderStore.createOrder(snapshot.value)
    if (orderStore.source === 'api') await cartStore.fetchCart()
    else cartStore.removeItems(selectedIds)
    checkoutStore.reset()
    router.push({ path: `/account/orders/${order.id}`, query: { created: '1' } })
  } catch (error) { validationError.value = error.message }
}
</script>

<template>
  <div class="commerce-page cb-fade-in">
    <section class="commerce-hero">
      <div class="cb-container commerce-hero__inner">
        <span class="section-eyebrow">Secure Checkout</span>
        <h1 class="page-title">确认订单</h1>
        <p class="page-subtitle">选择配送方式、支付方式，并确认你的订单信息。</p>
      </div>
    </section>

    <main class="cb-container commerce-content">
      <EmptyState
        v-if="!cartStore.selectedItems.length"
        title="暂无可结算商品"
        description="请先在购物车中选择需要结算的商品。"
        action-label="返回购物车"
        @action="router.push('/cart')"
      >
        <template #icon>◇</template>
      </EmptyState>

      <div v-else class="commerce-layout">
        <div class="checkout-sections">
          <section class="checkout-section">
            <h2>配送方式</h2>
            <div class="choice-grid">
              <label class="choice-card">
                <input
                  v-model="checkoutStore.deliveryType"
                  type="radio"
                  value="pickup"
                  name="delivery-type"
                />
                <strong>到店自取</strong>
                <small>免配送费，到店出示订单即可领取。</small>
              </label>
              <label class="choice-card">
                <input
                  v-model="checkoutStore.deliveryType"
                  type="radio"
                  value="delivery"
                  name="delivery-type"
                />
                <strong>快递配送</strong>
                <small>订单满 ¥199 免运费，未满收取 ¥12。</small>
              </label>
            </div>

            <BaseSelect
              v-if="checkoutStore.deliveryType === 'pickup'"
              v-model="checkoutStore.pickupStore"
              label="自取门店"
              :options="pickupOptions"
            />

            <div v-else class="checkout-form-grid">
              <BaseInput v-model="checkoutStore.addressForm.recipient" label="收货人" placeholder="请输入姓名" />
              <BaseInput v-model="checkoutStore.addressForm.phone" label="手机号" placeholder="请输入 11 位手机号" />
              <BaseInput v-model="checkoutStore.addressForm.region" label="所在地区" placeholder="省 / 市 / 区" />
              <BaseInput v-model="checkoutStore.addressForm.detail" label="详细地址" placeholder="街道、门牌号等" />
            </div>
          </section>

          <section class="checkout-section">
            <h2>优惠与积分</h2>
            <BaseSelect v-model="checkoutStore.coupon" label="优惠券" :options="couponOptions" />
            <BaseInput
              v-model="checkoutStore.pointsUsed"
              type="number"
              min="0"
              step="100"
              label="使用积分"
              hint="每 100 积分抵扣 ¥1，本次最多抵扣 ¥20。"
            />
          </section>

          <section class="checkout-section">
            <h2>支付方式</h2>
            <div class="choice-grid">
              <label v-for="method in [
                { value: 'wechat', label: '微信支付', hint: '提交后进入模拟待支付状态' },
                { value: 'alipay', label: '支付宝', hint: '提交后进入模拟待支付状态' },
                { value: 'store', label: '到店支付', hint: '适用于门店自取订单' },
              ]" :key="method.value" class="choice-card">
                <input v-model="checkoutStore.paymentMethod" type="radio" :value="method.value" name="payment-method" />
                <strong>{{ method.label }}</strong>
                <small>{{ method.hint }}</small>
              </label>
            </div>
            <BaseTextarea
              v-model="checkoutStore.orderNote"
              label="订单备注"
              hint="选填，请填写包装、配送等补充说明。"
              :maxlength="120"
              show-count
            />
          </section>

          <p v-if="validationError" class="checkout-error" role="alert">{{ validationError }}</p>
        </div>

        <aside class="summary-card" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">订单摘要</h2>
          <div class="checkout-items">
            <div v-for="item in snapshot.items" :key="item.id" class="checkout-item">
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <strong>¥{{ item.lineTotal }}</strong>
            </div>
          </div>
          <div class="summary-card__items">
            <div class="summary-row"><span>商品总价</span><strong>¥{{ snapshot.amounts.subtotal }}</strong></div>
            <div class="summary-row"><span>优惠</span><strong>-¥{{ snapshot.amounts.discount }}</strong></div>
            <div class="summary-row"><span>积分抵扣</span><strong>-¥{{ snapshot.amounts.pointsDeduction }}</strong></div>
            <div class="summary-row"><span>配送费</span><strong>¥{{ snapshot.amounts.shippingFee }}</strong></div>
          </div>
          <div class="summary-row summary-row--total"><span>实付金额</span><strong>¥{{ snapshot.amounts.total }}</strong></div>
          <BaseButton size="lg" @click="submitOrder">提交订单</BaseButton>
          <small class="policy-hint">
            提交订单即表示你同意 Coffee Book 的
            <RouterLink to="/terms">服务条款</RouterLink>
            和
            <RouterLink to="/privacy">隐私政策</RouterLink>
            。
          </small>
          <small class="text-muted">本阶段创建本地订单，不会发起真实支付。</small>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.policy-hint {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
  line-height: var(--cb-line-relaxed);
}

.policy-hint a {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}
</style>
