<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveUploadUrl } from '@/api/upload'

import { BaseBadge, BaseButton, BaseCard, BaseSkeleton, BaseTextarea, EmptyState, ErrorPanel } from '@/components/base'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useMembershipStore } from '@/stores/membership'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import '@/assets/styles/pages/catalog.css'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const membershipStore = useMembershipStore()
const { popLike } = useAnimeMotion()

const book = computed(() => booksStore.currentBook)
const favorite = computed(() => membershipStore.isFavorite('book', book.value?.id))
const safeSlug = computed(() => {
  const value = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug
  return String(value || '').trim()
})
const reviews = ref([])
const reviewsLoading = ref(false)
const reviewSubmitting = ref(false)
const activeReplyId = ref(null)
const replyContent = ref('')
const likedReviewIds = ref(new Set())
const reservationSubmitting = ref(false)
const actionMessage = ref('')
const actionError = ref('')
const reviewForm = reactive({ rating: 5, content: '' })
const locationText = computed(() => book.value?.locationLabel || (book.value?.seatId ? `绑定座位 #${book.value.seatId}` : '到店后由馆员指引'))
const recommendations = computed(() => {
  if (!book.value) return []
  const sameCategory = booksStore.items.filter((item) => item.id !== book.value.id && item.category === book.value.category)
  const others = booksStore.items.filter((item) => item.id !== book.value.id && item.category !== book.value.category)
  return [...sameCategory, ...others].slice(0, 4)
})
const reviewTree = computed(() => {
  const nodes = (Array.isArray(reviews.value) ? reviews.value : []).map((item) => ({ ...normalizeReview(item), children: [] }))
  const byId = new Map(nodes.map((item) => [Number(item.id), item]))
  const roots = []
  for (const item of nodes) {
    const parent = item.parentId ? byId.get(Number(item.parentId)) : null
    if (parent) parent.children.push(item)
    else roots.push(item)
  }
  return roots
})

function normalizeReview(item = {}) {
  return {
    ...item,
    content: String(item.content || ''),
    rating: Number(item.rating || 5),
    likeCount: Number(item.likeCount || 0),
    createdAt: item.createdAt || new Date().toISOString(),
    user: item.user || { nickname: item.author || '匿名用户', avatar: '' },
  }
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value)) : '-'
}

async function submitReply(review) {
  if (!book.value?.id) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  const content = replyContent.value.trim()
  if (!content) return
  await booksStore.replyBookReview(book.value.id, review.id, { content })
  replyContent.value = ''
  activeReplyId.value = null
  await loadReviews()
}

async function toggleLike(review) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  const id = Number(review.id)
  const nextLikedIds = new Set(likedReviewIds.value)
  const response = nextLikedIds.has(id)
    ? await booksStore.unlikeBookReview(review.id)
    : await booksStore.likeBookReview(review.id)
  if (response.data?.liked === false) nextLikedIds.delete(id)
  else nextLikedIds.add(id)
  likedReviewIds.value = nextLikedIds
  review.liked = nextLikedIds.has(id)
  review.likeCount = response.data?.likeCount ?? review.likeCount
  const source = reviews.value.find((item) => Number(item.id) === id)
  if (source) {
    source.liked = review.liked
    source.likeCount = review.likeCount
  }
}

async function loadReviews() {
  if (!book.value?.id) return
  reviewsLoading.value = true
  try {
    const response = await booksStore.fetchBookReviews(book.value.id, { page: 1, pageSize: 20 })
    reviews.value = (Array.isArray(response.data) ? response.data : []).map((item) => ({ ...normalizeReview(item), liked: likedReviewIds.value.has(Number(item.id)) }))
  } finally {
    reviewsLoading.value = false
  }
}

async function loadBook() {
  actionMessage.value = ''
  actionError.value = ''
  const results = await Promise.allSettled([
    booksStore.fetchBooks({ page: 1, pageSize: 100 }),
    booksStore.fetchBookDetail(safeSlug.value),
    authStore.isAuthenticated ? membershipStore.fetchFavorites() : Promise.resolve(),
  ])
  const failed = results.find((result) => result.status === 'rejected')
  if (failed && !booksStore.error) booksStore.error = failed.reason?.message || '图书详情加载失败'
  await loadReviews()
}

async function toggleFavorite(event) {
  if (!book.value?.id) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  await membershipStore.toggleFavorite('book', book.value.id)
  await booksStore.fetchBookDetail(safeSlug.value, { silent: true })
  popLike(event?.currentTarget)
}

async function reserveBook() {
  if (!book.value?.id) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  reservationSubmitting.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await booksStore.createBookReservation(book.value.id)
    actionMessage.value = `预约成功：${response.data.locationLabel || locationText.value}`
    await booksStore.fetchBookDetail(safeSlug.value, { silent: true })
  } catch (error) {
    actionError.value = error.message || '预约失败，请稍后重试'
  } finally {
    reservationSubmitting.value = false
  }
}

