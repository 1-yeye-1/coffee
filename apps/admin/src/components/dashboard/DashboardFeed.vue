<script setup>
import { BaseButton, EmptyState } from '@/components/base'

defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  emptyTitle: { type: String, default: '暂无数据' },
})

defineEmits(['view-all', 'open'])
</script>

<template>
  <article class="admin-panel">
    <div class="admin-panel__header"><h2>{{ title }}</h2><BaseButton size="sm" variant="ghost" @click="$emit('view-all')">查看全部</BaseButton></div>
    <div class="dashboard-feed">
      <button v-for="item in items" :key="item.id" class="dashboard-feed__item" type="button" @click="$emit('open', item)">
        <slot :item="item" />
      </button>
      <EmptyState v-if="!items.length" :title="emptyTitle" />
    </div>
  </article>
</template>
