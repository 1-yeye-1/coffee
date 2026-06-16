<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseInput, BaseModal, BasePagination, EmptyState } from '@/components/base'
import { useNotificationsStore } from '@/stores/notifications'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const notificationsStore = useNotificationsStore()
const filters = reactive({ type: 'all', readStatus: 'all', keyword: '', page: 1, pageSize: 8 })
const deleting = ref(null)
const detail = ref(null)

const typeTabs = [
  { label: '全部', value: 'all' },
  { label: '系统', value: 'system' },
  { label: '订单', value: 'order' },
  { label: '预约', value: 'booking' },
  { label: '活动', value: 'activity' },
  { label: '社区', value: 'community' },
  { label: '审核', value: 'audit' },
]

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' },
]

const typeMeta = {
  system: { label: '系统通知', icon: 'S', variant: 'premium' },
  order: { label: '订单通知', icon: 'O', variant: 'warning' },
  booking: { label: '预约通知', icon: 'B', variant: 'success' },
  activity: { label: '活动通知', icon: 'A', variant: 'secondary' },
  community: { label: '社区通知', icon: 'C', variant: 'neutral' },
  audit: { label: '审核通知', icon: 'R', variant: 'danger' },
}

const pageCount = computed(() => Math.max(1, Math.ceil(notificationsStore.meta.total / notificationsStore.meta.pageSize)))
const currentItems = computed(() => notificationsStore.items)
const stats = computed(() => {
  const system = currentItems.value.filter((item) => item.type === 'system').length
  const community = currentItems.value.filter((item) => ['community', 'audit'].includes(item.type)).length
  return [
    { label: '全部通知', value: notificationsStore.meta.total, hint: '匹配当前筛选', mark: 'A' },
    { label: '未读通知', value: notificationsStore.unreadCount, hint: '所有未读消息', mark: 'U' },
    { label: '系统通知', value: system, hint: '当前页估算', mark: 'S' },
    { label: '社区 / 审核', value: community, hint: '当前页估算', mark: 'C' },
  ]
})

function query(page = filters.page) {
  return {
    type: filters.type,
    readStatus: filters.readStatus,
    keyword: filters.keyword.trim(),
    page,
    pageSize: filters.pageSize,
  }
}

async function load(page = filters.page) {
  filters.page = page
  await notificationsStore.fetchNotifications(query(page))
}

function refreshBadge() {
  window.dispatchEvent(new CustomEvent('coffee-book:notifications-updated'))
}

async function markRead(item) {
  await notificationsStore.markRead(item.id, query())
  refreshBadge()
}

async function markAllRead() {
  await notificationsStore.markAllRead(query())
  refreshBadge()
}

async function remove(item) {
  deleting.value = null
  await notificationsStore.remove(item.id, query())
  refreshBadge()
}

function applyFilters(page = 1) {
  load(page)
}

function formatDate(value) {
  return new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => load(1))
</script>

