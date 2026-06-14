<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  EmptyState,
} from '@/components/base'
import { books as localBooks } from '@/data/books'
import { useBooksStore } from '@/stores/books'
import '@/assets/styles/pages/catalog.css'

const router = useRouter()
const booksStore = useBooksStore()
const keyword = ref('')
const category = ref('全部')
const sort = ref('recommended')
const page = ref(1)
const pageSize = 8
const favorites = ref(new Set())
let requestTimer

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
const borrowableCount = computed(() => visibleBooks.value.filter((book) => book.stock > 0).length)
const favoriteCount = computed(() => localBooks.reduce((total, book) => total + (book.favorites || 0), 0))

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

watch([keyword, category, sort], () => {
  page.value = 1
  clearTimeout(requestTimer)
  requestTimer = setTimeout(loadBooks, 250)
})
watch(page, loadBooks)
onMounted(loadBooks)

function clearFilters() {
  keyword.value = ''
  category.value = '全部'
  sort.value = 'recommended'
}

function toggleFavorite(id) {
  const next = new Set(favorites.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  favorites.value = next
}
</script>

<template>
  <div class="catalog-page catalog-enter">
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
        <BaseTabs v-model="category" class="catalog-tabs" :tabs="categories" />
      </div>
    </div>

    <main class="cb-container cb-section">
      <section class="catalog-stats" aria-label="图书统计">
        <div class="catalog-stat"><strong>{{ totalBooks }}</strong><span>全部图书数量</span></div>
        <div class="catalog-stat"><strong>{{ visibleBooks.length }}</strong><span>当前页数量</span></div>
        <div class="catalog-stat"><strong>{{ borrowableCount }}</strong><span>可借阅数量</span></div>
        <div class="catalog-stat"><strong>{{ favoriteCount.toLocaleString('zh-CN') }}</strong><span>收藏人数</span></div>
      </section>

      <p v-if="booksStore.error" class="text-muted" role="status">API 暂不可用，当前展示本地数据。</p>

      <div class="catalog-grid">
        <BaseSkeleton v-if="booksStore.loading" v-for="index in pageSize" :key="`book-loading-${index}`" variant="card" />
        <BaseCard v-for="book in visibleBooks" :key="book.id" class="catalog-card" variant="hover">
          <div class="catalog-card__visual">
            <button
              class="catalog-card__favorite"
              :class="{ 'is-active': favorites.has(book.id) }"
              type="button"
              :aria-label="favorites.has(book.id) ? `取消收藏《${book.title}》` : `收藏《${book.title}》`"
              :aria-pressed="favorites.has(book.id)"
              @click="toggleFavorite(book.id)"
            >
              {{ favorites.has(book.id) ? '♥' : '♡' }}
            </button>
            <div class="book-cover catalog-card__visual-inner" :class="`tone-${book.coverTone}`">
              <span>{{ book.category }}</span><strong>{{ book.title }}</strong><small>Coffee Book Edition</small>
            </div>
          </div>
          <div class="catalog-card__body">
            <div class="catalog-card__topline">
              <BaseBadge variant="neutral">{{ book.category }}</BaseBadge>
              <span class="catalog-card__rating">★ {{ book.rating }}</span>
            </div>
            <h2>{{ book.title }}</h2>
            <span class="catalog-card__author">{{ book.author }}</span>
            <BaseBadge :variant="book.stock > 0 ? 'success' : 'danger'">{{ book.status }}</BaseBadge>
            <p>{{ book.summary }}</p>
            <div class="catalog-card__actions">
              <BaseButton size="sm" @click="router.push(`/books/${book.slug}`)">查看详情</BaseButton>
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
</style>
