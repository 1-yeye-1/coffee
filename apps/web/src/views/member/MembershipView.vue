<script setup>
import { computed, onMounted, ref } from 'vue'

import { BaseBadge, BaseButton, BaseSkeleton, BaseToast, ErrorPanel } from '@/components/base'
import { useMembershipStore } from '@/stores/membership'
import '@/assets/styles/pages/engagement.css'

const membershipStore = useMembershipStore()
const checkingIn = ref(false)
const toastVisible = ref(false)
const toastMessage = ref('')
const membership = computed(() => membershipStore.membership || {
  currentLevel: '普通会员',
  nextLevel: '银卡会员',
  growthValue: 0,
  progress: 0,
  remaining: 500,
  benefits: ['积分兑换', '生日券'],
  nextBenefits: ['预约优先提醒', '咖啡券兑换折扣'],
  levels: [],
  checkedInToday: false,
  checkinReward: { points: 10, growthValue: 10 },
})

async function checkin() {
  if (checkingIn.value || membership.value.checkedInToday) return
  checkingIn.value = true
  try {
    await membershipStore.dailyCheckin()
    toastMessage.value = '签到成功，成长值已更新。'
    toastVisible.value = true
  } catch (error) {
    membershipStore.error = error.message
  } finally {
    checkingIn.value = false
  }
}

onMounted(() => {
  membershipStore.fetchMembershipCenter()
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Membership</span>
      <h2 class="page-title">会员权益</h2>
      <p class="page-subtitle">成长值独立记录长期活跃度，积分仍可用于兑换优惠券。</p>
    </header>
    <ErrorPanel v-if="membershipStore.error" :message="membershipStore.error" @retry="membershipStore.fetchMembershipCenter" />
    <BaseSkeleton v-else-if="membershipStore.loading" variant="card" />
    <template v-else>
      <section class="member-panel member-growth">
        <div class="member-panel__header">
          <div>
            <BaseBadge variant="premium">{{ membership.currentLevel }}</BaseBadge>
            <h3>成长值 {{ membership.growthValue }}</h3>
          </div>
          <strong>{{ membership.progress }}%</strong>
        </div>
        <div class="progress-track"><span :style="{ width: `${membership.progress}%` }" /></div>
        <p class="text-muted">
          {{ membership.nextLevel ? `距离 ${membership.nextLevel} 还需 ${membership.remaining} 成长值。` : '你已达到当前最高会员等级。' }}
        </p>
        <BaseButton :loading="checkingIn" :disabled="membership.checkedInToday" @click="checkin">
          {{ membership.checkedInToday ? '今日已签到' : `签到 +${membership.checkinReward.points} 积分 / +${membership.checkinReward.growthValue} 成长值` }}
        </BaseButton>
      </section>

      <section class="member-panel">
        <h3 class="section-title">等级说明</h3>
        <div class="member-stat-grid member-level-grid">
          <div v-for="level in membership.levels" :key="level.level" class="member-stat" :class="{ 'is-current': level.level === membership.currentLevel }">
            <strong>{{ level.level }}</strong>
            <span>{{ level.min }} 成长值起</span>
          </div>
        </div>
      </section>

      <section class="member-panel">
        <h3 class="section-title">当前权益</h3>
        <div class="favorite-grid">
          <div v-for="benefit in membership.benefits" :key="benefit" class="favorite-card"><h3>{{ benefit }}</h3><p>当前等级可用权益。</p></div>
        </div>
      </section>

      <section v-if="membership.nextLevel" class="member-panel">
        <h3 class="section-title">下一等级权益</h3>
        <div class="favorite-grid">
          <div v-for="benefit in membership.nextBenefits" :key="benefit" class="favorite-card"><h3>{{ benefit }}</h3><p>升级至 {{ membership.nextLevel }} 后解锁。</p></div>
        </div>
      </section>
    </template>
    <div class="points-toast"><BaseToast v-model="toastVisible" variant="success" title="签到成功">{{ toastMessage }}</BaseToast></div>
  </div>
</template>

<style scoped>
.member-growth{display:grid;gap:var(--cb-space-4)}
.member-level-grid .is-current{border-color:var(--cb-color-gold);background:color-mix(in srgb,var(--cb-color-gold) 14%,var(--cb-bg-surface))}
.points-toast{position:fixed;z-index:var(--cb-z-toast);right:var(--cb-space-5);bottom:var(--cb-space-5);width:min(calc(100% - var(--cb-space-8)),24rem)}
</style>
