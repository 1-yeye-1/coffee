<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveUploadUrl, uploadReviewMedia } from '@/api/upload'
import { BaseBadge, BaseButton, BaseCard, BaseSkeleton, BaseTextarea, BaseToast, EmptyState, ErrorPanel } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/orders'
import { useProductsStore } from '@/stores/products'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import '@/assets/styles/pages/catalog.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const orderStore = useOrderStore()
const productsStore = useProductsStore()
const quantity = ref(1)
const brewMethod = ref('barista')
const adding = ref(false)
const buying = ref(false)
const toastVisible = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastVariant = ref('success')
const reviews = ref([])
const reviewsLoading = ref(false)
const reviewSubmitting = ref(false)
const reviewUploading = ref(false)
const activeReplyId = ref(null)
const replyContent = ref('')
const cartButtonRef = ref(null)
const likedReviewIds = ref(new Set())
const { bounceCart, successCheck, shakeError } = useAnimeMotion()
const reviewForm = reactive({ rating: 5, content: '', mediaUrl: '', mediaType: '' })
const product = computed(() => productsStore.currentProduct || null)
const stock = computed(() => Number(product.value?.stock || 0))
const flavor = computed(() => Array.isArray(product.value?.flavor) ? product.value.flavor : [])
const supportsBrewMethod = computed(() => product.value?.productType === 'coffee' && product.value?.supportsBrewMethod !== false)
const brewMethodOptions = [{ label: '自磨咖啡豆', value: 'self_grind' }, { label: '咖啡师制作', value: 'barista' }]
const recommendations = computed(() => {
  if (!product.value) return []
  const sameCategory = productsStore.items.filter((item) => item.id !== product.value?.id && item.category === product.value?.category)
  const others = productsStore.items.filter((item) => item.id !== product.value?.id && item.category !== product.value?.category)
  return [...sameCategory, ...others].slice(0, 4)
})
const reviewTree = computed(() => buildReviewTree(reviews.value))

function normalizeReview(item = {}) {
  return {
    ...item,
    content: String(item.content || ''),
    rating: Number(item.rating || 5),
    likeCount: Number(item.likeCount || 0),
    mediaUrl: item.mediaUrl || '',
    mediaType: item.mediaType || '',
    createdAt: item.createdAt || new Date().toISOString(),
    user: item.user || { nickname: item.author || '匿名用户', avatar: '' },
  }
}

