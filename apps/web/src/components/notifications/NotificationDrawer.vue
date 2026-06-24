<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton, EmptyState } from '@/components/base'
import { useNotificationsStore } from '@/stores/notifications'

import NotificationMessageBubble from './NotificationMessageBubble.vue'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const notificationsStore = useNotificationsStore()
const filters = reactive({ type: 'all', readStatus: 'all', page: 1, pageSize: 10 })
const selectedIds = ref([])

const typeTabs = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread', readStatus: 'unread' },
  { label: '订单', value: 'order' },
  { label: '预约', value: 'booking' },
  { label: '社区', value: 'community' },
  { label: '系统', value: 'system' },
]

const hasMore = computed(() => notificationsStore.items.length < notificationsStore.meta.total)
const allSelected = computed(() => notificationsStore.items.length > 0 && notificationsStore.items.every((item) => selectedIds.value.includes(item.id)))
const selectedItems = computed(() => notificationsStore.items.filter((item) => selectedIds.value.includes(item.id)))

function buildQuery(page = filters.page) {
  return {
    type: filters.type === 'unread' ? 'all' : filters.type,
    readStatus: filters.type === 'unread' ? 'unread' : filters.readStatus,
    page,
    pageSize: filters.pageSize,
  }
}

async function load(page = 1, append = false) {
  filters.page = page
  const previous = append ? [...notificationsStore.items] : []
  await notificationsStore.fetchNotifications(buildQuery(page))
  if (append) notificationsStore.items = [...previous, ...notificationsStore.items]
  selectedIds.value = selectedIds.value.filter((id) => notificationsStore.items.some((item) => item.id === id))
}

function close() {
  emit('update:modelValue', false)
}

async function selectFilter(tab) {
  filters.type = tab.value
  filters.readStatus = tab.readStatus || 'all'
  await load(1)
}

async function markRead(item) {
  await notificationsStore.markRead(item.id, buildQuery())
}

async function markAllRead() {
  await notificationsStore.markAllRead(buildQuery())
}

async function remove(item) {
  await notificationsStore.remove(item.id, buildQuery())
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allSelected.value ? [] : notificationsStore.items.map((item) => item.id)
}

async function markSelectedRead() {
  const ids = [...selectedIds.value]
  for (const id of ids) await notificationsStore.markRead(id, buildQuery())
  selectedIds.value = []
}

async function removeSelected() {
  const ids = [...selectedIds.value]
  for (const id of ids) await notificationsStore.remove(id, buildQuery())
  selectedIds.value = []
}

function targetPathFor(item) {
  if (item.targetUrl) return item.targetUrl
  const type = String(item.relatedType || item.type || '').toLowerCase()
  const id = item.relatedId
  if (['order'].includes(type)) return id ? `/account/orders/${id}` : '/account/orders'
  if (['booking', 'reservation'].includes(type)) return '/account/bookings'
  if (['event', 'activity'].includes(type)) return '/account/activities'
  if (['post', 'community'].includes(type)) return id ? `/community/posts/${id}` : '/community'
  if (['comment', 'community_comment'].includes(type)) return id ? `/community/posts/${id}#comments` : '/community'
  if (['points', 'point', 'coupon'].includes(type)) return '/account/points'
  if (['system', 'audit'].includes(type)) return '/account/notifications'
  return ''
}

