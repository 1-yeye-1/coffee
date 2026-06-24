<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resolveUploadUrl } from '@/api/upload'

import { BaseBadge, BaseButton, BaseCard, BaseSkeleton, BaseTabs, EmptyState, ErrorPanel } from '@/components/base'
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
function handleImageError(event) {
  event.currentTarget.hidden = true
}
function eventTarget(event) {
  return `/events/${event.slug || event.id}`
}
function openEvent(event) {
  router.push(eventTarget(event))
}
onMounted(() => {
  eventsStore.fetchEvents()
  eventsStore.fetchRegistrations()
})
watch([visibleEvents, view], async () => {
  if (eventsStore.loading) return
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
        <div class="metric-card metric-card--link" role="button" tabindex="0" @click="router.push('/account/activities')" @keydown.enter="router.push('/account/activities')"><strong>{{ eventsStore.registrations.filter((item) => item.status === 'registered').length }}</strong><span>我的报名</span></div>
        <div class="metric-card"><strong>3</strong><span>活动空间</span></div>
      </section>

      <section class="section-block">
        <ErrorPanel v-if="eventsStore.apiError" title="活动加载失败" :message="eventsStore.apiError" @retry="eventsStore.fetchEvents" />
        <div class="section-block__header">
          <BaseTabs v-model="category" variant="events" aria-label="活动分类" :tabs="categories" />
          <div class="cb-cluster">
            <BaseButton size="sm" :variant="view === 'list' ? 'primary' : 'ghost'" @click="view = 'list'">列表</BaseButton>
            <BaseButton size="sm" :variant="view === 'calendar' ? 'primary' : 'ghost'" @click="view = 'calendar'">日历</BaseButton>
          </div>
        </div>

        <div v-if="view === 'list'" class="event-grid">
          <BaseSkeleton v-if="eventsStore.loading" v-for="index in 6" :key="`event-loading-${index}`" variant="card" />
          <BaseCard v-for="event in visibleEvents" :key="event.id" class="event-card" variant="interactive" data-cursor="JOIN" data-tilt-card @click="openEvent(event)">
            <div class="event-card__visual" data-tilt-layer="1.3">
              <img v-if="event.coverUrl" class="event-card__image" :src="resolveUploadUrl(event.coverUrl)" :alt="event.title" loading="lazy" decoding="async" @error="handleImageError" />
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
            <BaseButton variant="outline" @click.stop="openEvent(event)">查看活动</BaseButton>
          </BaseCard>
          <EmptyState v-if="!eventsStore.loading && !eventsStore.apiError && !visibleEvents.length" title="暂无匹配活动" description="当前分类暂时没有活动，请查看其他分类。" action-label="查看全部活动" @action="category = '全部'" />
        </div>

        <div v-else class="detail-panel calendar-list">
          <div
            v-for="event in visibleEvents"
            :key="event.id"
            class="calendar-item"
            role="button"
            tabindex="0"
            data-cursor="VIEW"
            @click="openEvent(event)"
            @keydown.enter.prevent="openEvent(event)"
            @keydown.space.prevent="openEvent(event)"
          >
            <div><strong>{{ event.date }}</strong><p>{{ event.title }}</p></div>
            <span>{{ event.time }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.event-card__visual { aspect-ratio: 16 / 10; background: linear-gradient(135deg, var(--cb-bg-soft), color-mix(in srgb, var(--cb-color-gold) 18%, var(--cb-bg-surface))); }
.event-card__image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.calendar-item {
  cursor: pointer;
  transition: border-color var(--cb-duration-fast) var(--cb-ease-standard), box-shadow var(--cb-duration-fast) var(--cb-ease-standard), transform var(--cb-duration-fast) var(--cb-ease-standard);
}
.calendar-item:hover,
.calendar-item:focus-visible {
  border-color: color-mix(in srgb, var(--cb-color-gold) 54%, var(--cb-border-soft));
  box-shadow: var(--cb-shadow-hover);
  outline: 0;
  transform: translateY(-0.125rem);
}
</style>
