<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton, BaseInput, BaseSelect, BaseTextarea } from '@/components/base'
import { useCommunityStore } from '@/stores/community'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const communityStore = useCommunityStore()
const title = ref('')
const content = ref('')
const topic = ref('阅读笔记')
const error = ref('')
const topics = ['阅读笔记', '咖啡风味', '城市空间', '阅读方法', '生活灵感'].map((item) => ({ label: item, value: item }))

onMounted(() => {
  communityStore.fetchPosts()
})

async function publish() {
  if (title.value.trim().length < 4 || content.value.trim().length < 10) {
    error.value = '标题至少 4 个字，正文至少 10 个字。'
    return
  }
  const post = await communityStore.createPost({ title: title.value, content: content.value, topic: topic.value })
  router.push(`/community/${post.slug}`)
}
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton class="detail-back" variant="ghost" size="sm" @click="router.push('/community')">← 返回社区</BaseButton>
      <section class="detail-panel create-form">
        <div><span class="section-eyebrow">Create Post</span><h1 class="page-title">发布帖子</h1><p class="page-subtitle">分享一段真实、清晰、有温度的阅读或咖啡体验。</p></div>
        <BaseInput v-model="title" label="标题" placeholder="为这次分享写一个标题" :error="error && title.trim().length < 4 ? error : ''" />
        <BaseSelect v-model="topic" label="话题" :options="topics" />
        <BaseTextarea v-model="content" label="正文" placeholder="写下你的故事……" :maxlength="2000" show-count :rows="10" />
        <div class="upload-placeholder"><div><strong>图片上传占位</strong><p>本阶段仅展示图片上传区域，不保存真实文件。</p></div></div>
        <p v-if="error" class="is-error" role="alert">{{ error }}</p>
        <BaseButton size="lg" @click="publish">发布帖子</BaseButton>
      </section>
    </main>
  </div>
</template>
