<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard, BaseToast, EmptyState } from '@/components/base'
import { useEventsStore } from '@/stores/events'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const toastVisible = ref(false)
const event = computed(() => eventsStore.getEventBySlug(route.params.slug))
const recommendations = computed(() => eventsStore.items.filter((item) => item.id !== event.value?.id).slice(0, 3))

async function register() {
  await eventsStore.register(event.value)
  toastVisible.value = false
  nextTick(() => { toastVisible.value = true })
}
onMounted(() => {
  eventsStore.fetchEventDetail(route.params.slug)
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton class="detail-back" variant="ghost" size="sm" @click="router.push('/events')">← 返回活动中心</BaseButton>
      <template v-if="event">
        <section class="detail-hero-grid">
          <div class="detail-cover"><strong>{{ event.category }} · {{ event.date }}</strong></div>
          <div class="detail-copy">
            <div class="cb-cluster"><BaseBadge variant="neutral">{{ event.category }}</BaseBadge><BaseBadge variant="success">{{ event.status }}</BaseBadge></div>
            <h1>{{ event.title }}</h1>
            <p class="page-subtitle">{{ event.summary }}</p>
            <div class="detail-list">
              <div class="detail-list__row"><span>时间</span><strong>{{ event.date }} {{ event.time }}</strong></div>
              <div class="detail-list__row"><span>地点</span><strong>{{ event.location }}</strong></div>
              <div class="detail-list__row"><span>报名</span><strong>{{ event.attendees }} / {{ event.capacity }} 人</strong></div>
            </div>
            <BaseButton :disabled="eventsStore.isRegistered(event.id)" @click="register">
              {{ eventsStore.isRegistered(event.id) ? '已报名' : '立即报名' }}
            </BaseButton>
          </div>
        </section>

        <div class="engagement-layout section-block">
          <div>
            <section class="detail-panel"><h2 class="section-title">活动介绍</h2><p class="rich-text">{{ event.description }}</p></section>
            <section class="detail-panel section-block"><h2 class="section-title">流程安排</h2><ol class="agenda-list"><li v-for="item in event.agenda" :key="item">{{ item }}</li></ol></section>
          </div>
          <aside class="side-panel">
            <h2 class="section-title">主讲嘉宾</h2>
            <div class="speaker-card"><span class="avatar">{{ event.speaker.name.slice(0, 1) }}</span><div><strong>{{ event.speaker.name }}</strong><p>{{ event.speaker.role }}</p></div></div>
            <p class="text-muted">已有 {{ event.attendees }} 人报名，还剩 {{ event.capacity - event.attendees }} 个名额。</p>
          </aside>
        </div>

        <section class="section-block"><h2 class="section-title">相关推荐</h2><div class="event-grid"><BaseCard v-for="item in recommendations" :key="item.id" class="event-card" variant="hover"><BaseBadge variant="neutral">{{ item.category }}</BaseBadge><h2>{{ item.title }}</h2><p>{{ item.date }} · {{ item.time }}</p><BaseButton size="sm" variant="outline" @click="router.push(`/events/${item.slug}`)">查看活动</BaseButton></BaseCard></div></section>
      </template>
      <EmptyState v-else title="未找到该活动" description="活动可能已经下架，或链接地址不正确。" action-label="返回活动中心" @action="router.push('/events')"><template #icon>◇</template></EmptyState>
    </main>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="报名成功">活动报名已保存，可在会员中心查看。</BaseToast></div>
  </div>
</template>
