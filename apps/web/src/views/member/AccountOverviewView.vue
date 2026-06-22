<script setup>
import { nextTick, onMounted, ref } from 'vue'

import { getAccountOverview } from '@/api/account'
import { BaseBadge, BaseSkeleton, ErrorPanel } from '@/components/base'
import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import '@/assets/styles/pages/engagement.css'

const loading = ref(false)
const error = ref('')
const overview = ref({ user: null, stats: {} })
const pageRef = ref(null)
const { revealCards } = useGsapReveal(pageRef)
const { animateCounts } = useGsapNumber()

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = (await getAccountOverview()).data
    await nextTick()
    revealCards('.member-stat', { key: 'member-stats', stagger: 0.055 })
    animateCounts(pageRef.value?.querySelectorAll('.member-stat strong') || [], [
      overview.value.stats.orders || 0, overview.value.stats.bookings || 0,
      overview.value.stats.posts || 0, overview.value.stats.eventRegistrations || 0,
      overview.value.stats.favorites || 0, overview.value.stats.unreadNotifications || 0,
    ])
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div ref="pageRef" class="member-page">
    <header>
      <span class="section-eyebrow">Account</span>
      <h2 class="page-title">账户概览</h2>
      <p class="page-subtitle">查看你的账号资料、积分和近期数据。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <section v-if="overview.user" class="member-panel profile-card">
      <span class="avatar">{{ (overview.user.nickname || overview.user.username || '用').slice(0, 1) }}</span>
      <div>
        <h3>{{ overview.user.nickname }}</h3>
        <BaseBadge variant="premium">{{ overview.user.level }}</BaseBadge>
        <p>{{ overview.user.points }} 积分</p>
      </div>
    </section>

    <section class="member-stat-grid">
      <div v-for="item in [
        ['我的订单', overview.stats.orders || 0],
        ['我的预约', overview.stats.bookings || 0],
        ['我的帖子', overview.stats.posts || 0],
        ['活动报名', overview.stats.eventRegistrations || 0],
        ['我的收藏', overview.stats.favorites || 0],
        ['未读通知', overview.stats.unreadNotifications || 0],
      ]" :key="item[0]" class="member-stat">
        <span>{{ item[0] }}</span>
        <strong>{{ item[1] }}</strong>
      </div>
    </section>

    <section v-if="loading" class="member-stat-grid" aria-label="正在加载账户数据">
      <BaseSkeleton v-for="index in 6" :key="index" variant="card" />
    </section>
  </div>
</template>
