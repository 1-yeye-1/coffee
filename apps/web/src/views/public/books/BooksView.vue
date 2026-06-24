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
  ErrorPanel,
} from '@/components/base'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useMembershipStore } from '@/stores/membership'
import { debounce } from '@/utils'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useTiltCard } from '@/composables/useTiltCard'
import '@/assets/styles/pages/catalog.css'

const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const membershipStore = useMembershipStore()
const keyword = ref('')
const category = ref('全部')
const sort = ref('recommended')
const page = ref(1)
const pageSize = 8
const pageRef = ref(null)
const { revealCards } = useGsapReveal(pageRef)
const { popLike, floatEmpty } = useAnimeMotion()
const { bindTiltCards } = useTiltCard(pageRef)

const categories = ['全部', '文学', '商业', '艺术', '生活', '心理', '设计'].map((item) => ({
  label: item,
  value: item,
}))

const sortOptions = [
  { label: '默认推荐', value: 'recommended' },
  { label: '评分最高', value: 'rating' },
  { label: '最新上架', value: 'latest' },
  { label: '库存优先', value: 'stock' },
]

const visibleBooks = computed(() => booksStore.items)
const totalBooks = computed(() => booksStore.meta?.total ?? visibleBooks.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalBooks.value / pageSize)))
const borrowableCount = computed(() => visibleBooks.value.filter((book) => book.reservableStock > 0).length)
const favoriteCount = computed(() => visibleBooks.value.reduce((total, book) => total + Number(book.favorites || 0), 0))

const sortMap = { recommended: 'default', rating: 'rating_desc', latest: 'newest', stock: 'stock_desc' }

function loadBooks() {
  return booksStore.fetchBooks({
    page: page.value,
    pageSize,
    keyword: keyword.value.trim(),
    category: category.value === '全部' ? 'all' : category.value,
    sort: sortMap[sort.value],
  })
}

const scheduleLoad = debounce(loadBooks, 250)

watch([keyword, category, sort], () => {
  page.value = 1
  scheduleLoad()
})
watch(page, loadBooks)
onMounted(async () => { await loadBooks(); if (authStore.isAuthenticated) await membershipStore.fetchFavorites() })
onBeforeUnmount(scheduleLoad.cancel)

function clearFilters() {
  keyword.value = ''
  category.value = '全部'
  sort.value = 'recommended'
}

function handleImageError(event) {
  event.currentTarget.hidden = true
}

async function toggleFavorite(id, event) {
  if (!authStore.isAuthenticated) return router.push({ path: '/login', query: { redirect: '/books' } })
  await membershipStore.toggleFavorite('book', id)
  popLike(event?.currentTarget)
}

watch(() => visibleBooks.value.map((book) => book.id).join(','), async () => {
  if (booksStore.loading) return
  await nextTick()
  revealCards('.catalog-card', { key: 'books', limit: 20 })
  bindTiltCards()
  floatEmpty(pageRef.value?.querySelector('.catalog-empty'))
}, { flush: 'post' })
</script>

