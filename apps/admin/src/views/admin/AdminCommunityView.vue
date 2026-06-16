<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const deleting = ref(null)
const rejecting = ref(null)
const detail = ref(null)
const filters = reactive({ keyword: '', status: 'all', featured: 'all', media: 'all' })

const columns = [
  { key: 'title', label: '标题 / 摘要' },
  { key: 'author', label: '作者' },
  { key: 'media', label: '媒体' },
  { key: 'status', label: '状态' },
  { key: 'featured', label: '精选' },
  { key: 'engagement', label: '互动' },
  { key: 'createdAt', label: '发布时间' },
  { key: 'actions', label: '操作' },
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已发布', value: 'published' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已下架', value: 'inactive' },
]

const featuredOptions = [
  { label: '全部内容', value: 'all' },
  { label: '精选内容', value: 'featured' },
  { label: '非精选', value: 'normal' },
]

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '无媒体', value: 'none' },
]

const statusMap = {
  pending: { label: '待审核', variant: 'warning' },
  published: { label: '已发布', variant: 'success' },
  rejected: { label: '已拒绝', variant: 'danger' },
  inactive: { label: '已下架', variant: 'neutral' },
}

const rows = computed(() => adminStore.posts.map((item) => ({
  ...item,
  status: item.reviewStatus || item.status || 'pending',
  commentsCount: Array.isArray(item.comments) ? item.comments.length : Number(item.commentsCount || item.comments || 0),
  mediaType: item.mediaType || (item.mediaUrl ? 'image' : ''),
})))

const visible = computed(() => rows.value.filter((item) => {
  const keyword = filters.keyword.trim().toLowerCase()
  const matchesKeyword = !keyword
    || String(item.title || '').toLowerCase().includes(keyword)
    || String(item.excerpt || '').toLowerCase().includes(keyword)
    || String(item.author || '').toLowerCase().includes(keyword)
  const matchesStatus = filters.status === 'all' || item.status === filters.status
  const matchesFeatured = filters.featured === 'all'
    || (filters.featured === 'featured' ? item.featured : !item.featured)
  const matchesMedia = filters.media === 'all'
    || (filters.media === 'none' ? !item.mediaUrl : item.mediaType === filters.media)
  return matchesKeyword && matchesStatus && matchesFeatured && matchesMedia
}))

const stats = computed(() => [
  { label: '全部内容', value: rows.value.length, mark: 'A' },
  { label: '待审核', value: rows.value.filter((item) => item.status === 'pending').length, mark: 'P' },
  { label: '已发布', value: rows.value.filter((item) => item.status === 'published').length, mark: 'S' },
  { label: '精选内容', value: rows.value.filter((item) => item.featured).length, mark: 'F' },
  { label: '已拒绝', value: rows.value.filter((item) => item.status === 'rejected').length, mark: 'R' },
])

function assetUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url
  const base = import.meta.env.DEV ? 'http://127.0.0.1:4173' : ''
  return `${base}${url}`
}

