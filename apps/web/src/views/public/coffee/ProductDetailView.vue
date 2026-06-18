<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveUploadUrl, uploadReviewMedia } from '@/api/upload'
import { BaseBadge, BaseButton, BaseCard, BaseTextarea, BaseToast, EmptyState } from '@/components/base'
import { products } from '@/data/products'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/orders'
import { useProductsStore } from '@/stores/products'
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
const reviewForm = reactive({ rating: 5, content: '', mediaUrl: '', mediaType: '' })
const product = computed(() => productsStore.currentProduct)
const supportsBrewMethod = computed(() => product.value?.productType === 'coffee' && product.value?.supportsBrewMethod !== false)
const brewMethodOptions = [
  { label: '自己手磨', value: 'self_grind' },
  { label: '咖啡师制作', value: 'barista' },
]
const recommendations = computed(() => {
  if (!product.value) return []
  const sameCategory = products.filter((item) => item.id !== product.value.id && item.category === product.value.category)
  const others = products.filter((item) => item.id !== product.value.id && item.category !== product.value.category)
  return [...sameCategory, ...others].slice(0, 4)
})
const services = [
  { title: '到店自取', description: '下单后可在 Coffee Book 门店自取。' },
  { title: '快递配送', description: '咖啡豆与器具支持常规配送。' },
  { title: '会员积分', description: '购买商品可获得对应会员积分。' },
  { title: '售后说明', description: '非定制商品支持符合规则的售后服务。' },
]

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
    reviews.value = (await productsStore.fetchProductReviews(product.value.id, { page: 1, pageSize: 20 })).data
  } catch (error) {
    notify('评价加载失败', error.message || '请稍后重试', 'error')
  } finally {
    reviewsLoading.value = false
  }
}

async function loadProduct() {
  quantity.value = 1
  brewMethod.value = 'barista'
  await productsStore.fetchProductDetail(route.params.slug)
  await loadReviews()
}

async function addToCart() {
  if (!product.value) return
  adding.value = true
  try {
    await cartStore.addItem(product.value, quantity.value, { brewMethod: supportsBrewMethod.value ? brewMethod.value : null })
    notify('已加入购物车', `已加入 ${quantity.value} 件商品。`)
  } catch (error) {
    notify('加入购物车失败', error.message || '请稍后重试', 'error')
  } finally {
    adding.value = false
  }
}

async function buyNow() {
  if (!product.value) return
  if (!authStore.isAuthenticated) {
    await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  buying.value = true
  try {
    const order = await orderStore.buyNow({
      productId: product.value.id,
      quantity: quantity.value,
      brewMethod: supportsBrewMethod.value ? brewMethod.value : null,
      deliveryType: 'pickup',
      pickupStore: 'city',
      paymentMethod: 'wechat',
    })
    await router.push(`/account/orders/${order.id}?created=1`)
  } catch (error) {
    notify('下单失败', error.message || '请稍后再试。', 'error')
  } finally {
    buying.value = false
  }
}

async function uploadReviewFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  reviewUploading.value = true
  try {
    const response = await uploadReviewMedia(file)
    reviewForm.mediaUrl = response.data.url
    reviewForm.mediaType = response.data.file?.fileType || (file.type.startsWith('video/') ? 'video' : 'image')
    notify('媒体上传成功', '评价媒体已上传。')
  } catch (error) {
    notify('上传失败', error.message || '请检查文件格式和大小。', 'error')
  } finally {
    reviewUploading.value = false
  }
}

