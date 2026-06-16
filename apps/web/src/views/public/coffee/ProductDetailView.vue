<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard, BaseToast, EmptyState } from '@/components/base'
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
const toastVisible = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
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

function loadProduct() {
  quantity.value = 1
  brewMethod.value = 'barista'
  return productsStore.fetchProductDetail(route.params.slug)
}

watch(() => route.params.slug, loadProduct)
onMounted(loadProduct)

function notify(title, message) {
  toastVisible.value = false
  toastTitle.value = title
  toastMessage.value = message
  nextTick(() => {
    toastVisible.value = true
  })
}

function addToCart() {
  if (!product.value) return
  cartStore.addItem(product.value, quantity.value, { brewMethod: supportsBrewMethod.value ? brewMethod.value : null })
  notify('已加入购物车', `已加入 ${quantity.value} 件商品。`)
}

async function buyNow() {
  if (!product.value) return
  if (!authStore.isAuthenticated) {
    await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
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
    notify('下单失败', error.message || '请稍后再试。')
  }
}
</script>

<template>
  <div class="catalog-detail catalog-enter">
    <div class="cb-container detail-back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/coffee')">返回咖啡商城</BaseButton>
    </div>

    <p v-if="productsStore.error && product" class="cb-container text-muted" role="status">API 暂不可用，当前展示本地商品资料。</p>

    <template v-if="product">
      <section class="cb-container detail-hero">
        <div class="detail-visual">
          <div class="product-art" :class="`tone-${product.tone}`">
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
            <span class="catalog-price">¥{{ product.price }}</span>
            <span v-if="product.originalPrice" class="catalog-original-price">¥{{ product.originalPrice }}</span>
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
              <label
                v-for="option in brewMethodOptions"
                :key="option.value"
                class="brew-method-option"
                :class="{ 'is-active': brewMethod === option.value }"
              >
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
            <BaseButton :disabled="product.stock === 0" @click="addToCart">加入购物车</BaseButton>
            <BaseButton variant="secondary" :disabled="product.stock === 0 || orderStore.loading" @click="buyNow">立即购买</BaseButton>
          </div>
        </div>
      </section>

      <div class="cb-container">
        <section class="detail-section">
          <h2 class="section-title">商品说明</h2>
          <div class="detail-info-grid">
            <div class="detail-info-item"><span>风味</span><strong>{{ product.flavor.join(' / ') }}</strong></div>
            <div class="detail-info-item"><span>产地</span><strong>{{ product.origin }}</strong></div>
            <div class="detail-info-item"><span>烘焙度</span><strong>{{ product.roast }}</strong></div>
            <div class="detail-info-item"><span>适合场景</span><strong>{{ product.scene }}</strong></div>
            <div class="detail-info-item"><span>保存方式</span><strong>{{ product.storage }}</strong></div>
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
                <span class="catalog-price">¥{{ item.price }}</span>
                <BaseButton size="sm" variant="outline" @click="router.push(`/coffee/${item.slug}`)">查看详情</BaseButton>
              </div>
            </BaseCard>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="cb-container cb-section">
      <EmptyState
        title="未找到该商品"
        description="该商品可能已下架，或链接地址不正确。"
        action-label="返回咖啡商城"
        @action="router.push('/coffee')"
      >
        <template #icon>□</template>
      </EmptyState>
    </div>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" :variant="toastTitle === '下单失败' ? 'error' : 'success'" :title="toastTitle">
        {{ toastMessage }}
      </BaseToast>
    </div>
  </div>
</template>

<style scoped>
.brew-method-picker {
  display: grid;
  gap: var(--cb-space-3);
  padding: var(--cb-space-4);
  border: 1px solid color-mix(in srgb, var(--cb-color-coffee) 12%, transparent);
  border-radius: var(--cb-radius-lg);
  background: color-mix(in srgb, var(--cb-color-cream) 86%, white);
}

.brew-method-picker strong {
  color: var(--cb-color-coffee);
}

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
  align-items: center;
  gap: var(--cb-space-2);
  min-height: 2.5rem;
  padding: 0 var(--cb-space-4);
  border: 1px solid color-mix(in srgb, var(--cb-color-coffee) 14%, transparent);
  border-radius: var(--cb-radius-pill);
  color: var(--cb-color-coffee);
  cursor: pointer;
  background: white;
}

.brew-method-option input {
  accent-color: var(--cb-color-coffee);
}

.brew-method-option.is-active {
  border-color: color-mix(in srgb, var(--cb-color-gold) 78%, var(--cb-color-coffee));
  background: color-mix(in srgb, var(--cb-color-gold) 18%, white);
  box-shadow: var(--cb-shadow-soft);
}
</style>