function statusMeta(status) {
  return statusMap[status] || { label: status || '未知', variant: 'neutral' }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

async function refresh() {
  await adminStore.fetchAdminCollection('posts')
}

async function approve(item) {
  await adminStore.reviewPost(item.id, 'published')
}

async function reject(item) {
  rejecting.value = null
  await adminStore.reviewPost(item.id, 'rejected')
}

async function remove() {
  if (!deleting.value) return
  await adminStore.remove('posts', deleting.value.id)
  deleting.value = null
}

onMounted(refresh)
</script>

<template>
  <div class="admin-page community-admin">
    <header class="admin-page__header community-hero">
      <div class="admin-page__title">
        <span class="section-eyebrow">Moderation</span>
        <h1>社区内容管理</h1>
        <p>审核用户发布内容，管理精选推荐与违规内容，让 Coffee Book 社区保持温暖、清晰与可信。</p>
      </div>
      <BaseButton variant="outline" :loading="adminStore.apiLoading" @click="refresh">刷新</BaseButton>
    </header>

    <p v-if="adminStore.apiError" class="form-error">{{ adminStore.apiError }}</p>

    <section class="community-stats" aria-label="社区内容统计">
      <article v-for="item in stats" :key="item.label" class="community-stat">
        <span>{{ item.mark }}</span>
        <div>
          <strong>{{ item.value }}</strong>
          <small>{{ item.label }}</small>
        </div>
      </article>
    </section>

    <section class="community-toolbar">
      <BaseInput v-model="filters.keyword" search label="搜索" placeholder="标题、摘要或作者" />
      <BaseSelect v-model="filters.status" label="状态" :options="statusOptions" />
      <BaseSelect v-model="filters.featured" label="精选" :options="featuredOptions" />
      <BaseSelect v-model="filters.media" label="媒体" :options="mediaOptions" />
    </section>

    <BaseTable
      v-if="visible.length || adminStore.apiLoading"
      :columns="columns"
      :items="visible"
      :loading="adminStore.apiLoading"
      empty-text="暂无社区内容"
    >
      <template #cell-title="{ item }">
        <div class="post-title-cell">
          <div>
            <strong>{{ item.title }}</strong>
            <BaseBadge v-if="item.featured" variant="premium">精选</BaseBadge>
          </div>
          <p>{{ item.excerpt || item.content }}</p>
        </div>
      </template>

      <template #cell-author="{ item }">
        <div class="author-cell">
          <span class="author-avatar">{{ String(item.author || 'C').slice(0, 1) }}</span>
          <strong>{{ item.author || 'Coffee Reader' }}</strong>
        </div>
      </template>

      <template #cell-media="{ item }">
        <div v-if="item.mediaUrl" class="media-cell">
          <img v-if="item.mediaType === 'image'" :src="assetUrl(item.mediaUrl)" alt="帖子图片" />
          <a v-else :href="assetUrl(item.mediaUrl)" target="_blank" rel="noreferrer">视频</a>
        </div>
        <span v-else class="text-muted">无媒体</span>
      </template>

      <template #cell-status="{ item }">
        <BaseBadge :variant="statusMeta(item.status).variant">{{ statusMeta(item.status).label }}</BaseBadge>
      </template>

      <template #cell-featured="{ item }">
        <BaseBadge :variant="item.featured ? 'premium' : 'neutral'">{{ item.featured ? '精选' : '普通' }}</BaseBadge>
      </template>

      <template #cell-engagement="{ item }">
        <span class="engagement-cell">赞 {{ item.likes || 0 }} · 评 {{ item.commentsCount }}</span>
      </template>

      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>

      <template #cell-actions="{ item }">
        <div class="action-stack">
          <div class="action-group">
            <BaseButton size="sm" variant="outline" @click="detail = item">详情</BaseButton>
          </div>
          <div class="action-group">
            <BaseButton size="sm" variant="ghost" :disabled="item.status === 'published'" @click="approve(item)">通过</BaseButton>
            <BaseButton size="sm" variant="ghost" :disabled="item.status === 'rejected'" @click="rejecting = item">拒绝</BaseButton>
          </div>
          <div class="action-group">
            <BaseButton size="sm" variant="ghost" @click="adminStore.toggleFeaturedPost(item.id)">
              {{ item.featured ? '取消精选' : '标记精选' }}
            </BaseButton>
          </div>
          <div class="action-group action-group--danger">
            <BaseButton size="sm" variant="danger" @click="deleting = item">删除</BaseButton>
          </div>
        </div>
      </template>
    </BaseTable>

    <EmptyState
      v-else
      title="暂无匹配内容"
      description="当前筛选条件下没有社区帖子，可以调整筛选条件或刷新列表。"
      action-label="刷新列表"
      @action="refresh"
    >
      <template #icon>◇</template>
    </EmptyState>

    <BaseModal :model-value="Boolean(detail)" title="内容详情" @update:model-value="(value) => { if (!value) detail = null }">
      <article v-if="detail" class="post-detail">
        <header>
          <BaseBadge :variant="statusMeta(detail.status).variant">{{ statusMeta(detail.status).label }}</BaseBadge>
          <BaseBadge :variant="detail.featured ? 'premium' : 'neutral'">{{ detail.featured ? '精选' : '普通' }}</BaseBadge>
          <h2>{{ detail.title }}</h2>
          <p>作者：{{ detail.author || 'Coffee Reader' }} · {{ formatDate(detail.createdAt) }}</p>
        </header>
        <div v-if="detail.mediaUrl" class="detail-media">
          <img v-if="detail.mediaType === 'image'" :src="assetUrl(detail.mediaUrl)" alt="帖子图片" />
          <video v-else controls :src="assetUrl(detail.mediaUrl)">当前浏览器不支持视频预览。</video>
        </div>
        <p>{{ detail.content || detail.excerpt }}</p>
        <footer>
          <span>点赞 {{ detail.likes || 0 }}</span>
          <span>评论 {{ detail.commentsCount }}</span>
        </footer>
        <div class="detail-actions">
          <BaseButton size="sm" variant="outline" @click="approve(detail)">通过</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="rejecting = detail">拒绝</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="adminStore.toggleFeaturedPost(detail.id)">
            {{ detail.featured ? '取消精选' : '标记精选' }}
          </BaseButton>
        </div>
      </article>
    </BaseModal>

    <BaseModal :model-value="Boolean(rejecting)" title="确认拒绝内容" @update:model-value="(value) => { if (!value) rejecting = null }">
      <div class="confirm-panel">
        <p>确认拒绝帖子“{{ rejecting?.title }}”吗？该内容将不会在前台社区展示。</p>
        <div>
          <BaseButton variant="ghost" @click="rejecting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="reject(rejecting)">确认拒绝</BaseButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal :model-value="Boolean(deleting)" title="确认删除内容" @update:model-value="(value) => { if (!value) deleting = null }">
      <div class="confirm-panel">
        <p>确认删除帖子“{{ deleting?.title }}”吗？删除后将无法在当前列表中恢复。</p>
        <div>
          <BaseButton variant="ghost" @click="deleting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="remove">确认删除</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.community-admin {
  display: grid;
  gap: var(--cb-space-5);
}

