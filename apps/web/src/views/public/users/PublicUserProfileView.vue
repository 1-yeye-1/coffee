<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getPublicProfile } from '@/api/account'
import { resolveUploadUrl } from '@/api/upload'
import { BaseButton, EmptyState } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const profile = ref(null)
const error = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  profile.value = null
  try {
    profile.value = (await getPublicProfile(route.params.id)).data
  } catch (err) {
    error.value = err.message || '该用户已关闭个人主页访问'
  } finally {
    loading.value = false
  }
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton variant="ghost" size="sm" @click="router.back()">返回</BaseButton>

      <section v-if="loading" class="detail-panel">
        <p class="text-muted">正在加载个人主页...</p>
      </section>

      <EmptyState
        v-else-if="error"
        title="隐私保护"
        :description="error"
        action-label="返回社区"
        @action="router.push('/community')"
      >
        <template #icon>!</template>
      </EmptyState>

      <template v-else-if="profile">
        <section class="detail-panel public-profile">
          <img v-if="profile.avatar" :src="resolveUploadUrl(profile.avatar)" alt="用户头像" decoding="async" />
          <span v-else class="avatar">{{ (profile.nickname || '用').slice(0, 1) }}</span>
          <div>
            <h1 class="page-title">{{ profile.nickname }}</h1>
            <p class="text-muted">加入于 {{ formatDate(profile.createdAt) }}</p>
            <p v-if="profile.bio">{{ profile.bio }}</p>
          </div>
          <div class="public-profile__stats">
            <span><strong>{{ profile.postsCount }}</strong> 篇帖子</span>
            <span><strong>{{ profile.likesCount }}</strong> 次获赞</span>
          </div>
        </section>

        <section class="detail-panel section-block">
          <h2 class="section-title">公开帖子</h2>
          <div v-if="profile.posts?.length" class="record-list">
            <button
              v-for="item in profile.posts"
              :key="item.id"
              class="choice-chip"
              type="button"
              @click="router.push(`/community/${item.slug}`)"
            >
              {{ item.title }}
            </button>
          </div>
          <p v-else class="text-muted">暂时没有公开帖子。</p>
        </section>

        <section v-if="profile.comments?.length" class="detail-panel section-block">
          <h2 class="section-title">近期评论</h2>
          <div class="record-list">
            <button
              v-for="item in profile.comments"
              :key="`c-${item.id}`"
              class="choice-chip"
              type="button"
              @click="router.push(`/community/${item.postSlug}`)"
            >
              {{ item.postTitle || `帖子 #${item.postId}` }}：{{ item.content.slice(0, 60) }}{{ item.content.length > 60 ? '...' : '' }}
            </button>
          </div>
        </section>

        <section v-if="profile.reviews?.length" class="detail-panel section-block">
          <h2 class="section-title">图书评价</h2>
          <div class="record-list">
            <button
              v-for="item in profile.reviews"
              :key="`r-${item.id}`"
              class="choice-chip"
              type="button"
              @click="router.push(`/books/${item.bookSlug || item.bookId}`)"
            >
              {{ item.bookTitle || `#${item.bookId}` }} · {{ '★'.repeat(item.rating || 5) }}：{{ item.content.slice(0, 60) }}{{ item.content.length > 60 ? '...' : '' }}
            </button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.public-profile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--cb-space-4);
  align-items: center;
}
.public-profile img {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: cover;
  border-radius: var(--cb-radius-2xl);
}
.public-profile__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  color: var(--cb-text-secondary);
}
.public-profile__stats strong {
  color: var(--cb-color-coffee);
}
@media (max-width: 42rem) {
  .public-profile {
    grid-template-columns: 1fr;
  }
}
</style>