async function openItem(item) {
  if (!item.isRead) await markRead(item)
  const path = targetPathFor(item)
  if (!path) {
    notificationsStore.error = '这条消息没有可跳转的目标。'
    return
  }
  try {
    close()
    await router.push(path)
  } catch {
    notificationsStore.error = '关联内容暂时无法打开，可能已被删除或下架。'
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) load(1)
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="notification-drawer-fade">
      <div v-if="modelValue" class="notification-drawer" @click.self="close">
        <aside class="notification-drawer__panel" role="dialog" aria-modal="true" aria-label="消息中心">
          <header class="notification-drawer__header">
            <div>
              <span>消息中心</span>
              <strong>{{ notificationsStore.unreadCount }} 条未读</strong>
            </div>
            <div class="notification-drawer__header-actions">
              <BaseButton size="sm" variant="ghost" :disabled="notificationsStore.unreadCount === 0" @click="markAllRead">全部已读</BaseButton>
              <BaseButton size="sm" variant="ghost" :disabled="!notificationsStore.items.length" @click="toggleSelectAll">{{ allSelected ? '\u53d6\u6d88\u5168\u9009' : '\u5168\u9009' }}</BaseButton>
              <button class="notification-drawer__close" type="button" aria-label="关闭消息中心" @click="close">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </header>

          <div class="notification-drawer__filters">
            <button
              v-for="tab in typeTabs"
              :key="tab.value"
              type="button"
              :class="{ 'is-active': filters.type === tab.value }"
              @click="selectFilter(tab)"
            >
              {{ tab.label }}
            </button>
          </div>

          <p v-if="notificationsStore.error" class="notification-drawer__error">{{ notificationsStore.error }}</p>

          <div v-if="selectedIds.length" class="notification-drawer__batch">
            <span>&#24050;&#36873;&#25321; {{ selectedIds.length }} &#26465;</span>
            <BaseButton size="sm" variant="outline" :disabled="!selectedItems.some(item => !item.isRead)" @click="markSelectedRead">&#26631;&#20026;&#24050;&#35835;</BaseButton>
            <BaseButton size="sm" variant="danger" @click="removeSelected">&#21024;&#38500;&#25152;&#36873;</BaseButton>
          </div>

          <div v-if="notificationsStore.loading" class="notification-drawer__loading" aria-live="polite">
            <span v-for="item in 4" :key="item" />
          </div>

          <EmptyState
            v-else-if="!notificationsStore.items.length"
            title="暂无消息"
            description="新的订单、预约、社区和系统消息会出现在这里。"
            action-label="刷新"
            @action="load(1)"
          >
            <template #icon>!</template>
          </EmptyState>

          <div v-else class="notification-drawer__list">
            <div v-for="item in notificationsStore.items" :key="item.id" class="notification-drawer__select-row">
              <input type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`\u9009\u62e9\u6d88\u606f ${item.title}`" @change="toggleSelect(item.id)" />
              <NotificationMessageBubble
                :item="item"
                @read="markRead"
                @remove="remove"
                @open="openItem"
              />
            </div>
            <BaseButton v-if="hasMore" variant="outline" :loading="notificationsStore.loading" @click="load(filters.page + 1, true)">加载更多</BaseButton>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notification-drawer {
  position: fixed;
  z-index: var(--cb-z-modal);
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(0 0 0 / 0.28);
}
.notification-drawer__panel {
  display: flex;
  width: min(100%, 26rem);
  height: 100%;
  flex-direction: column;
  gap: var(--cb-space-4);
  padding: var(--cb-space-5);
  overflow: hidden;
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-lg);
}
.notification-drawer__header {
  display: flex;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: space-between;
}
.notification-drawer__header span {
  display: block;
  color: var(--cb-text-primary);
  font-size: var(--cb-font-size-xl);
  font-weight: var(--cb-font-bold);
}
.notification-drawer__header strong {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}
.notification-drawer__header-actions,
.notification-drawer__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}
.notification-drawer__close {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  color: var(--cb-text-secondary);
  background: var(--cb-bg-soft);
  border: 0;
  border-radius: var(--cb-radius-pill);
}
.notification-drawer__close svg {
  width: 1rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 2;
}
.notification-drawer__filters button {
  min-height: 2rem;
  padding: 0 var(--cb-space-3);
  color: var(--cb-text-secondary);
  background: var(--cb-bg-soft);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-pill);
}
.notification-drawer__filters button.is-active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
  border-color: var(--cb-color-coffee);
}
.notification-drawer__list,
.notification-drawer__loading {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--cb-space-4);
  align-content: start;
  overflow-y: auto;
  padding-right: var(--cb-space-1);
}
.notification-drawer__loading span {
  height: 5.5rem;
  border-radius: var(--cb-radius-lg);
  background: linear-gradient(90deg, var(--cb-bg-soft), var(--cb-bg-surface), var(--cb-bg-soft));
  background-size: 200% 100%;
  animation: cb-drawer-pulse 1.2s linear infinite;
}

.notification-drawer__batch,
.notification-drawer__select-row {
  display: flex;
  gap: var(--cb-space-3);
  align-items: center;
}
.notification-drawer__batch {
  flex: 0 0 auto;
  padding: var(--cb-space-3);
  background: var(--cb-bg-soft);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}
.notification-drawer__batch span { margin-right: auto; color: var(--cb-text-secondary); font-size: var(--cb-font-size-sm); }
.notification-drawer__select-row > input { flex: 0 0 auto; width: 1rem; height: 1rem; accent-color: var(--cb-color-coffee); }
.notification-drawer__select-row > :deep(.notification-bubble) { flex: 1 1 auto; min-width: 0; }

.notification-drawer__error {
  padding: var(--cb-space-3);
  color: var(--cb-danger);
  background: color-mix(in srgb, var(--cb-danger) 10%, transparent);
  border-radius: var(--cb-radius-lg);
}
.notification-drawer-fade-enter-active,
.notification-drawer-fade-leave-active {
  transition: opacity var(--cb-duration-normal) var(--cb-ease-standard);
}
.notification-drawer-fade-enter-active .notification-drawer__panel,
.notification-drawer-fade-leave-active .notification-drawer__panel {
  transition: transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}
.notification-drawer-fade-enter-from,
.notification-drawer-fade-leave-to {
  opacity: 0;
}
.notification-drawer-fade-enter-from .notification-drawer__panel,
.notification-drawer-fade-leave-to .notification-drawer__panel {
  transform: translateX(100%);
}
@keyframes cb-drawer-pulse {
  from { background-position: 0 0; }
  to { background-position: -200% 0; }
}
@media (max-width: 36rem) {
  .notification-drawer__panel {
    width: 100%;
  }
}
</style>
