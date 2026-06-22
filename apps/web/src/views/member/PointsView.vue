<script setup>
import { onMounted, ref } from 'vue'

import { getPointsCenter, redeemPointsCoupon } from '@/api/account'
import { BaseBadge, BaseButton, BaseCard, BaseTable, BaseToast, ErrorPanel } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const records = ref([])
const balance = ref(0)
const coupons = ref([])
const redemptions = ref([])
const birthdayBenefit = ref(null)
const loading = ref(false)
const redeemingId = ref(null)
const toastVisible = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const error = ref('')
const columns = [
  { key: 'description', label: '说明' },
  { key: 'source', label: '来源' },
  { key: 'points', label: '积分' },
  { key: 'createdAt', label: '时间' },
]
const redemptionColumns = [
  { key: 'name', label: '优惠券' },
  { key: 'source', label: '来源' },
  { key: 'pointsCost', label: '使用积分' },
  { key: 'status', label: '状态' },
  { key: 'expiresAt', label: '有效期至' },
]

function applyData(data) {
  balance.value = data.balance
  records.value = data.records
  coupons.value = data.coupons
  redemptions.value = data.redemptions
  birthdayBenefit.value = data.birthdayBenefit
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    applyData((await getPointsCenter()).data)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function redeem(coupon) {
  if (redeemingId.value || balance.value < coupon.pointsCost) return
  redeemingId.value = coupon.id
  error.value = ''
  try {
    const requestKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    applyData((await redeemPointsCoupon(coupon.id, requestKey)).data)
    toastTitle.value = '兑换成功'
    toastMessage.value = `${coupon.name} 已放入你的优惠券账户。`
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    redeemingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Points</span>
      <h2 class="page-title">积分中心</h2>
      <p class="page-subtitle">查看积分余额、兑换专属优惠券，并管理已领取福利。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <section class="points-hero member-panel">
      <div><span>当前积分余额</span><strong>{{ balance.toLocaleString('zh-CN') }}</strong><small>积分</small></div>
      <BaseBadge :variant="birthdayBenefit?.status === 'claimed' ? 'success' : 'premium'">{{ birthdayBenefit?.message || '正在检查生日福利…' }}</BaseBadge>
    </section>

    <section>
      <div class="points-heading"><h3 class="section-title">可兑换优惠券</h3><span class="text-muted">积分不足时无法兑换</span></div>
      <div class="coupon-grid">
        <BaseCard v-for="coupon in coupons" :key="coupon.id" class="coupon-card" variant="hover">
          <BaseBadge variant="premium">{{ coupon.pointsCost }} 积分</BaseBadge>
          <h3>{{ coupon.name }}</h3>
          <p>{{ coupon.description }}</p>
          <small>优惠 ¥{{ coupon.discountAmount }} · 满 ¥{{ coupon.minSpend }} 可用 · {{ coupon.validDays }} 天有效</small>
          <BaseButton :loading="redeemingId === coupon.id" :disabled="loading || balance < coupon.pointsCost" @click="redeem(coupon)">{{ balance < coupon.pointsCost ? `还差 ${coupon.pointsCost - balance} 积分` : '立即兑换' }}</BaseButton>
        </BaseCard>
      </div>
    </section>

    <section><h3 class="section-title">积分明细</h3></section>
    <BaseTable :columns="columns" :items="records" :loading="loading" empty-text="暂无积分记录">
      <template #cell-points="{ value }">
        <strong>{{ Number(value) > 0 ? `+${value}` : value }}</strong>
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
    </BaseTable>

    <section><h3 class="section-title">已兑换与已领取</h3></section>
    <BaseTable :columns="redemptionColumns" :items="redemptions" :loading="loading" empty-text="暂无优惠券记录">
      <template #cell-source="{ value }">{{ value === 'birthday' ? '生日福利' : '积分兑换' }}</template>
      <template #cell-pointsCost="{ value }">{{ value ? `-${value}` : '免费发放' }}</template>
      <template #cell-status="{ value }"><BaseBadge :variant="value === 'unused' ? 'success' : 'neutral'">{{ value === 'unused' ? '未使用' : value }}</BaseBadge></template>
      <template #cell-expiresAt="{ value }">{{ new Date(value).toLocaleDateString('zh-CN') }}</template>
    </BaseTable>
    <div class="points-toast"><BaseToast v-model="toastVisible" variant="success" :title="toastTitle">{{ toastMessage }}</BaseToast></div>
  </div>
</template>

<style scoped>
.points-hero{display:flex;align-items:center;justify-content:space-between;gap:var(--cb-space-5);background:linear-gradient(135deg,var(--cb-color-coffee),var(--cb-bg-dark));color:var(--cb-color-cream)}
.points-hero>div{display:flex;align-items:baseline;gap:var(--cb-space-2)}.points-hero span{opacity:.78}.points-hero strong{font-family:var(--cb-font-display);font-size:clamp(2.5rem,6vw,4rem)}
.points-heading{display:flex;align-items:end;justify-content:space-between;gap:var(--cb-space-4)}
.coupon-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--cb-space-5)}
.coupon-card{display:grid;gap:var(--cb-space-3)}.coupon-card p{color:var(--cb-text-secondary)}.coupon-card small{color:var(--cb-text-muted)}.coupon-card :deep(.base-button){margin-top:auto}
.points-toast{position:fixed;z-index:var(--cb-z-toast);right:var(--cb-space-5);bottom:var(--cb-space-5);width:min(calc(100% - var(--cb-space-8)),24rem)}
@media(max-width:48rem){.coupon-grid{grid-template-columns:1fr}.points-hero{align-items:flex-start;flex-direction:column}}
</style>