<template>
  <div class="notifications-page">
    <section class="notifications-hero">
      <div>
        <span class="section-eyebrow">NOTIFICATIONS</span>
        <h2 class="page-title">通知中心</h2>
        <p class="page-subtitle">查看订单、预约、社区互动与系统消息，重要提醒会在这里为你轻轻亮起。</p>
      </div>
      <div class="notifications-hero__aside">
        <span>未读通知</span>
        <strong>{{ notificationsStore.unreadCount }}</strong>
        <BaseButton size="sm" :disabled="notificationsStore.unreadCount === 0" @click="markAllRead">全部标记已读</BaseButton>
      </div>
    </section>

    <p v-if="notificationsStore.error" class="form-error">{{ notificationsStore.error }}</p>

    <section class="notification-stats" aria-label="通知统计">
      <article v-for="item in stats" :key="item.label" class="notification-stat">
        <span class="notification-stat__mark">{{ item.mark }}</span>
        <div>
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </div>
      </article>
    </section>

    <section class="notification-filters">
      <div class="filter-group" aria-label="通知类型筛选">
        <button
          v-for="item in typeTabs"
          :key="item.value"
          type="button"
          :class="{ 'is-active': filters.type === item.value }"
          @click="filters.type = item.value; applyFilters()"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="filter-row">
        <div class="filter-group" aria-label="阅读状态筛选">
          <button
            v-for="item in statusTabs"
            :key="item.value"
            type="button"
            :class="{ 'is-active': filters.readStatus === item.value }"
            @click="filters.readStatus = item.value; applyFilters()"
          >
            {{ item.label }}
          </button>
        </div>
        <form class="notification-search" @submit.prevent="applyFilters()">
          <BaseInput v-model="filters.keyword" search placeholder="搜索标题或内容" aria-label="搜索通知" />
          <BaseButton type="submit" variant="outline">搜索</BaseButton>
        </form>
      </div>
    </section>

    <section v-if="notificationsStore.loading" class="notification-loading" aria-live="polite">
      <span v-for="item in 3" :key="item" />
    </section>

    <EmptyState
      v-else-if="!currentItems.length"
      title="暂时没有通知"
      description="新的咖啡书屋消息会出现在这里。你可以刷新列表，或回到首页继续探索。"
      action-label="刷新通知"
      @action="load(1)"
    >
      <template #icon>◇</template>
      <template #action>
        <BaseButton variant="ghost" @click="router.push('/')">返回首页</BaseButton>
      </template>
    </EmptyState>

    <section v-else class="notification-list">
      <article
        v-for="item in currentItems"
        :key="item.id"
        class="notification-card"
        :class="{ 'notification-card--unread': !item.isRead }"
      >
        <div class="notification-card__icon">{{ typeMeta[item.type]?.icon || 'N' }}</div>
        <div class="notification-card__content">
          <div class="notification-card__topline">
            <BaseBadge :variant="typeMeta[item.type]?.variant || 'neutral'">{{ typeMeta[item.type]?.label || item.type }}</BaseBadge>
            <BaseBadge :variant="item.isRead ? 'neutral' : 'warning'">{{ item.isRead ? '已读' : '未读' }}</BaseBadge>
            <time>{{ formatDate(item.createdAt) }}</time>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.content }}</p>
        </div>
        <div class="notification-card__actions">
          <BaseButton size="sm" variant="outline" @click="detail = item">详情</BaseButton>
          <BaseButton v-if="!item.isRead" size="sm" variant="ghost" @click="markRead(item)">标记已读</BaseButton>
          <BaseButton size="sm" variant="danger" @click="deleting = item">删除</BaseButton>
        </div>
      </article>
    </section>

    <BasePagination
      v-if="pageCount > 1"
      v-model="filters.page"
      :total-pages="pageCount"
      @change="load"
    />

    <BaseModal :model-value="Boolean(deleting)" title="确认删除通知" @update:model-value="(value) => { if (!value) deleting = null }">
      <div class="confirm-panel">
        <p>确认删除通知“{{ deleting?.title }}”吗？删除后将不会再显示在通知中心。</p>
        <div>
          <BaseButton variant="ghost" @click="deleting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="remove(deleting)">确认删除</BaseButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal :model-value="Boolean(detail)" title="通知详情" @update:model-value="(value) => { if (!value) detail = null }">
      <div v-if="detail" class="notice-detail">
        <BaseBadge :variant="typeMeta[detail.type]?.variant || 'neutral'">{{ typeMeta[detail.type]?.label || detail.type }}</BaseBadge>
        <h3>{{ detail.title }}</h3>
        <p>{{ detail.content }}</p>
        <small>发送时间：{{ new Date(detail.createdAt).toLocaleString('zh-CN') }}</small>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.notifications-page {
  display: grid;
  gap: var(--cb-space-6);
}

.notifications-hero {
  display: grid;
  gap: var(--cb-space-6);
  padding: clamp(var(--cb-space-6), 4vw, var(--cb-space-9));
  overflow: hidden;
  border: 0.0625rem solid color-mix(in srgb, var(--cb-color-gold) 28%, var(--cb-border-soft));
  border-radius: var(--cb-radius-2xl);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--cb-color-gold) 30%, transparent), transparent 18rem),
    linear-gradient(135deg, color-mix(in srgb, var(--cb-color-cream) 72%, var(--cb-bg-surface)), var(--cb-bg-surface));
  box-shadow: var(--cb-shadow-md);
}

