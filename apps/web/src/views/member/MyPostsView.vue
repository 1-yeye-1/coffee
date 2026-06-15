<script setup>
import { onMounted, ref } from 'vue'

import { getMyPosts } from '@/api/account'
import { BaseBadge, BaseTable } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const posts = ref([])
const error = ref('')
const columns = [
  { key: 'title', label: '标题' },
  { key: 'topic', label: '话题' },
  { key: 'status', label: '状态' },
  { key: 'likes', label: '点赞' },
  { key: 'commentsCount', label: '评论' },
  { key: 'createdAt', label: '时间' },
]
const statusText = { pending: '待审核', published: '已发布', rejected: '未通过' }

onMounted(async () => {
  try {
    posts.value = (await getMyPosts()).data
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Posts</span>
      <h2 class="page-title">我的帖子</h2>
      <p class="page-subtitle">仅展示当前登录用户发布的社区帖子。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <BaseTable :columns="columns" :items="posts" empty-text="暂无帖子">
      <template #cell-status="{ value }">
        <BaseBadge :variant="value === 'published' ? 'success' : 'neutral'">{{ statusText[value] || value }}</BaseBadge>
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
    </BaseTable>
  </div>
</template>