async function submitReview() {
  if (!authStore.isAuthenticated) {
    await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (!reviewForm.content.trim() && !reviewForm.mediaUrl) {
    notify('评价不能为空', '请填写评价内容或上传图片/视频。', 'error')
    return
  }
  reviewSubmitting.value = true
  try {
    await productsStore.createProductReview(product.value.id, { ...reviewForm, content: reviewForm.content.trim() })
    Object.assign(reviewForm, { rating: 5, content: '', mediaUrl: '', mediaType: '' })
    await loadReviews()
    notify('评价发布成功', '感谢你的体验分享。')
  } catch (error) {
    notify('评价发布失败', error.message || '请稍后重试。', 'error')
  } finally {
    reviewSubmitting.value = false
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

watch(() => route.params.slug, loadProduct)
onMounted(loadProduct)
</script>

<template>
  <div class="catalog-detail catalog-enter">
    <div class="cb-container detail-back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/coffee')">返回咖啡商城</BaseButton>
    </div>

    <template v-if="product">
      <section class="cb-container detail-hero">
        <div class="detail-visual">
          <img v-if="product.imageUrl" class="detail-product-image" :src="resolveUploadUrl(product.imageUrl)" :alt="product.name" />
          <div v-else class="product-art" :class="`tone-${product.tone}`">
            <div class="product-art__cup" />
            <span class="product-art__label">{{ product.origin }}</span>
          </div>
        </div>
        <div class="detail-copy">
          <div class="cb-cluster">
            <BaseBadge variant="neutral">{{ product.category }}</BaseBadge>
            <BaseBadge :variant="product.stock > 0 ? 'success' : 'danger'">{{ product.stock > 0 ? '有库存' : '已售罄' }}</BaseBadge>
          </div>
          <h1>{{ product.name }}</h1>
          <div class="catalog-price-row">
            <span class="catalog-price">￥{{ product.price }}</span>
            <span v-if="product.originalPrice" class="catalog-original-price">￥{{ product.originalPrice }}</span>
            <small>已售 {{ product.sales }}</small>
          </div>
          <p class="page-subtitle">{{ product.description }}</p>
          <div class="cb-cluster">
            <BaseBadge v-for="item in product.flavor" :key="item" variant="premium">{{ item }}</BaseBadge>
          </div>
          <section v-if="supportsBrewMethod" class="brew-method-picker" aria-labelledby="brew-method-title">
            <div>
              <strong id="brew-method-title">制作方式</strong>
              <p>咖啡商品可选择自己手磨，或由咖啡师为你制作。</p>
            </div>
            <div class="brew-method-picker__options">
              <label v-for="option in brewMethodOptions" :key="option.value" class="brew-method-option" :class="{ 'is-active': brewMethod === option.value }">
                <input v-model="brewMethod" type="radio" name="brew-method" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </section>
          <div class="quantity-control" aria-label="商品数量">
            <button type="button" aria-label="减少数量" :disabled="quantity <= 1" @click="quantity -= 1">-</button>
            <span aria-live="polite">{{ quantity }}</span>
            <button type="button" aria-label="增加数量" :disabled="quantity >= product.stock" @click="quantity += 1">+</button>
          </div>
          <div class="detail-actions">
            <BaseButton :loading="adding" :disabled="product.stock === 0 || adding" @click="addToCart">加入购物车</BaseButton>
            <BaseButton variant="secondary" :loading="buying" :disabled="product.stock === 0 || buying" @click="buyNow">立即购买</BaseButton>
          </div>
        </div>
      </section>

      <div class="cb-container">
        <section class="detail-section">
          <h2 class="section-title">商品说明</h2>
          <div class="detail-info-grid">
            <div class="detail-info-item"><span>风味</span><strong>{{ product.flavor.join(' / ') }}</strong></div>
            <div class="detail-info-item"><span>产地</span><strong>{{ product.origin }}</strong></div>
            <div class="detail-info-item"><span>烘焙/规格</span><strong>{{ product.roast || '-' }}</strong></div>
            <div class="detail-info-item"><span>适合场景</span><strong>{{ product.scene || '-' }}</strong></div>
            <div class="detail-info-item"><span>保存方式</span><strong>{{ product.storage || '-' }}</strong></div>
            <div class="detail-info-item"><span>库存</span><strong>{{ product.stock }} 件</strong></div>
          </div>
        </section>

        <section class="detail-section">
          <h2 class="section-title">配送与服务</h2>
          <div class="service-grid">
            <article v-for="service in services" :key="service.title" class="service-item">
              <h3>{{ service.title }}</h3>
              <p>{{ service.description }}</p>
            </article>
          </div>
        </section>

        <section class="detail-section product-reviews">
          <div class="reviews-heading">
            <div>
              <h2 class="section-title">商品评价</h2>
              <p class="text-muted">支持文字、图片和视频评价。</p>
            </div>
            <BaseButton variant="outline" size="sm" :loading="reviewsLoading" @click="loadReviews">刷新评价</BaseButton>
          </div>

          <div v-if="reviewsLoading" class="text-muted">正在加载评价...</div>
          <EmptyState v-else-if="!reviews.length" title="暂无评价" description="成为第一个分享体验的人。" />
          <div v-else class="review-list">
            <article v-for="review in reviews" :key="review.id" class="review-item">
              <img v-if="review.user.avatar" class="review-avatar" :src="resolveUploadUrl(review.user.avatar)" alt="用户头像" />
              <span v-else class="avatar">{{ review.user.nickname.slice(0, 1) }}</span>
              <div class="review-item__body">
                <div class="review-item__top">
                  <strong>{{ review.user.nickname }}</strong>
                  <span>{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
                  <small>{{ formatDate(review.createdAt) }}</small>
                </div>
                <p v-if="review.content">{{ review.content }}</p>
                <img v-if="review.mediaType === 'image'" class="review-media" :src="resolveUploadUrl(review.mediaUrl)" alt="评价图片" />
                <video v-else-if="review.mediaType === 'video'" class="review-media" controls :src="resolveUploadUrl(review.mediaUrl)">当前浏览器不支持视频预览。</video>
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
              <BaseTextarea v-model="reviewForm.content" label="评价内容" placeholder="写下你的真实体验..." :maxlength="500" show-count />
              <div class="review-upload">
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/*,video/*" @change="uploadReviewFile" />
                <BaseBadge v-if="reviewForm.mediaUrl" variant="success">{{ reviewForm.mediaType === 'video' ? '视频已上传' : '图片已上传' }}</BaseBadge>
              </div>
              <BaseButton :loading="reviewSubmitting || reviewUploading" :disabled="reviewSubmitting || reviewUploading" @click="submitReview">
                {{ reviewUploading ? '上传中...' : '提交评价' }}
              </BaseButton>
            </template>
            <p v-else class="text-muted">登录后可以发表评价。</p>
          </div>
        </section>

        <section class="detail-section">
          <h2 class="section-title">推荐商品</h2>
          <div class="detail-recommendations">
            <BaseCard v-for="item in recommendations" :key="item.id" class="catalog-card" variant="hover">
              <div class="catalog-card__visual">
                <div class="product-art catalog-card__visual-inner" :class="`tone-${item.tone}`">
                  <div class="product-art__cup" />
                  <span class="product-art__label">{{ item.origin }}</span>
                </div>
              </div>
              <div class="catalog-card__body">
                <BaseBadge variant="neutral">{{ item.category }}</BaseBadge>
                <h3>{{ item.name }}</h3>
                <span class="catalog-price">￥{{ item.price }}</span>
                <BaseButton size="sm" variant="outline" @click="router.push(`/coffee/${item.slug}`)">查看详情</BaseButton>
              </div>
            </BaseCard>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="cb-container cb-section">
      <EmptyState title="未找到该商品" description="该商品可能已下架，或链接地址不正确。" action-label="返回咖啡商城" @action="router.push('/coffee')">
        <template #icon>!</template>
      </EmptyState>
    </div>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
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
</style>
