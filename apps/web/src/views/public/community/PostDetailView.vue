<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getPublicProfile } from '@/api/account'
import { resolveUploadUrl } from '@/api/upload'
import { BaseBadge, BaseButton, BaseModal, BaseSkeleton, BaseTextarea, BaseToast, EmptyState, ErrorPanel } from '@/components/base'
import CommunityGallery from '@/components/community/CommunityGallery.vue'
import { useCommunityMotion } from '@/composables/useCommunityMotion'
import { useCommunityStore } from '@/stores/community'
import { useAuthStore } from '@/stores/auth'
import '@/assets/styles/pages/engagement.css'

const route = useRoute()
const router = useRouter()
const communityStore = useCommunityStore()
const authStore = useAuthStore()
const comment = ref('')
const isAnonymous = ref(false)
const activeReplyId = ref(null)
const replyContent = ref('')
const likedCommentIds = ref(new Set())
const toastVisible = ref(false)
const toastTitle = ref('评论成功')
const toastMessage = ref('你的评论已发布。')
const likesOpen = ref(false)
const likeUsers = ref([])
const likesLoading = ref(false)
const likesError = ref('')
const pageRef = ref(null)
const commentsRef = ref(null)
const commentsOpen = ref(true)
const galleryOpen = ref(false)
const galleryIndex = ref(0)
const { likeParticle, bookmarkFlight, revealComment, highlightPost } = useCommunityMotion(pageRef)
const postParam = computed(() => route.params.slug || route.params.id)
const post = computed(() => communityStore.getPostBySlug(postParam.value))
const related = computed(() => communityStore.posts.filter((item) => item.id !== post.value?.id).slice(0, 3))
const galleryImages = computed(() => [post.value, ...related.value].filter((item) => item?.mediaType === 'image' && item.mediaUrl))
const commentTree = computed(() => {
  const nodes = (Array.isArray(post.value?.comments) ? post.value.comments : []).map((item) => ({
    ...item,
    liked: likedCommentIds.value.has(Number(item.id)),
    children: [],
  }))
  const byId = new Map(nodes.map((item) => [Number(item.id), item]))
  const roots = []
  for (const item of nodes) {
    const parent = item.parentId ? byId.get(Number(item.parentId)) : null
    if (parent) parent.children.push(item)
    else roots.push(item)
  }
  return roots
})
const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const commentCount = computed(() => Array.isArray(post.value?.comments) ? post.value.comments.length : 0)
const isAvatarImage = (value) => /^(https?:\/\/|data:|blob:|\/uploads\/)/.test(String(value || ''))

function showToast(title, message) {
  toastTitle.value = title
  toastMessage.value = message
  toastVisible.value = false
  nextTick(() => { toastVisible.value = true })
}

async function submitComment() {
  if (!comment.value.trim()) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  await communityStore.addComment(post.value.id, comment.value, isAnonymous.value)
  comment.value = ''
  commentsOpen.value = true
  await nextTick()
  const comments = commentsRef.value?.querySelectorAll('.comment') || []
  highlightPost(comments[comments.length - 1])
  showToast('评论成功', '你的评论已发布。')
}

async function submitReply(parent) {
  if (!replyContent.value.trim()) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  await communityStore.replyComment(post.value.id, parent.id, replyContent.value)
  replyContent.value = ''
  activeReplyId.value = null
  commentsOpen.value = true
  showToast('回复成功', '你的回复已发布。')
}

async function toggleCommentLike(item) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  const id = Number(item.id)
  const nextLikedIds = new Set(likedCommentIds.value)
  const result = nextLikedIds.has(id)
    ? await communityStore.unlikeComment(post.value.id, item.id)
    : await communityStore.likeComment(post.value.id, item.id)
  if (result?.liked === false) nextLikedIds.delete(id)
  else nextLikedIds.add(id)
  likedCommentIds.value = nextLikedIds
  item.liked = nextLikedIds.has(id)
  item.likeCount = result?.likeCount ?? item.likeCount
  const source = post.value?.comments?.find((commentItem) => Number(commentItem.id) === id)
  if (source) {
    source.liked = item.liked
    source.likeCount = item.likeCount
  }
}

