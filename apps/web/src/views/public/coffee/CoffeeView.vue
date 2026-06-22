<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { resolveUploadUrl } from '@/api/upload'
import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseInput,
  BasePagination,
  BaseSelect,
  BaseSkeleton,
  BaseTabs,
  EmptyState,
} from '@/components/base'
import { useProductsStore } from '@/stores/products'
import { debounce } from '@/utils'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useTiltCard } from '@/composables/useTiltCard'
import '@/assets/styles/pages/catalog.css'

const router = useRouter()
const productsStore = useProductsStore()
const keyword = ref('')
const productType = ref('all')
const sort = ref('recommended')
const page = ref(1)
const pageSize = 8
const pageRef = ref(null)
const { revealCards } = useGsapReveal(pageRef)
const { floatEmpty, pulseBadge } = useAnimeMotion()
const { bindTiltCards } = useTiltCard(pageRef)

const productTypes = [
  { label: '全部', value: 'all' },
  { label: '咖啡商品', value: 'coffee' },
  { label: '文创商品', value: 'cultural' },
]

const sortOptions = [
  { label: '默认推荐', value: 'recommended' },
  { label: '价格从低到高', value: 'price-asc' },
  { label: '价格从高到低', value: 'price-desc' },
  { label: '销量优先', value: 'sales' },
]

const sortMap = { recommended: 'default', 'price-asc': 'price_asc', 'price-desc': 'price_desc', sales: 'sales_desc' }
const visibleProducts = computed(() => productsStore.items)
const totalProducts = computed(() => productsStore.meta?.total ?? visibleProducts.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalProducts.value / pageSize)))
const availableCount = computed(() => visibleProducts.value.filter((product) => product.stock > 0).length)
const discountCount = computed(() => visibleProducts.value.filter((product) => product.originalPrice && product.originalPrice > product.price).length)
const recommendedCount = computed(() => visibleProducts.value.filter((product) => product.recommended).length)
const todayRecommendation = computed(() =>
  visibleProducts.value.find((product) => product.recommended && product.stock > 0)
  || visibleProducts.value.find((product) => product.stock > 0)
  || null,
)

function loadProducts() {
  return productsStore.fetchProducts({
    page: page.value,
    pageSize,
    keyword: keyword.value.trim(),
    productType: productType.value,
    sort: sortMap[sort.value],
  })
}

const scheduleLoad = debounce(loadProducts, 250)

function clearFilters() {
  keyword.value = ''
  productType.value = 'all'
  sort.value = 'recommended'
}

