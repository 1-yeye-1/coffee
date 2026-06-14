<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard, BaseTabs } from '@/components/base'
import { useEventsStore } from '@/stores/events'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const eventsStore = useEventsStore()
const category = ref('全部')
const view = ref('list')
const categories = ['全部', '读书会', '咖啡课', '文化沙龙', '创意工作坊', '亲子阅读'].map((item) => ({ label: item, value: item }))
const visibleEvents = computed(() =>
  category.value === '全部' ? eventsStore.items : eventsStore.items.filter((event) => event.category === category.value),
)
onMounted(() => {
  eventsStore.fetchEvents()
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <section class="engagement-hero">
      <div class="cb-container engagement-hero__grid">
        <div class="engagement-hero__copy">
          <BaseBadge variant="premium">Coffee Book Events</BaseBadge>
          <h1 class="page-title">活动中心</h1>
          <p class="page-subtitle">让阅读、咖啡与城市文化，在真实的相遇中继续生长。</p>
        </div>
        <div class="engagement-hero__art"><strong>Meet, read and create together.</strong></div>
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
          <BaseCard v-for="event in visibleEvents" :key="event.id" class="event-card" variant="hover">
            <div class="event-card__visual">
              <span>{{ event.category }}</span>
              <strong>{{ event.date.slice(5).replace('-', '.') }}</strong>
            </div>
            <div class="event-card__meta">
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
            <BaseButton variant="outline" @click="router.push(`/events/${event.slug}`)">查看活动</BaseButton>
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
