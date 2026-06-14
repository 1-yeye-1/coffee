<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseInput,
  BasePagination,
  BaseSelect,
  BaseSkeleton,
  BaseTabs,
  BaseToast,
  EmptyState,
} from '@/components/base'
import { products as localProducts } from '@/data/products'
import { useCartStore } from '@/stores/cart'
import { useProductsStore } from '@/stores/products'
import '@/assets/styles/pages/catalog.css'

const router = useRouter()
const cartStore = useCartStore()
const productsStore = useProductsStore()
const keyword = ref('')
const category = ref('全部')
const sort = ref('recommended')
const page = ref(1)
const toastVisible = ref(false)
const pageSize = 8
let requestTimer

const categories = ['全部', '手冲咖啡', '冷萃', '拿铁', '咖啡豆', '杯具', '礼盒'].map((item) => ({
  label: item,
  value: item,
}))

const sortOptions = [
  { label: '默认推荐', value: 'recommended' },
  { label: '价格从低到高', value: 'price-asc' },
  { label: '价格从高到低', value: 'price-desc' },
  { label: '销量优先', value: 'sales' },
]

const visibleProducts = computed(() => productsStore.items)
const totalProducts = computed(() => productsStore.meta?.total ?? visibleProducts.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalProducts.value / pageSize)))
const availableCount = computed(() => visibleProducts.value.filter((product) => product.stock > 0).length)
const discountCount = computed(
  () => localProducts.filter((product) => product.originalPrice && product.originalPrice > product.price).length,
)
const recommendedCount = computed(() => localProducts.filter((product) => product.recommended).length)

const sortMap = { recommended: 'default', 'price-asc': 'price_asc', 'price-desc': 'price_desc', sales: 'sales_desc' }

function loadProducts() {
  return productsStore.fetchProducts({
    page: page.value,
    pageSize,
    keyword: keyword.value.trim(),
    category: category.value === '全部' ? 'all' : category.value,
    sort: sortMap[sort.value],
  })
}

watch([keyword, category, sort], () => {
  page.value = 1
  clearTimeout(requestTimer)
  requestTimer = setTimeout(loadProducts, 250)
})
watch(page, loadProducts)
onMounted(loadProducts)

function clearFilters() {
  keyword.value = ''
  category.value = '全部'
  sort.value = 'recommended'
}

function addToCart(product) {
  cartStore.addItem(product, 1)
  toastVisible.value = false
  nextTick(() => {
    toastVisible.value = true
  })
}
</script>

<template>
  <div class="catalog-page catalog-enter">
    <section class="catalog-hero">
      <div class="cb-container catalog-hero__grid">
        <div class="catalog-hero__copy">
          <BaseBadge variant="premium">Coffee Book Roastery</BaseBadge>
          <h1>咖啡商城</h1>
          <p>从手冲豆到城市随行杯，把咖啡馆带回你的日常。</p>
          <div class="catalog-hero__actions">
            <BaseButton @click="category = '全部'">查看全部商品</BaseButton>
            <BaseButton variant="outline" @click="sort = 'recommended'">今日推荐</BaseButton>
          </div>
        </div>
        <div class="catalog-hero__art coffee-hero-art" aria-label="咖啡器具艺术插画">
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
          <BaseInput v-model="keyword" search placeholder="搜索商品名、风味、产地">
            <template #prefix>⌕</template>
          </BaseInput>
          <BaseSelect v-model="sort" aria-label="商品排序" :options="sortOptions" />
        </div>
        <BaseTabs v-model="category" class="catalog-tabs" :tabs="categories" />
      </div>
    </div>

    <main class="cb-container cb-section">
      <section class="catalog-stats" aria-label="商品统计">
        <div class="catalog-stat"><strong>{{ totalProducts }}</strong><span>商品数量</span></div>
        <div class="catalog-stat"><strong>{{ availableCount }}</strong><span>有货商品</span></div>
        <div class="catalog-stat"><strong>{{ discountCount }}</strong><span>会员优惠</span></div>
        <div class="catalog-stat"><strong>{{ recommendedCount }}</strong><span>今日推荐</span></div>
      </section>

      <p v-if="productsStore.error" class="text-muted" role="status">API 暂不可用，当前展示本地数据。</p>

      <div class="catalog-grid">
        <BaseSkeleton v-if="productsStore.loading" v-for="index in pageSize" :key="`product-loading-${index}`" variant="card" />
        <BaseCard
          v-for="product in visibleProducts"
          :key="product.id"
          class="catalog-card"
          variant="hover"
        >
          <div class="catalog-card__visual">
            <div class="product-art catalog-card__visual-inner" :class="`tone-${product.tone}`">
              <div class="product-art__cup" />
              <span class="product-art__label">{{ product.origin }}</span>
            </div>
          </div>
          <div class="catalog-card__body">
            <div class="catalog-card__topline">
              <BaseBadge variant="neutral">{{ product.category }}</BaseBadge>
              <BaseBadge :variant="product.stock > 0 ? 'success' : 'danger'">{{ product.status }}</BaseBadge>
            </div>
            <h2>{{ product.name }}</h2>
            <p>{{ product.flavor.join(' · ') }}</p>
            <div class="catalog-price-row">
              <span class="catalog-price">¥{{ product.price }}</span>
              <span v-if="product.originalPrice" class="catalog-original-price">¥{{ product.originalPrice }}</span>
              <small>已售 {{ product.sales }}</small>
            </div>
            <div class="catalog-card__actions">
              <BaseButton
                size="sm"
                :disabled="product.stock === 0"
                @click="addToCart(product)"
              >
                加入购物车
              </BaseButton>
              <BaseButton
                size="sm"
                variant="outline"
                @click="router.push(`/coffee/${product.slug}`)"
              >
                查看详情
              </BaseButton>
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
          <template #icon>◇</template>
        </EmptyState>
      </div>

      <div v-if="totalProducts" class="catalog-pagination">
        <BasePagination v-model="page" :total-pages="totalPages" />
      </div>
    </main>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" title="已加入购物车">
        商品已加入购物车。
      </BaseToast>
    </div>
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
</style>
