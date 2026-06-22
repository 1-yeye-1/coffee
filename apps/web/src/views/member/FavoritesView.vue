<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, BaseTabs, EmptyState, ErrorPanel } from '@/components/base'
import { useMembershipStore } from '@/stores/membership'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const membershipStore = useMembershipStore()
const type = ref('book')
const tabs = [
  { label: '收藏图书', value: 'book' }, { label: '收藏商品', value: 'product' },
  { label: '收藏帖子', value: 'post' }, { label: '收藏活动', value: 'event' },
]
const items = computed(() => membershipStore.favorites.filter((item) => item.targetType === type.value))
const pathFor = (item) => ({ book: '/books/', product: '/coffee/', post: '/community/', event: '/events/' }[item.targetType] + item.slug)

onMounted(() => membershipStore.fetchFavorites())
</script>

<template>
  <div class="member-page">
    <header><span class="section-eyebrow">Favorites</span><h2 class="page-title">我的收藏</h2></header>
    <ErrorPanel v-if="membershipStore.error" :message="membershipStore.error" @retry="membershipStore.fetchFavorites" />
    <BaseSkeleton v-else-if="membershipStore.loading" variant="card" />
    <BaseTabs v-model="type" :tabs="tabs"><div class="favorite-grid">
      <article v-for="item in items" :key="item.id" class="favorite-card">
        <BaseBadge variant="neutral">{{ item.category }}</BaseBadge><h3>{{ item.title }}</h3><p>{{ item.meta }}</p>
        <div class="cb-cluster"><BaseButton size="sm" variant="outline" @click="router.push(pathFor(item))">查看详情</BaseButton><BaseButton size="sm" variant="ghost" @click="membershipStore.removeFavorite(item.id)">取消收藏</BaseButton></div>
      </article>
      <EmptyState v-if="!items.length && !membershipStore.loading" title="暂无收藏" description="你收藏的内容会出现在这里。" action-label="去发现内容" @action="router.push('/')"><template #icon>◇</template></EmptyState>
    </div></BaseTabs>
  </div>
</template>
