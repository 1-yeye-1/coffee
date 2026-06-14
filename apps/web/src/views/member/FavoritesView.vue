<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseTabs, EmptyState } from '@/components/base'
import { books } from '@/data/books'
import { products } from '@/data/products'
import { useCommunityStore } from '@/stores/community'
import { useMembershipStore } from '@/stores/membership'
import '@/assets/styles/pages/engagement.css'
import { ref } from 'vue'

const router = useRouter()
const membershipStore = useMembershipStore()
const communityStore = useCommunityStore()
const type = ref('books')
const tabs = [{ label: '收藏图书', value: 'books' }, { label: '收藏商品', value: 'products' }, { label: '收藏帖子', value: 'posts' }]
const items = computed(() => {
  if (type.value === 'books') return books.filter((item) => membershipStore.account.favoriteBookSlugs.includes(item.slug)).map((item) => ({ ...item, name: item.title, meta: item.author, path: `/books/${item.slug}` }))
  if (type.value === 'products') return products.filter((item) => membershipStore.account.favoriteProductSlugs.includes(item.slug)).map((item) => ({ ...item, meta: item.flavor.join(' · '), path: `/coffee/${item.slug}` }))
  return communityStore.posts.filter((item) => communityStore.favoriteIds.includes(item.id)).map((item) => ({ ...item, name: item.title, meta: item.author, path: `/community/${item.slug}` }))
})
</script>

<template>
  <div class="member-page">
    <header><span class="section-eyebrow">Favorites</span><h2 class="page-title">我的收藏</h2></header>
    <BaseTabs v-model="type" :tabs="tabs"><div class="favorite-grid"><article v-for="item in items" :key="item.id" class="favorite-card"><BaseBadge variant="neutral">{{ item.category || item.topic }}</BaseBadge><h3>{{ item.name }}</h3><p>{{ item.meta }}</p><BaseButton size="sm" variant="outline" @click="router.push(item.path)">查看详情</BaseButton></article><EmptyState v-if="!items.length" title="暂无收藏" description="你收藏的内容会出现在这里。" action-label="去社区看看" @action="router.push('/community')"><template #icon>◇</template></EmptyState></div></BaseTabs>
  </div>
</template>