.notifications-hero__aside {
  display: grid;
  gap: var(--cb-space-2);
  padding: var(--cb-space-5);
  align-content: center;
  border: 0.0625rem solid color-mix(in srgb, var(--cb-color-gold) 36%, transparent);
  border-radius: var(--cb-radius-xl);
  background: color-mix(in srgb, var(--cb-bg-surface) 72%, transparent);
  box-shadow: var(--cb-shadow-sm);
}

.notifications-hero__aside span {
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

.notifications-hero__aside strong {
  color: var(--cb-color-coffee);
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-5xl);
  line-height: 1;
}

.notification-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--cb-space-4);
}

.notification-stat {
  display: flex;
  min-width: 0;
  padding: var(--cb-space-5);
  gap: var(--cb-space-3);
  align-items: center;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.notification-stat__mark,
.notification-card__icon {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-bold);
  background: color-mix(in srgb, var(--cb-color-gold) 20%, var(--cb-bg-soft));
  border-radius: var(--cb-radius-lg);
}

.notification-stat strong {
  display: block;
  font-size: var(--cb-font-size-2xl);
}

.notification-stat span,
.notification-stat small {
  display: block;
  color: var(--cb-text-secondary);
}

.notification-filters {
  display: grid;
  gap: var(--cb-space-4);
  padding: var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
}

.filter-row,
.notification-search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}

.filter-group button {
  min-height: 2.5rem;
  padding: var(--cb-space-2) var(--cb-space-4);
  color: var(--cb-text-secondary);
  background: var(--cb-bg-soft);
  border: 0.0625rem solid transparent;
  border-radius: var(--cb-radius-pill);
}

.filter-group button.is-active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
}

.notification-search {
  margin-left: auto;
}

.notification-search .base-field {
  width: min(100%, 18rem);
}

.notification-loading {
  display: grid;
  gap: var(--cb-space-3);
}

.notification-loading span {
  height: 6rem;
  border-radius: var(--cb-radius-xl);
  background: linear-gradient(90deg, var(--cb-bg-soft), var(--cb-bg-surface), var(--cb-bg-soft));
  background-size: 200% 100%;
  animation: cb-pulse 1.2s infinite linear;
}

.notification-list {
  display: grid;
  gap: var(--cb-space-4);
}

.notification-card {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--cb-space-4);
  padding: var(--cb-space-5);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.notification-card--unread {
  border-color: color-mix(in srgb, var(--cb-color-gold) 52%, var(--cb-border-soft));
  background: color-mix(in srgb, var(--cb-color-cream) 34%, var(--cb-bg-surface));
}

.notification-card--unread::before {
  position: absolute;
  top: var(--cb-space-4);
  bottom: var(--cb-space-4);
  left: 0;
  width: 0.25rem;
  background: var(--cb-color-gold);
  border-radius: var(--cb-radius-pill);
  content: "";
}

.notification-card__content {
  display: grid;
  min-width: 0;
  gap: var(--cb-space-2);
}

.notification-card__topline,
.notification-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}

.notification-card__topline time {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}

.notification-card h3 {
  font-size: var(--cb-font-size-lg);
}

.notification-card p {
  display: -webkit-box;
  overflow: hidden;
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-card__actions {
  align-content: start;
  justify-content: flex-end;
}

.confirm-panel,
.notice-detail {
  display: grid;
  gap: var(--cb-space-4);
}

.confirm-panel div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  justify-content: flex-end;
}

.notice-detail p {
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
}

@keyframes cb-pulse {
  from { background-position: 0 0; }
  to { background-position: -200% 0; }
}

@media (min-width: 54rem) {
  .notifications-hero {
    grid-template-columns: minmax(0, 1fr) 13rem;
    align-items: stretch;
  }
}

@media (max-width: 64rem) {
  .notification-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .notification-search {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 42rem) {
  .notification-stats,
  .notification-card {
    grid-template-columns: 1fr;
  }

  .notification-card__actions {
    justify-content: flex-start;
  }

  .notification-search .base-field,
  .notification-search .base-button {
    width: 100%;
  }
}
</style>
