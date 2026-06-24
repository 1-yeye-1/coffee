<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, EmptyState, ErrorPanel } from '@/components/base'
import { useEventsStore } from '@/stores/events'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const eventsStore = useEventsStore()
const loading = ref(false)
const error = ref('')

const registrationMeta = {
  registered: { label: '已报名', badge: 'success' },
  cancelled: { label: '已取消', badge: 'neutral' },
  attended: { label: '已参加', badge: 'success' },
  absent: { label: '已缺席', badge: 'danger' },
}

function meta(status) {
  return registrationMeta[status] || { label: status || '未知状态', badge: 'neutral' }
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

function recordNote(record) {
  const lines = [
    record.registeredAt ? `报名：${formatDate(record.registeredAt)}` : '',
    record.cancelledAt ? `取消：${formatDate(record.cancelledAt)}` : '',
    record.attendedAt ? `签到：${formatDate(record.attendedAt)}` : '',
    record.absentAt ? `缺席：${formatDate(record.absentAt)}` : '',
  ].filter(Boolean)
  return lines.join('；')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await eventsStore.fetchRegistrations()
  } catch (err) {
    error.value = err.message || '活动报名记录加载失败。'
  } finally {
    loading.value = false
  }
}

async function cancel(record) {
  await eventsStore.cancelRegistration(record.eventId)
  await load()
}

async function registerAgain(record) {
  await eventsStore.register(record)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Activities</span>
      <h2 class="page-title">活动报名记录</h2>
    </header>
    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <BaseSkeleton v-else-if="loading" variant="card" />
    <div v-else class="record-list">
      <article v-for="record in eventsStore.registrations" :key="record.registrationId" class="record-row">
        <div>
          <div class="record-row__header">
            <strong>{{ record.title }}</strong>
            <BaseBadge :variant="meta(record.registrationStatus).badge">{{ meta(record.registrationStatus).label }}</BaseBadge>
          </div>
          <p>{{ record.date }} {{ record.time }}</p>
          <small>{{ record.location }}</small>
          <small v-if="recordNote(record)" class="record-row__note">{{ recordNote(record) }}</small>
        </div>
        <div class="cb-cluster">
          <BaseButton size="sm" variant="outline" @click="router.push(`/events/${record.slug}`)">查看活动详情</BaseButton>
          <BaseButton v-if="record.registrationStatus === 'registered'" size="sm" variant="ghost" @click="cancel(record)">取消报名</BaseButton>
          <BaseButton v-else-if="record.registrationStatus === 'cancelled'" size="sm" @click="registerAgain(record)">重新报名</BaseButton>
        </div>
      </article>
      <EmptyState v-if="!eventsStore.registrations.length" title="暂无活动报名" action-label="浏览活动" @action="router.push('/events')" />
    </div>
  </div>
</template>

<style scoped>
.record-row__note {
  display: block;
  margin-top: var(--cb-space-2);
  color: var(--cb-text-muted);
  overflow-wrap: anywhere;
}
</style>