async function openLikes() {
  if (!post.value) return
  likesOpen.value = true
  likesLoading.value = true
  likesError.value = ''
  likeUsers.value = await communityStore.fetchLikes(post.value.id)
  likesError.value = communityStore.apiError
  likesLoading.value = false
}

async function toggleLike(event) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  const result = await communityStore.toggleLike(post.value.id)
  if (result?.liked) likeParticle(event?.currentTarget)
  if (likesOpen.value) await openLikes()
}

async function toggleFavorite(event) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  await communityStore.toggleFavorite(post.value.id)
  bookmarkFlight(event?.currentTarget, document.querySelector('.user-menu__trigger'))
}

async function toggleComments() {
  if (commentsOpen.value) {
    revealComment(commentsRef.value, false, () => { commentsOpen.value = false })
  } else {
    commentsOpen.value = true
    await nextTick()
    revealComment(commentsRef.value, true)
  }
}

function openGallery() {
  if (post.value?.mediaType !== 'image') return
  galleryIndex.value = Math.max(0, galleryImages.value.findIndex((item) => item.id === post.value.id))
  galleryOpen.value = true
}

async function visitUser(userId) {
  if (!userId) return
  try {
    await getPublicProfile(userId)
    await router.push(`/users/${userId}`)
  } catch (error) {
    showToast('无法访问个人主页', error.message || '该用户已关闭个人主页访问')
  }
}

onMounted(() => {
  communityStore.fetchPostDetail(postParam.value)
})

watch(postParam, (value) => {
  communityStore.fetchPostDetail(value)
})
</script>

