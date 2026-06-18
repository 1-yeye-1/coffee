<script setup>
import { onMounted, ref } from 'vue'

import { getAccountOverview } from '@/api/account'
import { BaseBadge } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const loading = ref(false)
const error = ref('')
const overview = ref({ user: null, stats: {} })

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = (await getAccountOverview()).data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Account</span>
      <h2 class="page-title">账户概览</h2>
      <p class="page-subtitle">查看你的账号资料、积分和近期数据。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
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

    <section v-if="loading" class="member-panel">
      <p class="text-muted">正在加载账户数据...</p>
    </section>
  </div>
</template>
