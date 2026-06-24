<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getMyPosts } from '@/api/account'
import { deletePost } from '@/api/community'
import { BaseBadge, BaseButton, BaseTable, ErrorPanel } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const posts = ref([])
const error = ref('')
const deletingId = ref(null)
const columns = [
  { key: 'title', label: '标题' },
  { key: 'topic', label: '话题' },
  { key: 'status', label: '状态' },
  { key: 'likes', label: '点赞' },
  { key: 'commentsCount', label: '评论' },
  { key: 'createdAt', label: '时间' },
  { key: 'actions', label: '操作' },
]
const statusText = { pending: '待审核', published: '已发布', rejected: '已拒绝', reported: '举报待复核', hidden: '已隐藏' }

async function load() {
  error.value = ''
  try {
    posts.value = (await getMyPosts()).data
  } catch (err) {
    error.value = err.message
  }
}

async function deletePostItem(post) {
  if (!confirm(`确认删除帖子《${post.title}》？`)) return
  deletingId.value = post.id
  try {
    await deletePost(post.id)
    posts.value = posts.value.filter((item) => item.id !== post.id)
  } catch (err) {
    error.value = err.message || '删除失败'
  } finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Posts</span>
      <h2 class="page-title">我的帖子</h2>
      <p class="page-subtitle">仅展示当前登录用户发布的社区帖子。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <BaseTable :columns="columns" :items="posts" empty-text="暂无帖子">
      <template #cell-title="{ item }">
        <button class="post-title-link" type="button" @click="router.push(`/community/${item.slug || item.id}`)">{{ item.title }}</button>
      </template>
      <template #cell-status="{ value }">
        <BaseBadge :variant="value === 'published' ? 'success' : 'neutral'">{{ statusText[value] || value }}</BaseBadge>
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-actions="{ item }">
        <BaseButton size="sm" variant="outline" @click="router.push(`/community/${item.slug || item.id}`)">查看</BaseButton>
        <BaseButton size="sm" variant="danger" :loading="deletingId === item.id" @click="deletePostItem(item)">删除</BaseButton>
      </template>
    </BaseTable>
  </div>
</template>