function buildReviewTree(list) {
  const nodes = (Array.isArray(list) ? list : []).map((item) => ({ ...normalizeReview(item), children: [] }))
  const byId = new Map(nodes.map((item) => [Number(item.id), item]))
  const roots = []
  for (const item of nodes) {
    const parent = item.parentId ? byId.get(Number(item.parentId)) : null
    if (parent) parent.children.push(item)
    else roots.push(item)
  }
  return roots
}
function notify(title, message, variant = 'success') {
  toastVisible.value = false
  toastTitle.value = title
  toastMessage.value = message
  toastVariant.value = variant
  nextTick(() => { toastVisible.value = true })
}
async function loadReviews() {
  if (!product.value?.id) return
  reviewsLoading.value = true
  try {
    const response = await productsStore.fetchProductReviews(product.value.id, { page: 1, pageSize: 50 })
    reviews.value = (Array.isArray(response.data) ? response.data : []).map((item) => ({ ...normalizeReview(item), liked: likedReviewIds.value.has(Number(item.id)) }))
  }
  catch (error) { notify('评价加载失败', error.message || '请稍后重试。', 'error') }
  finally { reviewsLoading.value = false }
}
async function loadProduct() {
  quantity.value = 1
  brewMethod.value = 'barista'
  await productsStore.fetchProducts({ page: 1, pageSize: 100 })
  await productsStore.fetchProductDetail(route.params.slug)
  await loadReviews()
}
async function addToCart() {
  if (!product.value) return
  adding.value = true
  try {
    await cartStore.addItem(product.value, quantity.value, { brewMethod: supportsBrewMethod.value ? brewMethod.value : null })
    notify('已加入购物车', `已加入 ${quantity.value} 件商品。`)
    bounceCart(cartButtonRef.value?.$el || cartButtonRef.value)
    successCheck(document.querySelector('.cart-trigger'))
  } catch (error) { notify('加入失败', error.message || '请稍后重试。', 'error'); shakeError(cartButtonRef.value?.$el || cartButtonRef.value) }
  finally { adding.value = false }
}
async function buyNow() {
  if (!product.value) return
  if (!authStore.isAuthenticated) { await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`); return }
  buying.value = true
  try {
    const order = await orderStore.buyNow({ productId: product.value.id, quantity: quantity.value, brewMethod: supportsBrewMethod.value ? brewMethod.value : null, deliveryType: 'pickup', pickupStore: 'city', paymentMethod: 'wechat' })
    await router.push(`/account/orders/${order.id}?created=1`)
  } catch (error) { notify('购买失败', error.message || '请稍后重试。', 'error') }
  finally { buying.value = false }
}
async function uploadReviewFile(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  const file = event.target.files?.[0]
  if (!file) return
  reviewUploading.value = true
  try {
    const response = await uploadReviewMedia(file)
    reviewForm.mediaUrl = response.data.url
    reviewForm.mediaType = response.data.file?.fileType || (file.type.startsWith('video/') ? 'video' : 'image')
    notify('上传成功', '评价媒体已准备好。')
  } catch (error) { notify('上传失败', error.message || '请检查文件格式和大小。', 'error') }
  finally { reviewUploading.value = false; event.target.value = '' }
}
async function submitReview() {
  if (!authStore.isAuthenticated) { await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`); return }
  if (!reviewForm.content.trim() && !reviewForm.mediaUrl) { notify('评价内容为空', '请添加文字或图片/视频。', 'error'); return }
  reviewSubmitting.value = true
  try {
    await productsStore.createProductReview(product.value.id, { ...reviewForm, content: reviewForm.content.trim() })
    Object.assign(reviewForm, { rating: 5, content: '', mediaUrl: '', mediaType: '' })
    await productsStore.fetchProductDetail(route.params.slug)
    await loadReviews()
    notify('评价已发布', '感谢你的分享。')
  } catch (error) { notify('评价失败', error.message || '购买后才可以评价。', 'error') }
  finally { reviewSubmitting.value = false }
}
async function submitReply(review) {
  if (!authStore.isAuthenticated) { await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`); return }
  const content = replyContent.value.trim()
  if (!content) return
  await productsStore.replyProductReview(product.value.id, review.id, { content })
  replyContent.value = ''
  activeReplyId.value = null
  await loadReviews()
}
async function deleteReview(review) {
  if (!authStore.isAuthenticated || !confirm('确认删除这条评价？')) return
  try {
    await productsStore.deleteProductReview(review.id)
    await loadReviews()
  } catch (error) {
    notify('删除失败', error.message || '无法删除评价', 'error')
  }
}
async function toggleLike(review) {
  if (!authStore.isAuthenticated) { await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`); return }
  const id = Number(review.id)
  const nextLikedIds = new Set(likedReviewIds.value)
  const response = nextLikedIds.has(id)
    ? await productsStore.unlikeProductReview(review.id)
    : await productsStore.likeProductReview(review.id)
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
function formatDate(value) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