function scrollToProducts() {
  document.querySelector('#coffee-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function openTodayRecommendation() {
  sort.value = 'recommended'
  productType.value = 'all'
  page.value = 1
  await loadProducts()
  const recommended = visibleProducts.value.find((item) => item.stock > 0) || visibleProducts.value[0]
  if (recommended) await router.push(`/coffee/${recommended.slug}`)
}

watch([keyword, productType, sort], () => {
  page.value = 1
  scheduleLoad()
})
watch(page, loadProducts)
onMounted(loadProducts)
onBeforeUnmount(scheduleLoad.cancel)
watch(() => visibleProducts.value.map((product) => product.id).join(','), async () => {
  await nextTick()
  revealCards('.catalog-card', { key: 'products', limit: 20 })
  bindTiltCards()
  pulseBadge(pageRef.value?.querySelector('.today-recommendation .base-badge'))
  floatEmpty(pageRef.value?.querySelector('.catalog-empty'))
}, { flush: 'post' })
</script>

<template>
  <div ref="pageRef" class="catalog-page catalog-enter">
    <section class="catalog-hero">
      <div class="cb-container catalog-hero__grid">
        <div class="catalog-hero__copy">
          <BaseBadge variant="premium">Coffee Book Roastery</BaseBadge>
          <h1>咖啡商城</h1>
          <p>从手冲豆到城市随行杯，把咖啡馆带回你的日常。</p>
          <div class="catalog-hero__actions">
            <BaseButton @click="productType = 'all'">查看全部商品</BaseButton>
            <BaseButton variant="outline" @click="openTodayRecommendation">今日推荐</BaseButton>
          </div>
        </div>
        <div class="catalog-hero__art coffee-hero-art" aria-label="咖啡器具插画">
          <div class="coffee-hero-art__ring" />
          <div class="product-art__cup" />
          <span class="coffee-hero-art__bean coffee-hero-art__bean--one" />
          <span class="coffee-hero-art__bean coffee-hero-art__bean--two" />
          <p>Roasted for your everyday ritual.</p>
        </div>
      </div>
    </section>

    <div class="cb-container catalog-toolbar">
      <div class="catalog-toolbar__surface">
        <div class="catalog-toolbar__controls">
          <BaseInput v-model="keyword" search placeholder="搜索商品名、风味、产地" />
          <BaseSelect v-model="sort" aria-label="商品排序" :options="sortOptions" />
        </div>
        <BaseTabs v-model="productType" class="catalog-tabs" :tabs="productTypes" />
      </div>
    </div>

    <main class="cb-container cb-section">
      <section v-if="todayRecommendation" class="today-recommendation" @click="router.push(`/coffee/${todayRecommendation.slug}`)">
        <div>
          <BaseBadge variant="premium">今日推荐</BaseBadge>
          <h2>{{ todayRecommendation.name }}</h2>
          <p>{{ todayRecommendation.description || (todayRecommendation.flavor || []).join(' / ') }}</p>
        </div>
        <div class="today-recommendation__actions" @click.stop>
          <BaseButton size="sm" @click="router.push(`/coffee/${todayRecommendation.slug}`)">查看详情</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="scrollToProducts">查看更多</BaseButton>
        </div>
      </section>
      <section class="catalog-stats" aria-label="商品统计">
        <div class="catalog-stat"><strong>{{ totalProducts }}</strong><span>商品数量</span></div>
        <div class="catalog-stat"><strong>{{ availableCount }}</strong><span>有货商品</span></div>
        <div class="catalog-stat"><strong>{{ discountCount }}</strong><span>会员优惠</span></div>
        <div class="catalog-stat"><strong>{{ recommendedCount }}</strong><span>今日推荐</span></div>
      </section>

      <p v-if="productsStore.error" class="text-muted" role="status">API 暂不可用，当前展示本地数据。</p>

      <div id="coffee-products" class="catalog-grid">
        <BaseSkeleton v-if="productsStore.loading" v-for="index in pageSize" :key="`product-loading-${index}`" variant="card" />
        <BaseCard v-for="product in visibleProducts" :key="product.id" class="catalog-card" variant="hover" data-cursor="BUY" data-tilt-card>
          <div class="catalog-card__visual" data-tilt-layer="1.35">
            <img v-if="product.imageUrl" class="catalog-card__image" :src="resolveUploadUrl(product.imageUrl)" :alt="product.name" loading="lazy" decoding="async" />
            <div v-else class="product-art catalog-card__visual-inner" :class="`tone-${product.tone}`">
              <div class="product-art__cup" />
              <span class="product-art__label">{{ product.origin }}</span>
            </div>
          </div>
          <div class="catalog-card__body" data-tilt-layer="0.65">
            <div class="catalog-card__topline">
              <BaseBadge variant="neutral">{{ product.category }}</BaseBadge>
              <BaseBadge :variant="product.stock > 0 ? 'success' : 'danger'">{{ product.stock > 0 ? '有库存' : '已售罄' }}</BaseBadge>
            </div>
            <h2>{{ product.name }}</h2>
            <p>{{ product.flavor.join(' / ') }}</p>
            <div class="catalog-price-row">
              <span class="catalog-price">￥{{ product.price }}</span>
              <span v-if="product.originalPrice" class="catalog-original-price">￥{{ product.originalPrice }}</span>
              <small>已售 {{ product.sales }}</small>
            </div>
            <div class="catalog-card__actions">
              <BaseButton size="sm" variant="outline" @click="router.push(`/coffee/${product.slug}`)">查看详情</BaseButton>
            </div>
          </div>
        </BaseCard>

        <EmptyState
          v-if="!productsStore.loading && !visibleProducts.length"
          class="catalog-empty"
          title="暂无匹配商品"
          description="尝试更换关键词或分类，继续探索 Coffee Book 精选商品。"
          action-label="清空筛选"
          @action="clearFilters"
        >
          <template #icon>!</template>
        </EmptyState>
      </div>

      <div v-if="totalProducts" class="catalog-pagination">
        <BasePagination v-model="page" :total-pages="totalPages" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.coffee-hero-art__ring {
  position: absolute;
  width: 13rem;
  height: 13rem;
  border: var(--cb-space-3) solid color-mix(in srgb, var(--cb-color-gold) 34%, transparent);
  border-radius: var(--cb-radius-pill);
}
.coffee-hero-art > .product-art__cup {
  z-index: 1;
  width: 9rem;
  height: 7.5rem;
}
.coffee-hero-art__bean {
  position: absolute;
  width: 2.5rem;
  height: 1.4rem;
  background: var(--cb-color-caramel);
  border-radius: var(--cb-radius-pill);
}
.coffee-hero-art__bean--one {
  top: 22%;
  left: 18%;
  transform: rotate(30deg);
}
.coffee-hero-art__bean--two {
  right: 16%;
  bottom: 24%;
  transform: rotate(-22deg);
}
.coffee-hero-art p {
  position: absolute;
  bottom: var(--cb-space-4);
  color: var(--cb-color-cream);
  font-size: var(--cb-font-size-xs);
  letter-spacing: 0.12em;
}
.catalog-card__image {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 12rem;
  object-fit: cover;
}
.today-recommendation {
  display: flex;
  margin-bottom: var(--cb-space-6);
  padding: var(--cb-space-6);
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-5);
  color: var(--cb-text-primary);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  box-shadow: var(--cb-shadow-sm);
  cursor: pointer;
  transition: transform var(--cb-duration-fast) var(--cb-ease-standard), box-shadow var(--cb-duration-fast) var(--cb-ease-standard);
}
.today-recommendation:hover { box-shadow: var(--cb-shadow-md); transform: translateY(-2px); }
.today-recommendation h2 { margin-top: var(--cb-space-2); }
.today-recommendation p { margin-top: var(--cb-space-2); color: var(--cb-text-secondary); }
.today-recommendation__actions { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }
@media (max-width: 40rem) { .today-recommendation { align-items: stretch; flex-direction: column; } }
</style>
