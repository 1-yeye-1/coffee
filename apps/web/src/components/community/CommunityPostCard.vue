<script setup>
import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, BaseCard } from '@/components/base'

defineProps({
  post: { type: Object, required: true },
  liked: Boolean,
  favorite: Boolean,
})

defineEmits(['open', 'like', 'comment', 'favorite'])

const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
const isAvatarImage = (value) => /^(https?:\/\/|data:|blob:|\/uploads\/)/.test(String(value || ''))
function handleImageError(event) {
  event.currentTarget.hidden = true
}
</script>

<template>
  <BaseCard class="post-card post-card--clickable" variant="hover" role="link" tabindex="0" data-cursor="VIEW" :data-post-id="post.id" @click="$emit('open')" @keydown.enter="$emit('open')" @keydown.space.prevent="$emit('open')">
    <div class="post-card__author"><span class="avatar"><img v-if="isAvatarImage(post.avatar)" :src="resolveUploadUrl(post.avatar)" alt="" loading="lazy" decoding="async" @error="handleImageError" /><template v-else>{{ post.avatar }}</template></span><div><strong>{{ post.author }}</strong><small>{{ formatDate(post.createdAt) }} · {{ post.topic }}</small></div></div>
    <div v-if="post.mediaUrl" class="post-media" data-tilt-card data-tilt-layer="0.8">
      <img v-if="post.mediaType === 'image'" :src="resolveUploadUrl(post.mediaUrl)" alt="帖子图片" loading="lazy" decoding="async" @error="handleImageError" />
      <video v-else controls preload="metadata" :src="resolveUploadUrl(post.mediaUrl)" @click.stop>当前浏览器不支持视频预览。</video>
    </div>
    <div><BaseBadge class="post-topic-badge" variant="neutral">{{ post.topic }}</BaseBadge><h2>{{ post.title }}</h2><p>{{ post.excerpt }}</p></div>
    <div class="post-actions" @click.stop>
      <BaseButton size="sm" :class="{ 'is-liked': liked }" :variant="liked ? 'primary' : 'ghost'" @click.stop="$emit('like', $event)">赞 <span class="like-count">{{ post.likes }}</span></BaseButton>
      <BaseButton size="sm" variant="ghost" @click.stop="$emit('comment', $event)">评论 {{ post.comments?.length || post.commentsCount || 0 }}</BaseButton>
      <BaseButton size="sm" :variant="favorite ? 'secondary' : 'ghost'" @click.stop="$emit('favorite', $event)">收藏</BaseButton>
    </div>
  </BaseCard>
</template>

<style scoped>
.post-card--clickable{cursor:pointer;transition:border-color var(--cb-duration-normal),box-shadow var(--cb-duration-normal),background var(--cb-duration-normal)}.post-card--clickable.is-new-post{background:color-mix(in srgb,var(--cb-color-gold) 12%,var(--cb-bg-surface));border-color:var(--cb-color-gold);box-shadow:var(--cb-shadow-glow)}.post-media{overflow:hidden;aspect-ratio:16/10;border-radius:var(--cb-radius-lg);background:linear-gradient(135deg,var(--cb-bg-soft),color-mix(in srgb,var(--cb-color-gold) 16%,var(--cb-bg-surface)))}
.post-media img,.post-media video{display:block;width:100%;max-height:14rem;object-fit:cover}
.avatar{overflow:hidden}.avatar img{width:100%;height:100%;object-fit:cover;border-radius:inherit}
</style>
