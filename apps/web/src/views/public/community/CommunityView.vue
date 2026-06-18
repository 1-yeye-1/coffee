<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, BaseCard, BaseTabs } from '@/components/base'
import { useCommunityStore } from '@/stores/community'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const communityStore = useCommunityStore()
const feed = ref('hot')
const tabs = [{ label: '热门帖子', value: 'hot' }, { label: '最新帖子', value: 'latest' }]
const visiblePosts = computed(() => [...communityStore.posts].sort((a, b) =>
  feed.value === 'hot' ? b.likes - a.likes : new Date(b.createdAt) - new Date(a.createdAt),
))
const topics = ['阅读笔记', '咖啡风味', '城市空间', '阅读方法', '生活灵感']
const users = [
  { name: '林间页', avatar: '林', posts: 36 },
  { name: '清烘时刻', avatar: '清', posts: 28 },
  { name: '城市慢读', avatar: '城', posts: 24 },
]
const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
onMounted(() => {
  communityStore.fetchPosts()
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <section class="engagement-hero">
      <div class="cb-container engagement-hero__grid">
        <div class="engagement-hero__copy">
          <BaseBadge variant="premium">Coffee Book 社区</BaseBadge>
          <h1 class="page-title">社区</h1>
          <p class="page-subtitle">分享正在阅读的书、杯中的风味，以及城市里值得停留的角落。</p>
          <BaseButton @click="router.push('/community/create')">发布帖子</BaseButton>
        </div>
        <div class="engagement-hero__art"><strong>故事因为分享而更有温度。</strong></div>
      </div>
    </section>

    <main class="cb-container engagement-content engagement-layout">
      <section>
        <BaseTabs v-model="feed" :tabs="tabs" />
        <div class="post-grid">
          <BaseCard v-for="post in visiblePosts" :key="post.id" class="post-card post-card--clickable" variant="hover" role="link" tabindex="0" @click="router.push(`/community/${post.slug}`)" @keydown.enter="router.push(`/community/${post.slug}`)">
            <div class="post-card__author"><span class="avatar">{{ post.avatar }}</span><div><strong>{{ post.author }}</strong><small>{{ formatDate(post.createdAt) }} · {{ post.topic }}</small></div></div>
            <div v-if="post.mediaUrl" class="post-media">
              <img v-if="post.mediaType === 'image'" :src="resolveUploadUrl(post.mediaUrl)" alt="帖子图片" />
              <video v-else controls :src="resolveUploadUrl(post.mediaUrl)" @click.stop>当前浏览器不支持视频预览。</video>
            </div>
            <div><BaseBadge variant="neutral">{{ post.topic }}</BaseBadge><h2>{{ post.title }}</h2><p>{{ post.excerpt }}</p></div>
            <div class="post-actions" @click.stop>
              <BaseButton size="sm" :variant="communityStore.likedIds.includes(post.id) ? 'primary' : 'ghost'" @click.stop="communityStore.toggleLike(post.id)">赞 {{ post.likes }}</BaseButton>
              <BaseButton size="sm" variant="ghost" @click.stop="router.push(`/community/${post.slug}`)">评论 {{ post.comments.length }}</BaseButton>
              <BaseButton size="sm" :variant="communityStore.favoriteIds.includes(post.id) ? 'secondary' : 'ghost'" @click.stop="communityStore.toggleFavorite(post.id)">收藏</BaseButton>
            </div>
          </BaseCard>
        </div>
      </section>

      <aside class="side-panel">
        <h2 class="section-title">热门话题</h2>
        <div class="topic-cloud"><span v-for="topic in topics" :key="topic"># {{ topic }}</span></div>
        <h2 class="section-title section-block">活跃用户</h2>
        <div class="user-grid"><div v-for="user in users" :key="user.name" class="user-card"><span class="avatar">{{ user.avatar }}</span><div><strong>{{ user.name }}</strong><p>{{ user.posts }} 篇分享</p></div></div></div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.post-media {
  overflow: hidden;
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}
.post-card--clickable { cursor:pointer; transition:transform var(--cb-duration-fast) var(--cb-ease-standard),box-shadow var(--cb-duration-fast) var(--cb-ease-standard); }
.post-card--clickable:hover { transform:translateY(-2px); }

.post-media img,
.post-media video {
  display: block;
  width: 100%;
  max-height: 14rem;
  object-fit: cover;
}
</style>