<template>
  <div ref="pageRef" class="engagement-page cb-fade-in">
    <main class="cb-container engagement-content">
      <BaseButton class="detail-back" variant="ghost" size="sm" @click="router.push('/community')">返回社区</BaseButton>
      <BaseSkeleton v-if="communityStore.loading" variant="card" />
      <ErrorPanel
        v-else-if="communityStore.apiError"
        title="帖子详情加载失败"
        :message="communityStore.apiError"
        @retry="communityStore.fetchPostDetail(postParam)"
      />
      <template v-else-if="post">
        <div class="engagement-layout">
          <article class="detail-panel post-article">
            <div class="post-article__head">
              <button class="post-card__author author-button" type="button" @click="visitUser(post.userId)">
                <span class="avatar"><img v-if="isAvatarImage(post.avatar)" :src="resolveUploadUrl(post.avatar)" alt="" decoding="async" /><template v-else>{{ post.avatar || (post.author || '\u7528').slice(0, 1) }}</template></span>
                <div>
                  <strong>{{ post.author }}</strong>
                  <small>{{ formatDate(post.createdAt) }}</small>
                </div>
              </button>
              <div class="post-article__stats">
                <span>{{ post.likes || 0 }} 点赞</span>
                <span>{{ commentCount }} 评论</span>
              </div>
            </div>
            <div class="post-article__title">
              <BaseBadge variant="neutral">{{ post.topic }}</BaseBadge>
              <h1 class="page-title">{{ post.title }}</h1>
            </div>
            <div v-if="post.mediaUrl" class="post-media" :class="{ 'is-gallery-trigger': post.mediaType === 'image' }" @click="openGallery">
              <img v-if="post.mediaType === 'image'" :src="resolveUploadUrl(post.mediaUrl)" alt="帖子图片" decoding="async" />
              <video v-else controls :src="resolveUploadUrl(post.mediaUrl)">当前浏览器不支持视频预览。</video>
            </div>
            <div class="post-article__body">{{ post.content }}</div>
            <div class="post-actions">
              <BaseButton size="sm" :variant="communityStore.likedIds.includes(post.id) ? 'primary' : 'outline'" @click="toggleLike">点赞 {{ post.likes }}</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="openLikes">查看点赞用户</BaseButton>
              <BaseButton size="sm" :variant="communityStore.favoriteIds.includes(post.id) ? 'secondary' : 'outline'" @click="toggleFavorite">收藏</BaseButton>
            </div>
          </article>
          <aside class="side-panel">
            <h2 class="section-title">相关推荐</h2>
            <div class="record-list">
              <button v-for="item in related" :key="item.id" class="choice-chip" type="button" @click="router.push(`/community/${item.slug}`)">{{ item.title }}</button>
            </div>
          </aside>
        </div>

        <section id="comments" class="detail-panel section-block comments-panel">
          <div class="comments-panel__header">
            <div>
              <span class="section-eyebrow">Comments</span>
              <h2 class="section-title">评论 {{ commentCount }}</h2>
            </div>
            <BaseButton size="sm" variant="outline" :aria-expanded="commentsOpen" @click="toggleComments">{{ commentsOpen ? '收起评论' : '展开评论' }}</BaseButton>
          </div>
          <div class="comment-composer">
            <BaseTextarea v-model="comment" label="发表评论" placeholder="写下你的想法..." :maxlength="300" show-count />
            <div class="comment-composer__actions">
              <label class="anonymous-toggle"><input v-model="isAnonymous" type="checkbox" /> 匿名评论</label>
              <BaseButton :disabled="!comment.trim()" @click="submitComment">发表评论</BaseButton>
            </div>
          </div>
          <div v-show="commentsOpen" ref="commentsRef" class="comment-list">
            <div v-for="item in commentTree" :key="item.id" class="comment">
              <button class="comment__avatar" type="button" @click="visitUser(item.user?.id)">
                <img v-if="item.user?.avatar" :src="resolveUploadUrl(item.user.avatar)" alt="评论者头像" loading="lazy" decoding="async" />
                <span v-else class="avatar">{{ (item.user?.nickname || item.author || '用').slice(0, 1) }}</span>
              </button>
              <div class="comment__body">
                <button class="comment__name" type="button" @click="visitUser(item.user?.id)">{{ item.user?.nickname || item.author }}</button>
                <small>{{ formatDate(item.createdAt) }}</small>
                <p>{{ item.content }}</p>
                <div class="comment-actions">
                  <button type="button" @click="toggleCommentLike(item)">{{ item.liked ? '取消点赞' : '点赞' }} {{ item.likeCount || 0 }}</button>
                  <button type="button" @click="activeReplyId = activeReplyId === item.id ? null : item.id">回复</button>
                </div>
                <div v-if="activeReplyId === item.id" class="comment-reply-form">
                  <BaseTextarea v-model="replyContent" label="回复内容" placeholder="写下你的回复..." :maxlength="300" show-count />
                  <BaseButton size="sm" :disabled="!replyContent.trim()" @click="submitReply(item)">发布回复</BaseButton>
                </div>
                <div v-if="item.children?.length" class="comment-replies">
                  <article v-for="reply in item.children.slice(0, 2)" :key="reply.id" class="comment-reply">
                    <div class="comment-reply__meta">
                      <button class="comment__name" type="button" @click="visitUser(reply.user?.id)">{{ reply.user?.nickname || reply.author }}</button>
                      <small>{{ formatDate(reply.createdAt) }}</small>
                    </div>
                    <p>{{ reply.content }}</p>
                    <button type="button" @click="toggleCommentLike(reply)">{{ reply.liked ? '取消点赞' : '点赞' }} {{ reply.likeCount || 0 }}</button>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
      <EmptyState v-else title="未找到该帖子" description="帖子可能已被删除，或链接地址不正确。" action-label="返回社区" @action="router.push('/community')">
        <template #icon>!</template>
      </EmptyState>
    </main>

    <BaseModal v-model="likesOpen" title="点赞用户">
      <div class="like-users">
        <p v-if="likesLoading" class="text-muted">正在加载点赞用户...</p>
        <p v-else-if="likesError" class="form-error">{{ likesError }}</p>
        <EmptyState v-else-if="!likeUsers.length" title="暂无点赞" description="成为第一个点赞的人吧。" />
        <button v-for="user in likeUsers" v-else :key="user.userId" class="like-user" type="button" @click="visitUser(user.userId)">
          <img v-if="user.avatar" :src="resolveUploadUrl(user.avatar)" alt="点赞用户头像" loading="lazy" decoding="async" />
          <span v-else class="avatar">{{ (user.nickname || '用').slice(0, 1) }}</span>
          <span>
            <strong>{{ user.nickname }}</strong>
            <small>{{ formatDate(user.likedAt) }}</small>
          </span>
        </button>
      </div>
    </BaseModal>

    <CommunityGallery v-model="galleryOpen" :images="galleryImages" :start-index="galleryIndex" />

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.post-article {
  display: grid;
  gap: var(--cb-space-5);
}
.post-article__head,
.post-article__stats,
.comment-composer__actions,
.comments-panel__header {
  display: flex;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: space-between;
}
.post-article__stats {
  justify-content: flex-end;
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}
.post-article__title {
  display: grid;
  gap: var(--cb-space-3);
}
.post-article__body {
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-md);
  line-height: var(--cb-line-relaxed);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.post-media {
  overflow: hidden;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-soft);
}
.post-media.is-gallery-trigger { cursor: zoom-in; }
.post-media img,
.post-media video {
  display: block;
  width: 100%;
  max-height: 28rem;
  object-fit: cover;
}
.author-button,
.comment__name,
.comment__avatar,
.like-user {
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
}
.comment__avatar {
  align-self: start;
}
.comment__avatar img,
.like-user img {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: var(--cb-radius-pill);
}
.comment__name {
  width: fit-content;
  font-weight: var(--cb-font-bold);
}
.comment-actions,
.comment-reply-form,
.comment-replies {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  margin-top: var(--cb-space-2);
}
.comment-actions button,
.comment-reply button {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
  background: transparent;
  border: 0;
}
.comments-panel {
  display: grid;
  gap: var(--cb-space-5);
}
.comments-panel__header {
  align-items: flex-start;
}
.comment-composer {
  display: grid;
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  background: color-mix(in srgb, var(--cb-bg-soft) 72%, transparent);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
}
.comment-reply-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
.comment-list {
  display: grid;
  gap: var(--cb-space-4);
}
.comment {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  box-shadow: var(--cb-shadow-sm);
}
.comment__body {
  display: grid;
  min-width: 0;
  gap: var(--cb-space-1);
}
.comment__body small {
  color: var(--cb-text-muted);
}
.comment__body p,
.comment-reply p {
  margin: 0;
  overflow-wrap: anywhere;
  line-height: var(--cb-line-relaxed);
}
.comment-replies {
  display: grid;
  margin-left: var(--cb-space-2);
  padding: var(--cb-space-3);
  border-left: 0.1875rem solid color-mix(in srgb, var(--cb-color-gold) 42%, transparent);
  background: color-mix(in srgb, var(--cb-bg-soft) 78%, transparent);
  border-radius: var(--cb-radius-lg);
}
.comment-reply {
  display: grid;
  gap: var(--cb-space-2);
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
}
.comment-reply__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}
.like-users {
  display: grid;
  gap: var(--cb-space-3);
}
.like-user {
  display: flex;
  gap: var(--cb-space-3);
  align-items: center;
  padding: var(--cb-space-3);
  border-radius: var(--cb-radius-lg);
}
.like-user:hover {
  background: var(--cb-bg-soft);
}
.like-user small {
  display: block;
  color: var(--cb-text-muted);
}
.comment-list { overflow: hidden; }
.comment.is-new-post { background: color-mix(in srgb, var(--cb-color-gold) 12%, transparent); border-radius: var(--cb-radius-lg); box-shadow: 0 0 0 .2rem color-mix(in srgb, var(--cb-color-gold) 18%, transparent); }
:global(.community-like-particle),:global(.community-bookmark-flight){position:fixed;z-index:var(--cb-z-toast);color:var(--cb-color-gold);font-weight:var(--cb-font-bold);pointer-events:none;translate:-50% -50%;will-change:transform,opacity}:global(.community-like-particle){color:var(--cb-danger)}
@media (max-width: 40rem) {
  .post-article__head,
  .comments-panel__header,
  .comment-composer__actions {
    align-items: flex-start;
    flex-direction: column;
  }
  .comment {
    grid-template-columns: 1fr;
  }
}
.author-button .avatar{overflow:hidden}.author-button .avatar img{width:100%;height:100%;object-fit:cover;border-radius:inherit}
</style>
