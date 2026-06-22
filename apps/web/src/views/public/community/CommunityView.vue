<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseTabs } from '@/components/base'
import CommunityPostCard from '@/components/community/CommunityPostCard.vue'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useCommunityMotion } from '@/composables/useCommunityMotion'
import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useTiltCard } from '@/composables/useTiltCard'
import { useAuthStore } from '@/stores/auth'
import { useCommunityStore } from '@/stores/community'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const communityStore = useCommunityStore()
const authStore = useAuthStore()
const feed = ref('hot')
const pageRef = ref(null)
const { revealCards } = useGsapReveal(pageRef)
const { animateCounts } = useGsapNumber()
const { likeParticle, bookmarkFlight, highlightPost } = useCommunityMotion(pageRef)
const { wiggleIcon, floatEmpty } = useAnimeMotion()
const { bindTiltCards } = useTiltCard(pageRef, { maximum: 3 })
const tabs = [{ label: '热门帖子', value: 'hot' }, { label: '最新帖子', value: 'latest' }]
const newPostId = computed(() => String(route.query.new || sessionStorage.getItem('coffee-book:new-post') || ''))
const visiblePosts = computed(() => [...communityStore.posts].sort((a, b) => {
  if (String(a.id) === newPostId.value) return -1
  if (String(b.id) === newPostId.value) return 1
  return feed.value === 'hot' ? b.likes - a.likes : new Date(b.createdAt) - new Date(a.createdAt)
}))
const topics = ['阅读笔记', '咖啡风味', '城市空间', '阅读方法', '生活灵感']
const users = computed(() => Object.values(communityStore.posts.reduce((items, post) => {
  const key = post.userId || post.author
  if (!items[key]) items[key] = { name: post.author, avatar: post.avatar || post.author?.slice(0, 1), posts: 0 }
  items[key].posts += 1
  return items
}, {})).sort((a, b) => b.posts - a.posts).slice(0, 3))
const todayKey = new Date().toDateString()
const todayPosts = computed(() => communityStore.posts.filter((post) => new Date(post.createdAt).toDateString() === todayKey).length)
const todayComments = computed(() => communityStore.posts.reduce((total, post) => total + (post.comments || []).filter((comment) => new Date(comment.createdAt).toDateString() === todayKey).length, 0))
const hotAuthor = computed(() => users.value[0]?.name || '等待你的分享')

async function toggleFavorite(post, event) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: `/community/${post.slug}` } })
  await communityStore.toggleFavorite(post.id)
  bookmarkFlight(event?.currentTarget, document.querySelector('.user-menu__trigger'))
}

async function toggleLike(post, event) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: `/community/${post.slug}` } })
  const result = await communityStore.toggleLike(post.id)
  if (result?.liked) likeParticle(event?.currentTarget, event?.currentTarget?.querySelector('.like-count'), event?.currentTarget?.closest('.post-card')?.querySelector('.post-topic-badge'))
}

function openComments(post, event) {
  wiggleIcon(event?.currentTarget)
  router.push(`/community/${post.slug}#comments`)
}

async function animateCommunity() {
  await nextTick()
  revealCards('.community-stat', { key: 'community-stats', stagger: 0.06, limit: 3 })
  animateCounts(pageRef.value?.querySelectorAll('[data-community-count]') || [], [todayPosts.value, todayComments.value])
  const newId = route.query.new || sessionStorage.getItem('coffee-book:new-post')
  if (newId) {
    highlightPost(pageRef.value?.querySelector(`[data-post-id="${CSS.escape(String(newId))}"]`))
    sessionStorage.removeItem('coffee-book:new-post')
  }
}

onMounted(async () => {
  if (!communityStore.posts.length) await communityStore.fetchPosts()
  animateCommunity()
})

watch(() => `${feed.value}:${visiblePosts.value.map((post) => post.id).join(',')}`, async () => {
  await nextTick()
  revealCards('.post-card', { key: 'posts', limit: 20 })
  bindTiltCards('.post-media[data-tilt-card]')
  floatEmpty(pageRef.value?.querySelector('.empty-state'))
}, { flush: 'post' })
</script>

<template>
  <div ref="pageRef" class="engagement-page cb-fade-in">
    <section class="engagement-hero">
      <div class="cb-container engagement-hero__grid">
        <div class="engagement-hero__copy"><BaseBadge variant="premium">Coffee Book 社区</BaseBadge><h1 class="page-title">社区</h1><p class="page-subtitle">分享正在阅读的书、杯中的风味，以及城市里值得停留的角落。</p><BaseButton @click="router.push('/community/create')">发布帖子</BaseButton></div>
        <div class="engagement-hero__art"><strong>故事因为分享而更有温度。</strong></div>
      </div>
    </section>

    <section class="cb-container community-stat-grid" aria-label="社区今日统计">
      <article class="community-stat"><span>今日帖子</span><strong data-community-count>{{ todayPosts }}</strong></article>
      <article class="community-stat"><span>今日评论</span><strong data-community-count>{{ todayComments }}</strong></article>
      <article class="community-stat"><span>热门作者</span><strong>{{ hotAuthor }}</strong></article>
    </section>

    <main class="cb-container engagement-content engagement-layout">
      <section>
        <BaseTabs v-model="feed" :tabs="tabs" />
        <div class="post-grid"><CommunityPostCard v-for="post in visiblePosts" :key="post.id" :post="post" :liked="communityStore.likedIds.includes(post.id)" :favorite="communityStore.favoriteIds.includes(post.id)" @open="router.push(`/community/${post.slug}`)" @comment="openComments(post, $event)" @like="toggleLike(post, $event)" @favorite="toggleFavorite(post, $event)" /></div>
        <div v-if="!visiblePosts.length" class="empty-state community-empty"><span aria-hidden="true">◇</span><h2>社区正在等待第一篇分享</h2><p>写下今天的阅读、咖啡或城市片段。</p></div>
      </section>

      <aside class="side-panel"><h2 class="section-title">热门话题</h2><div class="topic-cloud"><span v-for="topic in topics" :key="topic"># {{ topic }}</span></div><h2 class="section-title section-block">活跃用户</h2><div class="user-grid"><div v-for="user in users" :key="user.name" class="user-card"><span class="avatar">{{ user.avatar }}</span><div><strong>{{ user.name }}</strong><p>{{ user.posts }} 篇分享</p></div></div></div></aside>
    </main>
  </div>
</template>

<style scoped>
.community-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--cb-space-3);padding-top:var(--cb-space-6)}.community-stat{display:grid;padding:var(--cb-space-4);gap:var(--cb-space-2);background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-lg);box-shadow:var(--cb-shadow-sm)}.community-stat span{color:var(--cb-text-muted);font-size:var(--cb-font-size-sm)}.community-stat strong{font-size:var(--cb-font-size-2xl)}.community-empty{display:grid;min-height:16rem;place-content:center;text-align:center;animation:gentle-float 3s ease-in-out infinite alternate}.community-empty>span{color:var(--cb-color-gold);font-size:var(--cb-font-size-5xl)}
:global(.community-like-particle),:global(.community-bookmark-flight){position:fixed;z-index:var(--cb-z-toast);color:var(--cb-color-gold);font-weight:var(--cb-font-bold);pointer-events:none;translate:-50% -50%;will-change:transform,opacity}:global(.community-like-particle){color:var(--cb-danger)}
</style>
