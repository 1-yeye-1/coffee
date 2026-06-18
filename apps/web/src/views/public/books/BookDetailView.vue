<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveUploadUrl } from '@/api/upload'

import { BaseBadge, BaseButton, BaseCard, EmptyState } from '@/components/base'
import { books } from '@/data/books'
import { useBooksStore } from '@/stores/books'
import '@/assets/styles/pages/catalog.css'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const favorite = ref(false)
const book = computed(() => booksStore.currentBook)
const recommendations = computed(() => {
  if (!book.value) return []
  const sameCategory = books.filter(
    (item) => item.id !== book.value.id && item.category === book.value.category,
  )
  const others = books.filter(
    (item) => item.id !== book.value.id && item.category !== book.value.category,
  )
  return [...sameCategory, ...others].slice(0, 4)
})

function loadBook() {
  return booksStore.fetchBookDetail(route.params.slug)
}

watch(() => route.params.slug, loadBook)
onMounted(loadBook)
</script>

<template>
  <div class="catalog-detail catalog-enter">
    <div class="cb-container detail-back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/books')">← 返回图书中心</BaseButton>
    </div>

    <p v-if="booksStore.error && book" class="cb-container text-muted" role="status">API 暂不可用，当前展示本地图书资料。</p>

    <template v-if="book">
      <section class="cb-container detail-hero">
        <div class="detail-visual">
          <img v-if="book.coverUrl" class="detail-content-image" :src="resolveUploadUrl(book.coverUrl)" :alt="book.title" />
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
          <span class="detail-rating">★ {{ book.rating }} · {{ book.favorites.toLocaleString('zh-CN') }} 人收藏</span>
          <p class="page-subtitle">{{ book.summary }}</p>
          <div class="detail-actions">
            <BaseButton :variant="favorite ? 'secondary' : 'outline'" @click="favorite = !favorite">
              {{ favorite ? '已收藏' : '加入收藏' }}
            </BaseButton>
            <BaseButton :disabled="book.stock === 0">预约阅读 / 查看馆藏</BaseButton>
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
                <BaseButton size="sm" variant="outline" @click="router.push(`/books/${item.slug}`)">查看详情</BaseButton>
              </div>
            </BaseCard>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="cb-container cb-section">
      <EmptyState
        title="未找到这本图书"
        description="该图书可能已下架，或链接地址不正确。"
        action-label="返回图书中心"
        @action="router.push('/books')"
      >
        <template #icon>◇</template>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.detail-content-image { display:block; width:100%; height:100%; min-height:28rem; object-fit:cover; border-radius:var(--cb-radius-xl); }
</style>
