<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import { getAccountOverview } from '@/api/account'
import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseSkeleton, ErrorPanel } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const overview = ref({ user: null, stats: {} })
const pageRef = ref(null)
const { revealCards } = useGsapReveal(pageRef)
const { animateCounts } = useGsapNumber()

const riskItems = computed(() => {
  const user = overview.value.user || {}
  return [
    {
      label: '账号状态',
      value: user.status === 'disabled' ? '已停用' : '正常',
      note: user.disabledReason || '',
      variant: user.status === 'disabled' ? 'danger' : 'success',
    },
    {
      label: '预约权限',
      value: isFuture(user.bookingLimitUntil) ? '限制预约中' : '正常',
      note: isFuture(user.bookingLimitUntil) ? `恢复时间：${formatDate(user.bookingLimitUntil)}` : '',
      variant: isFuture(user.bookingLimitUntil) ? 'warning' : 'success',
    },
    {
      label: '社区权限',
      value: isFuture(user.postLimitUntil) ? (isPermanent(user.postLimitUntil) ? '永久限制' : '限制发言中') : '正常',
      note: isFuture(user.postLimitUntil) && !isPermanent(user.postLimitUntil) ? `恢复时间：${formatDate(user.postLimitUntil)}` : '',
      variant: isFuture(user.postLimitUntil) ? 'warning' : 'success',
    },
  ]
})

function isFuture(value) {
  return value && new Date(value).getTime() > Date.now()
}

function isPermanent(value) {
  return value && new Date(value).getFullYear() >= 9999
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = (await getAccountOverview()).data
    await nextTick()
    revealCards('.member-stat', { key: 'member-stats', stagger: 0.055 })
    animateCounts(pageRef.value?.querySelectorAll('.member-stat strong') || [], [
      overview.value.stats.orders || 0,
      overview.value.stats.bookings || 0,
      overview.value.stats.posts || 0,
      overview.value.stats.eventRegistrations || 0,
      overview.value.stats.favorites || 0,
      overview.value.stats.unreadNotifications || 0,
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
      <img v-if="authStore.user?.avatar" :src="resolveUploadUrl(authStore.user.avatar)" class="profile-card__avatar" alt="用户头像" />
      <span v-else class="avatar">{{ (overview.user.nickname || overview.user.username || '用').slice(0, 1) }}</span>
      <div>
        <h3>{{ overview.user.nickname || overview.user.username }}</h3>
        <BaseBadge variant="premium">{{ overview.user.level }}</BaseBadge>
        <p>{{ overview.user.points }} 积分</p>
      </div>
    </section>

    <section v-if="overview.user" class="member-panel account-risk-card">
      <div v-for="item in riskItems" :key="item.label" class="account-risk-card__item">
        <span>{{ item.label }}</span>
        <BaseBadge :variant="item.variant">{{ item.value }}</BaseBadge>
        <small v-if="item.note">{{ item.note }}</small>
      </div>
    </section>

    <section class="member-stat-grid">
      <div
        v-for="item in [
          ['我的订单', overview.stats.orders || 0, '/account/orders'],
          ['我的预约', overview.stats.bookings || 0, '/account/bookings'],
          ['我的帖子', overview.stats.posts || 0, '/account/posts'],
          ['活动报名', overview.stats.eventRegistrations || 0, '/account/activities'],
          ['我的收藏', overview.stats.favorites || 0, '/account/favorites'],
          ['未读通知', overview.stats.unreadNotifications || 0, '/account/notifications'],
        ]"
        :key="item[0]"
        class="member-stat member-stat--link"
        role="button"
        tabindex="0"
        @click="router.push(item[2])"
        @keydown.enter="router.push(item[2])"
      >
        <span>{{ item[0] }}</span>
        <strong>{{ item[1] }}</strong>
      </div>
    </section>

    <section v-if="loading" class="member-stat-grid" aria-label="正在加载账户数据">
      <BaseSkeleton v-for="index in 6" :key="index" variant="card" />
    </section>
  </div>
</template>

<style scoped>
.profile-card__avatar {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  object-fit: cover;
}
.account-risk-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--cb-space-3);
}
.account-risk-card__item {
  display: grid;
  gap: var(--cb-space-2);
  align-content: start;
}
.account-risk-card__item span,
.account-risk-card__item small {
  color: var(--cb-text-muted);
}
.member-stat--link {
  cursor: pointer;
}
.member-stat--link:hover {
  background: var(--cb-bg-soft);
  transform: translateY(-2px);
  transition: all var(--cb-duration-fast) var(--cb-ease-standard);
}
</style>
