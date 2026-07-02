<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, BaseSkeleton, EmptyState, ErrorPanel } from '@/components/base'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useAuthStore } from '@/stores/auth'
import { useEventsStore } from '@/stores/events'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eventsStore = useEventsStore()
const busy = ref(false)
const error = ref('')
const { successCheck, shakeError, pulseBadge } = useAnimeMotion()

const event = computed(() => eventsStore.getEventBySlug(route.params.slug))
const registration = computed(() => eventsStore.registrationFor(event.value?.id))
const ended = computed(() => event.value && new Date(`${event.value.date}T23:59:59`) < new Date())
const full = computed(() => event.value && Number(event.value.attendees) >= Number(event.value.capacity))
const canRegister = computed(() => event.value && !ended.value && !full.value && !['ended', 'cancelled', 'draft'].includes(event.value.status))
<<<<<<< HEAD
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
=======
>>>>>>> origin/master
const terminalRegistration = computed(() => ['attended', 'absent'].includes(registration.value?.registrationStatus))
const actionLabel = computed(() => {
  const status = registration.value?.registrationStatus
  if (status === 'registered') return '取消报名'
  if (status === 'cancelled') return '重新报名'
  if (status === 'attended') return '已参加'
  if (status === 'absent') return '已缺席'
  if (full.value) return '已满员'
  if (ended.value) return '已结束'
  return '立即报名'
})

async function act(domEvent) {
  if (terminalRegistration.value) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  busy.value = true
  error.value = ''
  try {
    if (registration.value?.registrationStatus === 'registered') await eventsStore.cancelRegistration(event.value.id)
    else await eventsStore.register(event.value)
    await eventsStore.fetchEventDetail(route.params.slug)
    successCheck(domEvent?.currentTarget)
    pulseBadge(document.querySelector('.detail-copy .base-badge:last-child'))
  } catch (err) {
    error.value = err.message
    shakeError(domEvent?.currentTarget)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await eventsStore.fetchEventDetail(route.params.slug)
  if (authStore.isAuthenticated) await eventsStore.fetchRegistrations()
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton variant="ghost" size="sm" @click="router.push('/events')">返回活动中心</BaseButton>
      <BaseSkeleton v-if="eventsStore.loading" variant="card" />
      <ErrorPanel
        v-else-if="eventsStore.apiError"
        title="活动详情加载失败"
        :message="eventsStore.apiError"
        @retry="eventsStore.fetchEventDetail(route.params.slug)"
      />
      <template v-else-if="event">
        <section class="detail-hero-grid">
          <div class="detail-cover">
            <img v-if="event.coverUrl" class="event-cover-image" :src="resolveUploadUrl(event.coverUrl)" :alt="event.title" decoding="async" />
            <strong v-else>{{ event.category }} · {{ event.date }}</strong>
          </div>
          <div class="detail-copy">
            <div class="cb-cluster">
              <BaseBadge variant="neutral">{{ event.category }}</BaseBadge>
              <BaseBadge :variant="canRegister && !terminalRegistration ? 'success' : 'neutral'">{{ actionLabel }}</BaseBadge>
            </div>
            <h1>{{ event.title }}</h1>
            <p class="page-subtitle">{{ event.summary }}</p>
            <div class="detail-list">
              <div class="detail-list__row"><span>时间</span><strong>{{ event.date }} {{ event.time }}</strong></div>
              <div class="detail-list__row"><span>地点</span><strong>{{ event.location }}</strong></div>
              <div class="detail-list__row"><span>报名</span><strong>{{ event.attendees }} / {{ event.capacity }} 人</strong></div>
<<<<<<< HEAD
              <div v-if="registration?.registeredAt" class="detail-list__row"><span>报名时间</span><strong>{{ formatDate(registration.registeredAt) }}</strong></div>
              <div v-if="registration?.cancelledAt" class="detail-list__row"><span>取消时间</span><strong>{{ formatDate(registration.cancelledAt) }}</strong></div>
              <div v-if="registration?.attendedAt" class="detail-list__row"><span>签到时间</span><strong>{{ formatDate(registration.attendedAt) }}</strong></div>
              <div v-if="registration?.absentAt" class="detail-list__row"><span>缺席记录</span><strong>{{ formatDate(registration.absentAt) }}</strong></div>
=======
              <div v-if="registration?.registeredAt" class="detail-list__row"><span>报名时间</span><strong>{{ registration.registeredAt }}</strong></div>
              <div v-if="registration?.cancelledAt" class="detail-list__row"><span>取消时间</span><strong>{{ registration.cancelledAt }}</strong></div>
              <div v-if="registration?.attendedAt" class="detail-list__row"><span>签到时间</span><strong>{{ registration.attendedAt }}</strong></div>
              <div v-if="registration?.absentAt" class="detail-list__row"><span>缺席记录</span><strong>{{ registration.absentAt }}</strong></div>
>>>>>>> origin/master
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
            <BaseButton
              :loading="busy"
              :disabled="terminalRegistration || (registration?.registrationStatus !== 'registered' && !canRegister)"
              @click="act($event)"
            >
              {{ actionLabel }}
            </BaseButton>
          </div>
        </section>
        <section class="detail-panel section-block">
          <h2 class="section-title">活动介绍</h2>
          <p class="rich-text">{{ event.description }}</p>
        </section>
        <section class="detail-panel section-block">
          <h2 class="section-title">流程安排</h2>
          <ol class="agenda-list"><li v-for="item in event.agenda" :key="item">{{ item }}</li></ol>
        </section>
      </template>
      <EmptyState v-else title="未找到该活动" action-label="返回活动中心" @action="router.push('/events')" />
    </main>
  </div>
</template>

<style scoped>
.event-cover-image {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 22rem;
  object-fit: cover;
  border-radius: var(--cb-radius-xl);
}
</style>
