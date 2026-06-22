<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, EmptyState } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import { useEventsStore } from '@/stores/events'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
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
const actionLabel = computed(() => registration.value?.registrationStatus === 'registered' ? '取消报名' : registration.value?.registrationStatus === 'cancelled' ? '重新报名' : full.value ? '已满员' : ended.value ? '已结束' : '立即报名')

async function act(domEvent) {
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
  }
  finally { busy.value = false }
}

onMounted(async () => {
  await eventsStore.fetchEventDetail(route.params.slug)
  if (authStore.isAuthenticated) await eventsStore.fetchRegistrations()
})
</script>

<template>
  <div class="engagement-page cb-fade-in"><main class="cb-container engagement-content">
    <BaseButton variant="ghost" size="sm" @click="router.push('/events')">返回活动中心</BaseButton>
    <template v-if="event">
      <section class="detail-hero-grid">
        <div class="detail-cover"><img v-if="event.coverUrl" class="event-cover-image" :src="resolveUploadUrl(event.coverUrl)" :alt="event.title" decoding="async" /><strong v-else>{{ event.category }} · {{ event.date }}</strong></div>
        <div class="detail-copy"><div class="cb-cluster"><BaseBadge variant="neutral">{{ event.category }}</BaseBadge><BaseBadge :variant="canRegister ? 'success' : 'neutral'">{{ actionLabel }}</BaseBadge></div><h1>{{ event.title }}</h1><p class="page-subtitle">{{ event.summary }}</p><div class="detail-list"><div class="detail-list__row"><span>时间</span><strong>{{ event.date }} {{ event.time }}</strong></div><div class="detail-list__row"><span>地点</span><strong>{{ event.location }}</strong></div><div class="detail-list__row"><span>报名</span><strong>{{ event.attendees }} / {{ event.capacity }} 人</strong></div></div><p v-if="error" class="form-error">{{ error }}</p><BaseButton :loading="busy" :disabled="registration?.registrationStatus !== 'registered' && !canRegister" @click="act($event)">{{ actionLabel }}</BaseButton></div>
      </section>
      <section class="detail-panel section-block"><h2 class="section-title">活动介绍</h2><p class="rich-text">{{ event.description }}</p></section>
      <section class="detail-panel section-block"><h2 class="section-title">流程安排</h2><ol class="agenda-list"><li v-for="item in event.agenda" :key="item">{{ item }}</li></ol></section>
    </template>
    <EmptyState v-else title="未找到该活动" action-label="返回活动中心" @action="router.push('/events')" />
  </main></div>
</template>

<style scoped>.event-cover-image{display:block;width:100%;height:100%;min-height:22rem;object-fit:cover;border-radius:var(--cb-radius-xl)}</style>
