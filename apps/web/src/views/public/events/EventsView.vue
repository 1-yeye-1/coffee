<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resolveUploadUrl } from '@/api/upload'

import { BaseBadge, BaseButton, BaseCard, BaseTabs } from '@/components/base'
import { useEventsStore } from '@/stores/events'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useTiltCard } from '@/composables/useTiltCard'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const eventsStore = useEventsStore()
const category = ref('全部')
const view = ref('list')
const pageRef = ref(null)
const { revealCards, revealTab } = useGsapReveal(pageRef)
const { bindTiltCards } = useTiltCard(pageRef)
const categories = ['全部', '读书会', '咖啡课', '文化沙龙', '创意工作坊', '亲子阅读'].map((item) => ({ label: item, value: item }))
const visibleEvents = computed(() =>
  category.value === '全部' ? eventsStore.items : eventsStore.items.filter((event) => event.category === category.value),
)
onMounted(() => {
  eventsStore.fetchEvents()
})
watch([visibleEvents, view], async () => {
  await nextTick()
  revealCards('.event-card', { key: 'events', limit: 20 })
  bindTiltCards()
  revealTab('.event-grid,.event-timeline')
}, { flush: 'post' })
</script>

<template>
  <div ref="pageRef" class="engagement-page cb-fade-in">
    <section class="engagement-hero">
      <div class="cb-container engagement-hero__grid">
        <div class="engagement-hero__copy">
          <BaseBadge variant="premium">Coffee Book 活动</BaseBadge>
          <h1 class="page-title">活动中心</h1>
          <p class="page-subtitle">让阅读、咖啡与城市文化，在真实的相遇中继续生长。</p>
        </div>
        <div class="engagement-hero__art"><strong>一起相遇、阅读和创造。</strong></div>
      </div>
    </section>

    <main class="cb-container engagement-content">
      <section class="metric-grid" aria-label="活动统计">
        <div class="metric-card"><strong>{{ eventsStore.items.length }}</strong><span>近期活动</span></div>
        <div class="metric-card"><strong>{{ eventsStore.items.reduce((sum, item) => sum + item.attendees, 0) }}</strong><span>已报名人次</span></div>
        <div class="metric-card"><strong>{{ eventsStore.registrations.filter((item) => item.status === 'registered').length }}</strong><span>我的报名</span></div>
        <div class="metric-card"><strong>3</strong><span>活动空间</span></div>
      </section>

      <section class="section-block">
        <div class="section-block__header">
          <BaseTabs v-model="category" :tabs="categories" />
          <div class="cb-cluster">
            <BaseButton size="sm" :variant="view === 'list' ? 'primary' : 'ghost'" @click="view = 'list'">列表</BaseButton>
            <BaseButton size="sm" :variant="view === 'calendar' ? 'primary' : 'ghost'" @click="view = 'calendar'">日历</BaseButton>
          </div>
        </div>

        <div v-if="view === 'list'" class="event-grid">
          <BaseCard v-for="event in visibleEvents" :key="event.id" class="event-card" variant="interactive" data-cursor="JOIN" data-tilt-card @click="router.push(`/events/${event.slug}`)">
            <div class="event-card__visual" data-tilt-layer="1.3">
              <img v-if="event.coverUrl" class="event-card__image" :src="resolveUploadUrl(event.coverUrl)" :alt="event.title" loading="lazy" decoding="async" />
              <template v-else><span>{{ event.category }}</span><strong>{{ event.date.slice(5).replace('-', '.') }}</strong></template>
            </div>
            <div class="event-card__meta" data-tilt-layer="0.65">
              <BaseBadge variant="neutral">{{ event.category }}</BaseBadge>
              <BaseBadge :variant="event.attendees >= event.capacity - 2 ? 'warning' : 'success'">{{ event.status }}</BaseBadge>
            </div>
            <h2>{{ event.title }}</h2>
            <p>{{ event.summary }}</p>
            <div class="event-card__facts">
              <div><span>时间</span><strong>{{ event.date }} {{ event.time }}</strong></div>
              <div><span>地点</span><strong>{{ event.location.split(' · ')[0] }}</strong></div>
              <div><span>人数</span><strong>{{ event.attendees }} / {{ event.capacity }}</strong></div>
            </div>
            <BaseButton variant="outline" @click.stop="router.push(`/events/${event.slug}`)">查看活动</BaseButton>
          </BaseCard>
        </div>

        <div v-else class="detail-panel calendar-list">
          <div v-for="event in visibleEvents" :key="event.id" class="calendar-item">
            <div><strong>{{ event.date }}</strong><p>{{ event.title }}</p></div>
            <span>{{ event.time }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.event-card__image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
</style>