<template>
  <div ref="pageRef" class="catalog-page catalog-enter">
    <section class="catalog-hero">
      <div class="cb-container catalog-hero__grid">
        <div class="catalog-hero__copy">
          <BaseBadge variant="premium">Coffee Book Library</BaseBadge>
          <h1>图书中心</h1>
          <p>在咖啡香气里，发现下一本改变你的书。</p>
        </div>
        <div class="catalog-hero__art books-hero-art" aria-label="书架与阅读艺术插画">
          <div class="books-hero-art__shelf">
            <span v-for="tone in ['sunset', 'forest', 'gold', 'night', 'rose']" :key="tone" :class="`tone-${tone}`" />
          </div>
          <div class="books-hero-art__lamp" />
          <p>Curated reads for curious minds.</p>
        </div>
      </div>
    </section>

    <div class="cb-container catalog-toolbar">
      <div class="catalog-toolbar__surface">
        <div class="catalog-toolbar__controls">
          <BaseInput v-model="keyword" search placeholder="搜索书名、作者、关键词">
            <template #prefix>⌕</template>
          </BaseInput>
          <BaseSelect v-model="sort" aria-label="图书排序" :options="sortOptions" />
        </div>
        <BaseTabs v-model="category" class="catalog-tabs" variant="books" aria-label="图书分类" :tabs="categories" />
      </div>
    </div>

    <main class="cb-container cb-section">
      <section class="catalog-stats" aria-label="图书统计">
        <div class="catalog-stat"><strong>{{ totalBooks }}</strong><span>全部图书数量</span></div>
        <div class="catalog-stat"><strong>{{ visibleBooks.length }}</strong><span>当前页数量</span></div>
        <div class="catalog-stat"><strong>{{ borrowableCount }}</strong><span>可预约图书</span></div>
        <div class="catalog-stat"><strong>{{ favoriteCount.toLocaleString('zh-CN') }}</strong><span>收藏人数</span></div>
      </section>

      <ErrorPanel v-if="booksStore.error" title="图书加载失败" :message="booksStore.error" @retry="loadBooks" />

      <div class="catalog-grid">
        <BaseSkeleton v-if="booksStore.loading" v-for="index in pageSize" :key="`book-loading-${index}`" variant="card" />
        <BaseCard v-for="book in visibleBooks" :key="book.id" class="catalog-card" variant="interactive" data-cursor="READ" data-tilt-card @click="router.push(`/books/${book.slug}`)">
          <div class="catalog-card__visual" data-tilt-layer="1.35">
            <button
              class="catalog-card__favorite"
              :class="{ 'is-active': membershipStore.isFavorite('book', book.id) }"
              type="button"
              :aria-label="membershipStore.isFavorite('book', book.id) ? `取消收藏《${book.title}》` : `收藏《${book.title}》`"
              :aria-pressed="membershipStore.isFavorite('book', book.id)"
              @click="toggleFavorite(book.id, $event)"
            >
              {{ membershipStore.isFavorite('book', book.id) ? '♥' : '♡' }}
            </button>
            <img v-if="book.coverUrl" class="catalog-content-image" :src="resolveUploadUrl(book.coverUrl)" :alt="book.title" loading="lazy" decoding="async" @error="handleImageError" />
            <div v-else class="book-cover catalog-card__visual-inner" :class="`tone-${book.coverTone}`">
              <span>{{ book.category }}</span><strong>{{ book.title }}</strong><small>Coffee Book Edition</small>
            </div>
          </div>
          <div class="catalog-card__body" data-tilt-layer="0.65">
            <div class="catalog-card__topline">
              <BaseBadge variant="neutral">{{ book.category }}</BaseBadge>
              <span class="catalog-card__rating">★ {{ book.rating }}</span>
            </div>
            <h2>{{ book.title }}</h2>
            <span class="catalog-card__author">{{ book.author }}</span>
            <BaseBadge :variant="book.reservableStock > 0 ? 'success' : 'danger'">{{ book.reservableStock > 0 ? '可预约' : '预约已满' }}</BaseBadge>
            <BaseBadge v-if="book.isRecommended || book.isFeatured" variant="premium">推荐</BaseBadge>
            <BaseBadge v-if="book.isNew" variant="success">新书</BaseBadge>
            <BaseBadge v-if="book.stock > 0 && book.stock <= book.lowStockThreshold" variant="warning">低库存</BaseBadge>
            <p>{{ book.summary }}</p>
            <div class="catalog-card__actions">
              <BaseButton size="sm" @click.stop="router.push(`/books/${book.slug}`)">查看详情</BaseButton>
            </div>
          </div>
        </BaseCard>

        <EmptyState
          v-if="!booksStore.loading && !visibleBooks.length"
          class="catalog-empty"
          title="暂无匹配图书"
          description="尝试更换关键词或分类，继续发现值得阅读的内容。"
          action-label="清空筛选"
          @action="clearFilters"
        >
          <template #icon>◇</template>
        </EmptyState>
      </div>

      <div v-if="totalBooks" class="catalog-pagination">
        <BasePagination v-model="page" :total-pages="totalPages" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.books-hero-art__shelf {
  position: absolute;
  right: 12%;
  bottom: 24%;
  left: 12%;
  display: flex;
  height: 9rem;
  gap: var(--cb-space-2);
  align-items: flex-end;
  border-bottom: var(--cb-space-2) solid var(--cb-color-caramel);
}

.books-hero-art__shelf span {
  width: 16%;
  height: 72%;
  border-radius: var(--cb-radius-xs) var(--cb-radius-xs) 0 0;
  box-shadow: var(--cb-shadow-md);
}

.books-hero-art__shelf span:nth-child(2) { height: 88%; }
.books-hero-art__shelf span:nth-child(3) { height: 64%; }
.books-hero-art__shelf span:nth-child(4) { height: 96%; }
.books-hero-art__shelf span:nth-child(5) { height: 78%; }

.books-hero-art__lamp {
  position: absolute;
  top: 16%;
  right: 12%;
  width: 5rem;
  height: 3.5rem;
  background: var(--cb-color-gold);
  border-radius: var(--cb-radius-pill) var(--cb-radius-pill) var(--cb-radius-sm) var(--cb-radius-sm);
  box-shadow: var(--cb-shadow-glow);
}

.books-hero-art p {
  position: absolute;
  bottom: var(--cb-space-4);
  color: var(--cb-color-cream);
  font-size: var(--cb-font-size-xs);
  letter-spacing: 0.12em;
}
.catalog-card__visual { aspect-ratio: 3 / 4; background: linear-gradient(135deg, var(--cb-bg-soft), color-mix(in srgb, var(--cb-color-gold) 16%, var(--cb-bg-surface))); }
.catalog-content-image { display:block; width:100%; height:100%; min-height:18rem; object-fit:cover; }
</style>
