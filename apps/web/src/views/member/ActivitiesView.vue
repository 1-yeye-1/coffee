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
async function load() {
  loading.value = true
  error.value = ''
  try { await eventsStore.fetchRegistrations() }
  catch (err) { error.value = err.message || '活动报名记录加载失败。' }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template><div class="member-page"><header><span class="section-eyebrow">Activities</span><h2 class="page-title">活动报名记录</h2></header><ErrorPanel v-if="error" :message="error" @retry="load" /><BaseSkeleton v-else-if="loading" variant="card" /><div v-else class="record-list"><article v-for="record in eventsStore.registrations" :key="record.registrationId" class="record-row"><div><div class="record-row__header"><strong>{{ record.title }}</strong><BaseBadge :variant="record.registrationStatus === 'registered' ? 'success' : 'neutral'">{{ record.registrationStatus === 'registered' ? '已报名' : '已取消' }}</BaseBadge></div><p>{{ record.date }} {{ record.time }}</p><small>{{ record.location }}</small></div><div class="cb-cluster"><BaseButton size="sm" variant="outline" @click="router.push(`/events/${record.slug}`)">查看活动详情</BaseButton><BaseButton v-if="record.registrationStatus === 'registered'" size="sm" variant="ghost" @click="eventsStore.cancelRegistration(record.eventId)">取消报名</BaseButton><BaseButton v-else size="sm" @click="eventsStore.register(record)">重新报名</BaseButton></div></article><EmptyState v-if="!eventsStore.registrations.length" title="暂无活动报名" action-label="浏览活动" @action="router.push('/events')" /></div></div></template>
