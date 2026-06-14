<script setup>
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, EmptyState } from '@/components/base'
import { useEventsStore } from '@/stores/events'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const eventsStore = useEventsStore()
</script>

<template>
  <div class="member-page">
    <header><span class="section-eyebrow">Activities</span><h2 class="page-title">活动报名记录</h2></header>
    <div class="record-list"><article v-for="record in eventsStore.registrations" :key="record.id" class="record-row"><div><div class="record-row__header"><strong>{{ record.title }}</strong><BaseBadge :variant="record.status === 'registered' ? 'success' : 'neutral'">{{ record.status === 'registered' ? '已报名' : '已取消' }}</BaseBadge></div><p>{{ record.date }} {{ record.time }}</p><small>{{ record.location }}</small></div><div class="cb-cluster"><BaseButton size="sm" variant="outline" @click="router.push(`/events/${record.eventSlug}`)">查看活动详情</BaseButton><BaseButton v-if="record.status === 'registered'" size="sm" variant="ghost" @click="eventsStore.cancelRegistration(record.id)">取消报名</BaseButton></div></article><EmptyState v-if="!eventsStore.registrations.length" title="暂无活动报名" description="去活动中心发现近期的文化活动。" action-label="浏览活动" @action="router.push('/events')"><template #icon>◇</template></EmptyState></div>
  </div>
</template>
