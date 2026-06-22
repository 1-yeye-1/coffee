<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { resolveUploadUrl, uploadCommunityMedia } from '@/api/upload'
import { BaseButton, BaseInput, BaseSelect, BaseTextarea } from '@/components/base'
import { useCommunityStore } from '@/stores/community'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const communityStore = useCommunityStore()
const title = ref('')
const content = ref('')
const topic = ref('阅读笔记')
const error = ref('')
const mediaFile = ref(null)
const mediaUploading = ref(false)
const uploadedMedia = ref(null)
const mediaInput = ref(null)
const topics = ['阅读笔记', '咖啡风味', '城市空间', '阅读方法', '生活灵感'].map((item) => ({ label: item, value: item }))

onMounted(() => {
  communityStore.fetchPosts()
})

async function publish() {
  if (title.value.trim().length < 4 || content.value.trim().length < 10) {
    error.value = '标题至少 4 个字，正文至少 10 个字。'
    return
  }
  const post = await communityStore.createPost({
    title: title.value,
    content: content.value,
    topic: topic.value,
    mediaUrl: uploadedMedia.value?.url || '',
    mediaType: uploadedMedia.value?.file?.fileType || '',
  })
  sessionStorage.setItem('coffee-book:new-post', String(post.id))
  router.push({ path: '/community', query: { new: String(post.id) } })
}

function validateMedia(file) {
  if (!file) return '请选择要上传的图片或视频。'
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  if (imageTypes.includes(file.type)) {
    return file.size > 5 * 1024 * 1024 ? '社区图片不能超过 5MB。' : ''
  }
  if (videoTypes.includes(file.type)) {
    return file.size > 50 * 1024 * 1024 ? '社区视频不能超过 50MB。' : ''
  }
  return '仅支持 jpg、jpeg、png、webp、gif、mp4、webm、mov 文件。'
}

async function selectMedia(event) {
  const file = event.target.files?.[0]
  const message = validateMedia(file)
  if (message) {
    error.value = message
    mediaFile.value = null
    uploadedMedia.value = null
    return
  }
  mediaFile.value = file
  uploadedMedia.value = null
  error.value = ''
  mediaUploading.value = true
  try {
    const response = await uploadCommunityMedia(file)
    uploadedMedia.value = response.data
  } catch (err) {
    error.value = err.message
  } finally {
    mediaUploading.value = false
  }
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
        <div class="upload-placeholder media-uploader">
          <div>
            <strong>上传图片或视频</strong>
            <p>支持 jpg、jpeg、png、webp、gif、mp4、webm、mov。图片最大 5MB，视频最大 50MB。</p>
          </div>
          <input ref="mediaInput" class="media-input" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" @change="selectMedia" />
          <BaseButton type="button" variant="outline" :loading="mediaUploading" @click="mediaInput?.click()">选择并上传</BaseButton>
        </div>
        <div v-if="uploadedMedia" class="media-preview">
          <img v-if="uploadedMedia.file.fileType === 'image'" :src="resolveUploadUrl(uploadedMedia.url)" alt="帖子图片预览" decoding="async" />
          <video v-else controls :src="resolveUploadUrl(uploadedMedia.url)">当前浏览器不支持视频预览。</video>
        </div>
        <p class="policy-hint">
          发布即表示你同意遵守
          <RouterLink to="/terms">服务条款</RouterLink>
          和
          <RouterLink to="/privacy">隐私政策</RouterLink>
          ，并确认内容符合社区发布规范。
        </p>
        <p v-if="error" class="is-error" role="alert">{{ error }}</p>
        <BaseButton size="lg" @click="publish">发布帖子</BaseButton>
      </section>
    </main>
  </div>
</template>

<style scoped>
.media-uploader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-4);
}

.media-input {
  display: none;
}

.media-preview {
  overflow: hidden;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
}

.media-preview img,
.media-preview video {
  display: block;
  width: 100%;
  max-height: 24rem;
  object-fit: cover;
}

.policy-hint {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
  line-height: var(--cb-line-relaxed);
}

.policy-hint a {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}

@media (max-width: 42rem) {
  .media-uploader {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