async function submitReview() {
  if (!book.value?.id) return
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: route.fullPath } })
  if (!reviewForm.content.trim()) {
    actionError.value = '请填写评价内容'
    return
  }
  reviewSubmitting.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    await booksStore.createBookReview(book.value.id, { rating: reviewForm.rating, content: reviewForm.content.trim() })
    reviewForm.rating = 5
    reviewForm.content = ''
    actionMessage.value = '评价已发布'
    await booksStore.fetchBookDetail(safeSlug.value, { silent: true })
    await loadReviews()
  } catch (error) {
    actionError.value = error.message || '评价发布失败'
  } finally {
    reviewSubmitting.value = false
  }
}

function openBookDetail(item) {
  const slug = String(item?.slug || item?.id || '').trim()
  if (slug) router.push(`/books/${slug}`)
}

watch(() => route.params.slug, loadBook)
onMounted(loadBook)
</script>

<template>
  <div class="catalog-detail catalog-enter">
    <div class="cb-container detail-back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/books')">返回图书中心</BaseButton>
    </div>

    <div v-if="booksStore.loading" class="cb-container cb-section">
      <BaseSkeleton variant="card" />
    </div>

    <ErrorPanel v-else-if="booksStore.error" class="cb-container" title="图书详情加载失败" :message="booksStore.error" @retry="loadBook" />

    <template v-else-if="book">
      <section class="cb-container detail-hero">
        <div class="detail-visual">
          <img v-if="book.coverUrl" class="detail-content-image" :src="resolveUploadUrl(book.coverUrl)" :alt="book.title" decoding="async" />
          <div v-else class="book-cover" :class="`tone-${book.coverTone}`">
            <span>{{ book.category }}</span><strong>{{ book.title }}</strong><small>Coffee Book Edition</small>
          </div>
        </div>
        <div class="detail-copy">
          <div class="cb-cluster">
            <BaseBadge variant="neutral">{{ book.category }}</BaseBadge>
            <BaseBadge :variant="book.stock > 0 ? 'success' : 'danger'">{{ book.status }}</BaseBadge>
          </div>
          <h1>{{ book.title }}</h1>
          <span class="detail-author">{{ book.author }}</span>
          <span class="detail-rating">★ {{ book.rating }} · {{ book.favorites.toLocaleString('zh-CN') }} 人收藏 · {{ book.reviewAverage || 0 }} 分 / {{ book.reviewCount || 0 }} 条评价</span>
          <p class="page-subtitle">{{ book.summary }}</p>
          <div class="book-location-card">
            <span>馆藏位置</span>
            <strong>{{ locationText }}</strong>
          </div>
          <p v-if="actionMessage" class="form-success">{{ actionMessage }}</p>
          <p v-if="actionError" class="form-error">{{ actionError }}</p>
          <div class="detail-actions">
            <BaseButton :variant="favorite ? 'secondary' : 'outline'" @click="toggleFavorite($event)">
              {{ favorite ? '已收藏' : '加入收藏' }}
            </BaseButton>
            <BaseButton :loading="reservationSubmitting" :disabled="book.stock === 0 || reservationSubmitting" @click="reserveBook">
              {{ book.stock === 0 ? '暂无可预约馆藏' : '预约图书' }}
            </BaseButton>
          </div>
        </div>
      </section>

      <div class="cb-container">
        <section class="detail-section">
          <h2 class="section-title">图书信息</h2>
          <div class="detail-info-grid">
            <div class="detail-info-item"><span>ISBN</span><strong>{{ book.isbn }}</strong></div>
            <div class="detail-info-item"><span>出版社</span><strong>{{ book.publisher }}</strong></div>
            <div class="detail-info-item"><span>出版年份</span><strong>{{ book.year }}</strong></div>
            <div class="detail-info-item"><span>页数</span><strong>{{ book.pages }} 页</strong></div>
            <div class="detail-info-item"><span>语言</span><strong>{{ book.language }}</strong></div>
            <div class="detail-info-item"><span>馆藏</span><strong>{{ book.stock }} 本可用</strong></div>
          </div>
        </section>

        <section class="detail-section">
          <h2 class="section-title">内容简介</h2>
          <p class="rich-text">{{ book.description }}</p>
        </section>

        <section class="detail-section">
          <h2 class="section-title">作者介绍</h2>
          <p class="rich-text">{{ book.authorBio }}</p>
        </section>

        <section class="detail-section book-reviews">
          <div class="reviews-heading">
            <div>
              <h2 class="section-title">读者评价</h2>
              <p class="text-muted">预约或借阅后可发表评价；再次提交会更新你的评价。</p>
            </div>
            <BaseButton variant="outline" size="sm" :loading="reviewsLoading" @click="loadReviews">刷新评价</BaseButton>
          </div>
          <div v-if="reviewsLoading" class="text-muted">正在加载评价...</div>
          <EmptyState v-else-if="!reviewTree.length" title="暂无评价" description="预约阅读后，分享你的第一条读后感。" />
          <div v-else class="review-list">
            <article v-for="review in reviewTree" :key="review.id" class="review-item">
              <span class="avatar">{{ (review.user?.nickname || '用').slice(0, 1) }}</span>
              <div>
                <div class="review-item__top">
                  <strong>{{ review.user?.nickname || '匿名用户' }}</strong>
                  <span>{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
                  <small>{{ formatDate(review.createdAt) }}</small>
                </div>
                <p>{{ review.content }}</p>
                <div class="review-actions">
                  <button type="button" @click="toggleLike(review)">{{ review.liked ? '取消点赞' : '点赞' }} {{ review.likeCount || 0 }}</button>
                  <button type="button" @click="activeReplyId = activeReplyId === review.id ? null : review.id">回复</button>
                </div>
                <div v-if="activeReplyId === review.id" class="reply-form">
                  <BaseTextarea v-model="replyContent" label="回复内容" :maxlength="300" />
                  <BaseButton size="sm" @click="submitReply(review)">发布回复</BaseButton>
                </div>
                <div v-if="review.children?.length" class="reply-list">
                  <article v-for="reply in review.children.slice(0, 2)" :key="reply.id" class="reply-item">
                    <strong>{{ reply.user?.nickname || '匿名用户' }}</strong>
                    <span>{{ reply.content }}</span>
                    <button type="button" @click="toggleLike(reply)">{{ reply.liked ? '取消点赞' : '点赞' }} {{ reply.likeCount || 0 }}</button>
                  </article>
                </div>
              </div>
            </article>
          </div>
          <div class="review-form">
            <template v-if="authStore.isAuthenticated">
              <label class="rating-picker">
                <span>评分</span>
                <select v-model.number="reviewForm.rating">
                  <option v-for="score in [5,4,3,2,1]" :key="score" :value="score">{{ score }} 星</option>
                </select>
              </label>
              <BaseTextarea v-model="reviewForm.content" label="评价内容" placeholder="写下你的阅读体验..." :maxlength="500" show-count />
              <BaseButton :loading="reviewSubmitting" :disabled="reviewSubmitting" @click="submitReview">提交评价</BaseButton>
            </template>
            <p v-else class="text-muted">登录并预约图书后可发表评价。</p>
          </div>
        </section>

        <section class="detail-section">
          <h2 class="section-title">推荐图书</h2>
          <div class="detail-recommendations">
            <BaseCard v-for="item in recommendations" :key="item.id" class="catalog-card" variant="hover">
              <div class="catalog-card__visual">
                <div class="book-cover catalog-card__visual-inner" :class="`tone-${item.coverTone}`">
                  <span>{{ item.category }}</span><strong>{{ item.title }}</strong><small>Coffee Book</small>
                </div>
              </div>
              <div class="catalog-card__body">
                <BaseBadge variant="neutral">{{ item.category }}</BaseBadge>
                <h3>{{ item.title }}</h3>
                <span class="catalog-card__author">{{ item.author }}</span>
                <BaseButton size="sm" variant="outline" @click="openBookDetail(item)">查看详情</BaseButton>
              </div>
            </BaseCard>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="cb-container cb-section">
      <EmptyState title="未找到这本图书" description="该图书可能已下架，或链接地址不正确。" action-label="返回图书中心" @action="router.push('/books')">
        <template #icon>□</template>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.detail-content-image { display:block; width:100%; height:100%; min-height:28rem; object-fit:cover; border-radius:var(--cb-radius-xl); }
.book-location-card { display:grid; gap:var(--cb-space-1); padding:var(--cb-space-4); background:var(--cb-bg-soft); border:1px solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); }
.book-location-card span { color:var(--cb-text-muted); font-size:var(--cb-font-size-sm); }
.book-reviews,.review-form,.review-list { display:grid; gap:var(--cb-space-4); }
.reviews-heading { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:var(--cb-space-3); }
.review-item { display:grid; grid-template-columns:auto minmax(0,1fr); gap:var(--cb-space-3); padding:var(--cb-space-4); background:var(--cb-bg-surface); border:1px solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); }
.review-item__top { display:flex; flex-wrap:wrap; gap:var(--cb-space-2); align-items:center; }
.review-item__top span { color:var(--cb-color-caramel); }
.review-item__top small { color:var(--cb-text-muted); }
.rating-picker { display:flex; flex-wrap:wrap; align-items:center; gap:var(--cb-space-3); }
.rating-picker select { min-height:2.5rem; padding:0 var(--cb-space-3); background:var(--cb-bg-surface); border:1px solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); }
.review-actions,
.reply-form,
.reply-list { display:flex; flex-wrap:wrap; gap:var(--cb-space-2); margin-top:var(--cb-space-2); }
.review-actions button,
.reply-item button { color:var(--cb-color-coffee); background:transparent; border:0; font-weight:var(--cb-font-semibold); }
.reply-form { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; width:100%; }
.reply-list { display:grid; width:100%; padding:var(--cb-space-3); background:var(--cb-bg-soft); border-radius:var(--cb-radius-lg); }
.reply-item { display:flex; flex-wrap:wrap; gap:var(--cb-space-2); align-items:center; color:var(--cb-text-secondary); font-size:var(--cb-font-size-sm); }
.form-success { color:var(--cb-success); }
</style>