watch(() => route.params.slug, loadProduct)
onMounted(loadProduct)
</script>
<template>
  <div class="catalog-detail catalog-enter">
    <div class="cb-container detail-back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/coffee')">返回商品列表</BaseButton>
    </div>

    <div v-if="productsStore.loading" class="cb-container cb-section">
      <BaseSkeleton variant="card" />
    </div>

    <ErrorPanel v-else-if="productsStore.error" class="cb-container" title="商品详情加载失败" :message="productsStore.error" @retry="loadProduct" />

    <template v-else-if="product">
      <section class="cb-container detail-hero">
        <div class="detail-visual">
          <img v-if="product?.imageUrl" class="detail-product-image" :src="resolveUploadUrl(product.imageUrl)" :alt="product?.name || '商品图片'" loading="eager" decoding="async" />
          <div v-else class="product-art" :class="`tone-${product?.tone || 'coffee'}`">
            <div class="product-art__cup" />
            <span class="product-art__label">{{ product?.origin || 'Coffee Book' }}</span>
          </div>
        </div>
        <div class="detail-copy">
          <div class="cb-cluster">
            <BaseBadge variant="neutral">{{ product?.category || '商品' }}</BaseBadge>
            <BaseBadge :variant="stock > 0 ? 'success' : 'danger'">{{ stock > 0 ? '有库存' : '已售罄' }}</BaseBadge>
            <BaseBadge v-if="product?.isFeatured" variant="premium">推荐</BaseBadge>
            <BaseBadge v-if="product?.isNew" variant="success">新品</BaseBadge>
            <BaseBadge v-if="product?.isHot" variant="warning">热销</BaseBadge>
            <BaseBadge v-if="stock > 0 && stock <= product?.lowStockThreshold" variant="warning">低库存</BaseBadge>
          </div>
          <h1>{{ product?.name || '商品详情' }}</h1>
          <div class="catalog-price-row">
            <span class="catalog-price">¥ {{ product?.price || 0 }}</span>
            <span v-if="product?.originalPrice" class="catalog-original-price">¥ {{ product.originalPrice }}</span>
            <small>销量 {{ product?.sales || 0 }}</small>
            <small>评分 {{ product?.reviewAverage || 0 }} / {{ product?.reviewCount || 0 }} 条评价</small>
          </div>
          <p class="page-subtitle">{{ product?.description || '暂无商品描述。' }}</p>
          <div class="cb-cluster"><BaseBadge v-for="item in flavor" :key="item" variant="premium">{{ item }}</BaseBadge></div>
          <section v-if="supportsBrewMethod" class="brew-method-picker" aria-labelledby="brew-method-title">
            <div><strong id="brew-method-title">制作方式</strong><p>选择自磨咖啡豆或由咖啡师现场制作。</p></div>
            <div class="brew-method-picker__options">
              <label v-for="option in brewMethodOptions" :key="option.value" class="brew-method-option" :class="{ 'is-active': brewMethod === option.value }">
                <input v-model="brewMethod" type="radio" name="brew-method" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </section>
          <div class="quantity-control" aria-label="购买数量">
            <button type="button" aria-label="减少数量" :disabled="quantity <= 1" @click="quantity -= 1">-</button>
            <span aria-live="polite">{{ quantity }}</span>
            <button type="button" aria-label="增加数量" :disabled="quantity >= stock" @click="quantity += 1">+</button>
          </div>
          <div class="detail-actions">
            <BaseButton ref="cartButtonRef" :loading="adding" :disabled="stock === 0 || adding" @click="addToCart">加入购物车</BaseButton>
            <BaseButton variant="secondary" :loading="buying" :disabled="stock === 0 || buying" @click="buyNow">立即购买</BaseButton>
          </div>
        </div>
      </section>

      <div class="cb-container">
        <section class="detail-section">
          <h2 class="section-title">商品信息</h2>
          <div class="detail-info-grid">
            <div class="detail-info-item"><span>风味</span><strong>{{ flavor.join(' / ') || '-' }}</strong></div>
            <div class="detail-info-item"><span>产地</span><strong>{{ product?.origin || '-' }}</strong></div>
            <div class="detail-info-item"><span>烘焙 / 规格</span><strong>{{ product?.roast || '-' }}</strong></div>
            <div class="detail-info-item"><span>适用场景</span><strong>{{ product?.scene || '-' }}</strong></div>
            <div class="detail-info-item"><span>储存方式</span><strong>{{ product?.storage || '-' }}</strong></div>
            <div class="detail-info-item"><span>库存</span><strong>{{ stock }}</strong></div>
          </div>
        </section>

        <section class="detail-section product-reviews">
          <div class="reviews-heading"><div><h2 class="section-title">用户评价</h2><p class="text-muted">购买后可发表评价，也可以回复和点赞评论。</p></div><BaseButton variant="outline" size="sm" :loading="reviewsLoading" @click="loadReviews">刷新评价</BaseButton></div>
          <div v-if="reviewsLoading" class="text-muted">正在加载评价...</div>
          <EmptyState v-else-if="!reviewTree.length" title="暂无评价" description="购买后，来分享第一条体验吧。" />
          <div v-else class="review-list">
            <article v-for="review in reviewTree" :key="review.id" class="review-item">
              <img v-if="review.user?.avatar" class="review-avatar" :src="resolveUploadUrl(review.user.avatar)" alt="评价用户头像" loading="lazy" decoding="async" />
              <span v-else class="avatar">{{ (review.user?.nickname || '用').slice(0, 1) }}</span>
              <div class="review-item__body">
                <div class="review-item__top"><strong>{{ review.user?.nickname || '匿名用户' }}</strong><span>{{ review.rating }} / 5 分</span><small>{{ formatDate(review.createdAt) }}</small></div>
                <p v-if="review.content">{{ review.content }}</p>
                <img v-if="review.mediaType === 'image'" class="review-media" :src="resolveUploadUrl(review.mediaUrl)" alt="评价图片" loading="lazy" decoding="async" />
                <video v-else-if="review.mediaType === 'video'" class="review-media" controls :src="resolveUploadUrl(review.mediaUrl)">当前浏览器不支持视频播放。</video>
                <div class="review-actions"><button type="button" @click="toggleLike(review)">{{ review.liked ? '取消点赞' : '点赞' }} {{ review.likeCount || 0 }}</button><button type="button" @click="activeReplyId = activeReplyId === review.id ? null : review.id">回复</button><button v-if="authStore.user?.id === review.user?.id" type="button" class="review-action--danger" @click="deleteReview(review)">删除</button></div>
                <div v-if="activeReplyId === review.id" class="reply-form"><BaseTextarea v-model="replyContent" label="回复内容" :maxlength="300" /><BaseButton size="sm" @click="submitReply(review)">发布回复</BaseButton></div>
                <div v-if="review.children?.length" class="reply-list"><article v-for="reply in review.children.slice(0, 2)" :key="reply.id" class="reply-item"><span class="reply-item__avatar"><img v-if="reply.user?.avatar" :src="resolveUploadUrl(reply.user.avatar)" alt="" decoding="async" /><span v-else class="avatar-small">{{ (reply.user?.nickname || '用').slice(0, 1) }}</span></span><div><button class="reply-item__name" type="button" @click="router.push(`/users/${reply.user?.id}`)">{{ reply.user?.nickname || '匿名用户' }}</button><span>{{ reply.content }}</span></div><div class="reply-item__actions"><button type="button" @click="toggleLike(reply)">{{ reply.liked ? '取消点赞' : '点赞' }} {{ reply.likeCount || 0 }}</button><button type="button" @click="activeReplyId = activeReplyId === reply.id ? null : reply.id">回复</button><button v-if="authStore.user?.id === reply.user?.id" type="button" class="review-action--danger" @click="deleteReview(reply)">删除</button></div><div v-if="activeReplyId === reply.id" class="reply-form" style="margin-top:var(--cb-space-2)"><BaseTextarea v-model="replyContent" label="回复内容" :maxlength="300" /><BaseButton size="sm" @click="submitReply(reply)">发布回复</BaseButton></div></article></div>
              </div>
            </article>
          </div>
          <div class="review-form">
            <template v-if="authStore.isAuthenticated">
              <label class="rating-picker"><span>评分</span><select v-model.number="reviewForm.rating"><option v-for="score in [5,4,3,2,1]" :key="score" :value="score">{{ score }} 星</option></select></label>
              <BaseTextarea v-model="reviewForm.content" label="评价内容" placeholder="分享你的体验..." :maxlength="500" show-count />
              <div class="review-upload"><input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/*,video/*" @change.stop.prevent="uploadReviewFile" /><BaseBadge v-if="reviewForm.mediaUrl" variant="success">已上传</BaseBadge></div>
              <BaseButton :loading="reviewSubmitting || reviewUploading" :disabled="reviewSubmitting || reviewUploading" @click="submitReview">{{ reviewUploading ? '上传中...' : '提交评价' }}</BaseButton>
            </template>
            <p v-else class="text-muted">登录并购买后可发表评价。</p>
          </div>
        </section>

        <section class="detail-section">
          <h2 class="section-title">相关推荐</h2>
          <div class="detail-recommendations"><BaseCard v-for="item in recommendations" :key="item.id" class="catalog-card" variant="hover"><div class="catalog-card__body"><BaseBadge variant="neutral">{{ item.category }}</BaseBadge><h3>{{ item.name }}</h3><span class="catalog-price">¥ {{ item.price }}</span><BaseButton size="sm" variant="outline" @click="router.push(`/coffee/${item.slug}`)">查看详情</BaseButton></div></BaseCard></div>
        </section>
      </div>
    </template>

    <div v-else class="cb-container cb-section"><EmptyState title="未找到该商品" description="商品可能已下架，或链接地址不正确。" /></div>
    <div class="page-toast"><BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast></div>
  </div>
</template>
<style scoped>
.detail-product-image {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 24rem;
  object-fit: cover;
  border-radius: var(--cb-radius-xl);
}
.brew-method-picker {
  display: grid;
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  border: 1px solid color-mix(in srgb, var(--cb-color-coffee) 12%, transparent);
  border-radius: var(--cb-radius-lg);
  background: color-mix(in srgb, var(--cb-color-cream) 86%, white);
}
.brew-method-picker strong { color: var(--cb-color-coffee); }
.brew-method-picker p {
  margin: var(--cb-space-1) 0 0;
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}
.brew-method-picker__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}
.brew-method-option {
  display: inline-flex;
  min-height: 2.5rem;
  padding: 0 var(--cb-space-4);
  align-items: center;
  gap: var(--cb-space-2);
  color: var(--cb-color-coffee);
  background: var(--cb-bg-surface);
  border: 1px solid color-mix(in srgb, var(--cb-color-coffee) 14%, transparent);
  border-radius: var(--cb-radius-pill);
  cursor: pointer;
}
.brew-method-option input { accent-color: var(--cb-color-coffee); }
.brew-method-option.is-active {
  border-color: color-mix(in srgb, var(--cb-color-gold) 78%, var(--cb-color-coffee));
  background: color-mix(in srgb, var(--cb-color-gold) 18%, var(--cb-bg-surface));
  box-shadow: var(--cb-shadow-sm);
}
.product-reviews,
.review-form {
  display: grid;
  gap: var(--cb-space-5);
}
.reviews-heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: space-between;
}
.review-list {
  display: grid;
  gap: var(--cb-space-4);
}
.review-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-surface);
}
.review-avatar {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: var(--cb-radius-pill);
}
.review-item__body {
  display: grid;
  gap: var(--cb-space-2);
}
.review-item__top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}
.review-item__top span {
  color: var(--cb-color-caramel);
}
.review-item__top small {
  color: var(--cb-text-muted);
}
.review-media {
  width: min(100%, 24rem);
  max-height: 18rem;
  object-fit: cover;
  border-radius: var(--cb-radius-lg);
}
.rating-picker,
.review-upload {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
}
.rating-picker select {
  min-height: 2.5rem;
  padding: 0 var(--cb-space-3);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-surface);
}
.review-actions,
.reply-form,
.reply-list { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); margin-top: var(--cb-space-2); }
.review-actions button,
.reply-item button,
.reply-item__actions button { color: var(--cb-color-coffee); background: transparent; border: 0; font-weight: var(--cb-font-semibold); }
.review-action--danger { color: var(--cb-danger) !important; }
.reply-item__actions { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }
.reply-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; width: 100%; }
.reply-list { display: grid; width: 100%; padding: var(--cb-space-3); background: var(--cb-bg-soft); border-radius: var(--cb-radius-lg); }
.reply-item { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); align-items: flex-start; color: var(--cb-text-secondary); font-size: var(--cb-font-size-sm); }
.reply-item__avatar { width: 1.75rem; height: 1.75rem; flex-shrink: 0; border-radius: var(--cb-radius-pill); overflow: hidden; }
.reply-item__avatar img { width: 100%; height: 100%; object-fit: cover; }
.reply-item__avatar .avatar-small { display: inline-grid; width: 100%; height: 100%; place-items: center; background: var(--cb-color-coffee); color: var(--cb-text-inverse); font-size: var(--cb-font-size-xs); font-weight: var(--cb-font-bold); }
.reply-item__name { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); background: none; border: 0; padding: 0; cursor: pointer; font-size: inherit; }
.reply-item__name:hover { text-decoration: underline; }
</style>