.community-hero {
  padding: var(--cb-space-6);
  border: 0.0625rem solid color-mix(in srgb, var(--cb-color-gold) 24%, var(--cb-border-soft));
  border-radius: var(--cb-radius-2xl);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--cb-color-gold) 22%, transparent), transparent 18rem),
    var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.community-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--cb-space-4);
}

.community-stat {
  display: flex;
  min-width: 0;
  padding: var(--cb-space-4);
  gap: var(--cb-space-3);
  align-items: center;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.community-stat > span,
.author-avatar {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-bold);
  background: color-mix(in srgb, var(--cb-color-gold) 20%, var(--cb-bg-soft));
  border-radius: var(--cb-radius-lg);
}

.community-stat strong {
  display: block;
  font-size: var(--cb-font-size-2xl);
}

.community-stat small,
.engagement-cell {
  color: var(--cb-text-secondary);
}

.community-toolbar {
  display: grid;
  grid-template-columns: minmax(16rem, 1.5fr) repeat(3, minmax(0, 1fr));
  gap: var(--cb-space-4);
  padding: var(--cb-space-4);
  align-items: end;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
}

.post-title-cell {
  display: grid;
  min-width: 18rem;
  gap: var(--cb-space-2);
}

.post-title-cell > div {
  display: flex;
  gap: var(--cb-space-2);
  align-items: center;
}

.post-title-cell p {
  display: -webkit-box;
  overflow: hidden;
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.author-cell {
  display: flex;
  align-items: center;
  gap: var(--cb-space-2);
}

.media-cell {
  overflow: hidden;
  width: 4rem;
  height: 3rem;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-md);
  background: var(--cb-bg-soft);
}

.media-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-cell a {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}

.action-stack {
  display: grid;
  min-width: 15rem;
  gap: var(--cb-space-2);
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}

.post-detail,
.post-detail header,
.confirm-panel {
  display: grid;
  gap: var(--cb-space-4);
}

.post-detail h2 {
  font-size: var(--cb-font-size-2xl);
}

.post-detail p {
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
}

.detail-media {
  overflow: hidden;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-soft);
}

.detail-media img,
.detail-media video {
  display: block;
  width: 100%;
  max-height: 26rem;
  object-fit: cover;
}

.post-detail footer,
.detail-actions,
.confirm-panel div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
}

.confirm-panel div {
  justify-content: flex-end;
}

@media (max-width: 72rem) {
  .community-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .community-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 42rem) {
  .community-stats,
  .community-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
