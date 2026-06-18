<script setup>
import { computed } from 'vue'

import { BaseBadge, BaseButton } from '@/components/base'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

defineEmits(['read', 'remove', 'open'])

const typeMeta = {
  system: { label: '系统', variant: 'premium', mark: 'S' },
  order: { label: '订单', variant: 'warning', mark: 'O' },
  booking: { label: '预约', variant: 'success', mark: 'B' },
  activity: { label: '活动', variant: 'info', mark: 'A' },
  community: { label: '社区', variant: 'neutral', mark: 'C' },
  audit: { label: '审核', variant: 'danger', mark: 'R' },
}

const meta = computed(() => typeMeta[props.item.type] || typeMeta.system)

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <article class="notification-bubble" :class="{ 'is-unread': !item.isRead }" @click="$emit('open', item)">
    <div class="notification-bubble__avatar" aria-hidden="true">{{ meta.mark }}</div>
    <div class="notification-bubble__content">
      <div class="notification-bubble__meta">
        <BaseBadge :variant="meta.variant">{{ meta.label }}</BaseBadge>
        <span v-if="!item.isRead" class="notification-bubble__dot">未读</span>
        <time>{{ formatDate(item.createdAt) }}</time>
      </div>
      <div class="notification-bubble__card">
        <h4>{{ item.title }}</h4>
        <p>{{ item.content }}</p>
      </div>
      <div class="notification-bubble__actions" @click.stop>
        <BaseButton v-if="!item.isRead" size="sm" variant="ghost" @click="$emit('read', item)">标记已读</BaseButton>
        <BaseButton v-if="item.relatedId && item.relatedType" size="sm" variant="outline" @click="$emit('open', item)">查看相关内容</BaseButton>
        <BaseButton size="sm" variant="danger" @click="$emit('remove', item)">删除</BaseButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.notification-bubble {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--cb-space-3);
  align-items: start;
  cursor: pointer;
}
.notification-bubble__avatar {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  color: var(--cb-color-coffee);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  background: color-mix(in srgb, var(--cb-color-gold) 20%, var(--cb-bg-soft));
  border-radius: var(--cb-radius-pill);
}
.notification-bubble__content {
  display: grid;
  gap: var(--cb-space-2);
}
.notification-bubble__meta,
.notification-bubble__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}
.notification-bubble__meta time {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-xs);
}
.notification-bubble__dot {
  color: var(--cb-danger);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
}
.notification-bubble__card {
  padding: var(--cb-space-3) var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}
.notification-bubble.is-unread .notification-bubble__card {
  border-color: color-mix(in srgb, var(--cb-color-gold) 48%, var(--cb-border-soft));
  background: color-mix(in srgb, var(--cb-color-cream) 40%, var(--cb-bg-surface));
}
.notification-bubble__card h4 {
  margin-bottom: var(--cb-space-1);
  font-size: var(--cb-font-size-md);
}
.notification-bubble__card p {
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
}
</style>
