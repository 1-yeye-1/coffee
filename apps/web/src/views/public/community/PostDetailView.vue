<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, BaseTextarea, BaseToast, EmptyState } from '@/components/base'
import { useCommunityStore } from '@/stores/community'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const communityStore = useCommunityStore()
const comment = ref('')
const toastVisible = ref(false)
const postParam = computed(() => route.params.slug || route.params.id)
const post = computed(() => communityStore.getPostBySlug(postParam.value))
const related = computed(() => communityStore.posts.filter((item) => item.id !== post.value?.id).slice(0, 3))
const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

async function submitComment() {
  if (!comment.value.trim()) return
  await communityStore.addComment(post.value.id, comment.value)
  comment.value = ''
  toastVisible.value = false
  nextTick(() => { toastVisible.value = true })
}
onMounted(() => {
  communityStore.fetchPostDetail(postParam.value)
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton class="detail-back" variant="ghost" size="sm" @click="router.push('/community')">← 返回社区</BaseButton>
      <template v-if="post">
        <div class="engagement-layout">
          <article class="detail-panel post-article">
            <div class="post-card__author"><span class="avatar">{{ post.avatar }}</span><div><strong>{{ post.author }}</strong><small>{{ formatDate(post.createdAt) }}</small></div></div>
            <div><BaseBadge variant="neutral">{{ post.topic }}</BaseBadge><h1 class="page-title">{{ post.title }}</h1></div>
            <div v-if="post.mediaUrl" class="post-media">
              <img v-if="post.mediaType === 'image'" :src="resolveUploadUrl(post.mediaUrl)" alt="帖子图片" />
              <video v-else controls :src="resolveUploadUrl(post.mediaUrl)">当前浏览器不支持视频预览。</video>
            </div>
            <p class="post-article__body">{{ post.content }}</p>
            <div class="post-actions">
              <BaseButton size="sm" :variant="communityStore.likedIds.includes(post.id) ? 'primary' : 'outline'" @click="communityStore.toggleLike(post.id)">点赞 {{ post.likes }}</BaseButton>
              <BaseButton size="sm" :variant="communityStore.favoriteIds.includes(post.id) ? 'secondary' : 'outline'" @click="communityStore.toggleFavorite(post.id)">收藏</BaseButton>
            </div>
          </article>
          <aside class="side-panel"><h2 class="section-title">相关推荐</h2><div class="record-list"><button v-for="item in related" :key="item.id" class="choice-chip" type="button" @click="router.push(`/community/${item.slug}`)">{{ item.title }}</button></div></aside>
        </div>

        <section class="detail-panel section-block">
          <h2 class="section-title">评论 {{ post.comments.length }}</h2>
          <div class="comment-list"><div v-for="item in post.comments" :key="item.id" class="comment"><span class="avatar">{{ item.author.slice(0, 1) }}</span><div class="comment__body"><strong>{{ item.author }}</strong><small>{{ formatDate(item.createdAt) }}</small><p>{{ item.content }}</p></div></div></div>
          <BaseTextarea v-model="comment" label="发表评论" placeholder="写下你的想法……" :maxlength="300" show-count />
          <BaseButton :disabled="!comment.trim()" @click="submitComment">发表评论</BaseButton>
        </section>
      </template>
      <EmptyState v-else title="未找到该帖子" description="帖子可能已被删除，或链接地址不正确。" action-label="返回社区" @action="router.push('/community')"><template #icon>◇</template></EmptyState>
    </main>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="评论成功">你的评论已保存到本地社区。</BaseToast></div>
  </div>
</template>

<style scoped>
.post-media {
  overflow: hidden;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-soft);
}

.post-media img,
.post-media video {
  display: block;
  width: 100%;
  max-height: 28rem;
  object-fit: cover;
}
</style>
