<script setup>
import { computed, onMounted } from 'vue'

import { BaseBadge, BaseSkeleton, ErrorPanel } from '@/components/base'
import { useMembershipStore } from '@/stores/membership'
import '@/assets/styles/pages/engagement.css'

const membershipStore = useMembershipStore()
const account = computed(() => membershipStore.account || { level: 'Silver', growth: 0, nextLevelGrowth: 100 })
const progress = computed(() => Math.min(100, Math.round(account.value.growth / Math.max(1, account.value.nextLevelGrowth) * 100)))
const benefits = [
  { title: '积分返利', description: '消费、活动与阅读互动均可累积积分。' },
  { title: '活动优先报名', description: '热门文化活动提前开放会员名额。' },
  { title: '会员专属折扣', description: '精选咖啡、礼盒与空间预约享专属优惠。' },
]

onMounted(() => {
  if (!membershipStore.account) membershipStore.fetchOverview()
})
</script>

<template>
  <div class="member-page">
    <header><span class="section-eyebrow">Membership</span><h2 class="page-title">会员权益</h2></header>
    <ErrorPanel v-if="membershipStore.error" :message="membershipStore.error" @retry="membershipStore.fetchOverview" />
    <BaseSkeleton v-else-if="membershipStore.loading" variant="card" />
    <section v-else class="member-panel"><div class="member-panel__header"><div><BaseBadge variant="premium">{{ account.level }}</BaseBadge><h3>成长值 {{ account.growth }}</h3></div><strong>{{ progress }}%</strong></div><div class="progress-track"><span :style="{ width: `${progress}%` }" /></div><p class="text-muted">距离下一等级还需 {{ Math.max(0, account.nextLevelGrowth - account.growth) }} 成长值。</p></section>
    <section class="member-panel"><h3 class="section-title">等级说明</h3><div class="member-stat-grid"><div class="member-stat"><strong>Silver</strong><span>基础积分与活动通知</span></div><div class="member-stat"><strong>Gold</strong><span>专属折扣与优先报名</span></div><div class="member-stat"><strong>Black</strong><span>限定活动与年度礼遇</span></div></div></section>
    <section class="member-panel"><h3 class="section-title">专属福利</h3><div class="favorite-grid"><div v-for="benefit in benefits" :key="benefit.title" class="favorite-card"><h3>{{ benefit.title }}</h3><p>{{ benefit.description }}</p></div></div></section>
  </div>
</template>
