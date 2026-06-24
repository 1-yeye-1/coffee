<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable, BaseTextarea, EmptyState, ErrorPanel } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import { fetchPostLikeUsers, fetchPostModeration, processAdminReport, updateAdminCommentStatus } from '@/api/admin'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapReveal } from '@/composables/useGsapReveal'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const detail = ref(null)
const detailTab = ref('preview')
const likeUsers = ref([])
const actionTarget = ref(null)
const actionReason = ref('')
const actionLoading = ref(false)
const selectedPostIds = ref([])
const pageRef = ref(null)
const { revealCards, revealTab } = useGsapReveal(pageRef)
const { pulseBadge, flashRow } = useAnimeMotion()
const filters = reactive({ keyword: String(route.query.keyword || ''), status: 'all', featured: 'all', media: 'all' })

const columns = [
  { key: 'select', label: '' },
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
  { label: '举报待复核', value: 'reported' },
  { label: '已隐藏', value: 'hidden' },
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
  reported: { label: '举报待复核', variant: 'warning' },
  hidden: { label: '已隐藏', variant: 'neutral' },
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

const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((item) => selectedPostIds.value.includes(item.id)))

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
  selectedPostIds.value = selectedPostIds.value.filter((id) => adminStore.posts.some((item) => item.id === id))
}

function toggleSelectPost(id) {
  selectedPostIds.value = selectedPostIds.value.includes(id)
    ? selectedPostIds.value.filter((itemId) => itemId !== id)
    : [...selectedPostIds.value, id]
}

function toggleSelectVisible() {
  selectedPostIds.value = allVisibleSelected.value ? [] : visible.value.map((item) => item.id)
}

async function batchReview(status) {
  const ids = [...selectedPostIds.value]
  if (!ids.length) return
  actionLoading.value = true
  try {
    for (const id of ids) await adminStore.reviewPost(id, status, actionReason.value)
    selectedPostIds.value = []
    actionReason.value = ''
    await refresh()
  } finally {
    actionLoading.value = false
  }
}

async function openDetail(item) {
  detail.value = item
  detailTab.value = 'preview'
  try {
    const [moderation, likes] = await Promise.all([fetchPostModeration(item.id), fetchPostLikeUsers(item.id)])
    detail.value = { ...moderation.data, status: moderation.data.reviewStatus || moderation.data.status }
    likeUsers.value = likes.data?.items || []
  }
  catch { likeUsers.value = [] }
}


function showCommentMedia() {
  detailTab.value = 'preview'
  nextTick(() => {
    pageRef.value?.querySelector('.detail-media')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function askAction(type, item, status = '') {
  actionReason.value = ''
  actionTarget.value = { type, item, status }
}

async function confirmAction() {
  if (!actionTarget.value) return
  actionLoading.value = true
  const { type, item, status } = actionTarget.value
  try {
    if (type === 'post') await adminStore.reviewPost(item.id, status, actionReason.value)
    if (type === 'comment') await updateAdminCommentStatus(detail.value.id, item.id, status, actionReason.value)
    if (type === 'report') await processAdminReport(item.id, status, actionReason.value)
    const detailId = detail.value?.id
    await refresh()
    if (detailId) await openDetail({ id: detailId })
    await nextTick()
    flashRow(pageRef.value?.querySelector(`[data-row-key="${item.id}"]`))
    pulseBadge(document.querySelector('.post-detail .base-badge'))
    actionTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  await refresh()
  await nextTick()
  revealCards('.community-stat', { key: 'community-stats', stagger: 0.055 })
})
watch(() => route.query.keyword, (value) => { filters.keyword = String(value || '') })
watch(detailTab, async () => {
  await nextTick()
  revealTab('.moderation-list article,.post-detail > header,.detail-media')
})
</script>

<template>
  <div ref="pageRef" class="admin-page community-admin">
    <header class="admin-page__header community-hero">
      <div class="admin-page__title">
        <span class="section-eyebrow">Moderation</span>
        <h1>社区内容管理</h1>
        <p>审核用户发布内容，管理精选推荐与违规内容，让 Coffee Book 社区保持温暖、清晰与可信。</p>
      </div>
      <BaseButton variant="outline" :loading="adminStore.apiLoading" @click="refresh">刷新</BaseButton>
    </header>

    <ErrorPanel v-if="adminStore.apiError" :message="adminStore.apiError" @retry="refresh" />

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


    <section class="community-batch-bar">
      <label><input type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length" @change="toggleSelectVisible" /> &#20840;&#36873;&#24403;&#21069;&#21015;&#34920;</label>
      <span>&#24050;&#36873;&#25321; {{ selectedPostIds.length }} &#26465;</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedPostIds.length || actionLoading" :loading="actionLoading" @click="batchReview('published')">&#20840;&#37096;&#36890;&#36807;&#23457;&#26680;</BaseButton>
      <BaseButton size="sm" variant="ghost" :disabled="!selectedPostIds.length || actionLoading" @click="batchReview('rejected')">&#20840;&#37096;&#39539;&#22238;</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedPostIds.length || actionLoading" @click="batchReview('hidden')">&#20840;&#37096;&#38544;&#34255;</BaseButton>
    </section>

    <BaseTable
      v-if="visible.length || adminStore.apiLoading"
      :columns="columns"
      :items="visible"
      :loading="adminStore.apiLoading"
      empty-text="暂无社区内容"
    >

      <template #head-select>
        <input class="row-select" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length" aria-label="Select current list" @change="toggleSelectVisible" />
      </template>

      <template #cell-select="{ item }">
        <input class="row-select" type="checkbox" :checked="selectedPostIds.includes(item.id)" :aria-label="`\u9009\u62e9\u5e16\u5b50 ${item.title}`" @change="toggleSelectPost(item.id)" />
      </template>

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
          <img v-if="item.mediaType === 'image'" :src="assetUrl(item.mediaUrl)" alt="帖子图片" loading="lazy" decoding="async" />
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
            <BaseButton size="sm" variant="outline" @click="openDetail(item)">详情</BaseButton>
          </div>
          <div class="action-group">
            <BaseButton size="sm" variant="ghost" :disabled="item.status === 'published'" @click="askAction('post', item, 'published')">通过</BaseButton>
            <BaseButton size="sm" variant="ghost" :disabled="item.status === 'rejected'" @click="askAction('post', item, 'rejected')">拒绝</BaseButton>
            <BaseButton size="sm" variant="ghost" :disabled="item.status === 'hidden'" @click="askAction('post', item, 'hidden')">隐藏</BaseButton>
            <BaseButton v-if="item.status === 'hidden'" size="sm" variant="outline" @click="askAction('post', item, 'published')">恢复</BaseButton>
          </div>
          <div class="action-group">
            <BaseButton size="sm" variant="ghost" @click="adminStore.toggleFeaturedPost(item.id)">
              {{ item.featured ? '取消精选' : '标记精选' }}
            </BaseButton>
          </div>
          <div class="action-group action-group--danger">
            <BaseButton size="sm" variant="danger" @click="askAction('post', item, 'hidden')">删除（软隐藏）</BaseButton>
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
        <nav class="moderation-tabs" aria-label="审核详情"><button v-for="tab in [{key:'preview',label:'帖子预览'},{key:'comments',label:`评论 ${detail.commentsCount || 0}`},{key:'likes',label:`点赞 ${detail.likes || 0}`},{key:'reports',label:`举报 ${(detail.reports || []).length}`}]" :key="tab.key" type="button" :class="{ 'is-active': detailTab === tab.key }" @click="detailTab = tab.key">{{ tab.label }}</button></nav>
        <template v-if="detailTab === 'preview'">
        <header>
          <BaseBadge :variant="statusMeta(detail.status).variant">{{ statusMeta(detail.status).label }}</BaseBadge>
          <BaseBadge :variant="detail.featured ? 'premium' : 'neutral'">{{ detail.featured ? '精选' : '普通' }}</BaseBadge>
          <h2>{{ detail.title }}</h2>
          <p>作者：{{ detail.author || 'Coffee Reader' }} · {{ formatDate(detail.createdAt) }}</p>
        </header>
        <div v-if="detail.mediaUrl" class="detail-media">
          <img v-if="detail.mediaType === 'image'" :src="assetUrl(detail.mediaUrl)" alt="帖子图片" decoding="async" />
          <video v-else controls :src="assetUrl(detail.mediaUrl)">当前浏览器不支持视频预览。</video>
        </div>
        <p>{{ detail.content || detail.excerpt }}</p>
        <footer>
          <span>点赞 {{ detail.likes || 0 }}</span>
          <span>评论 {{ detail.commentsCount }}</span>
        </footer>
        <div class="detail-actions">
          <BaseButton size="sm" variant="outline" @click="askAction('post', detail, 'published')">通过</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="askAction('post', detail, 'rejected')">拒绝</BaseButton>
          <BaseButton size="sm" variant="danger" @click="askAction('post', detail, 'hidden')">隐藏</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="adminStore.toggleFeaturedPost(detail.id)">
            {{ detail.featured ? '取消精选' : '标记精选' }}
          </BaseButton>
        </div>
        </template>
        <section v-else-if="detailTab === 'comments'" class="moderation-list"><article v-for="comment in detail.comments || []" :key="comment.id"><header><strong>{{ comment.user?.nickname || comment.author || '匿名用户' }}</strong><BaseBadge :variant="comment.status === 'published' ? 'success' : comment.status === 'pending' ? 'warning' : 'neutral'">{{ { published:'正常', pending:'待审核', hidden:'已隐藏', deleted:'已删除' }[comment.status] || comment.status }}</BaseBadge></header><p>{{ comment.content }}</p><small>{{ formatDate(comment.createdAt) }}</small><footer><BaseButton v-if="detail.mediaUrl" size="sm" variant="outline" @click="showCommentMedia">&#26597;&#30475;&#23186;&#20307;/&#35814;&#24773;</BaseButton><BaseButton v-if="comment.status !== 'published'" size="sm" variant="outline" @click="askAction('comment', comment, 'published')">恢复</BaseButton><BaseButton v-if="comment.status !== 'hidden'" size="sm" variant="ghost" @click="askAction('comment', comment, 'hidden')">隐藏</BaseButton><BaseButton v-if="comment.status !== 'deleted'" size="sm" variant="danger" @click="askAction('comment', comment, 'deleted')">删除</BaseButton></footer></article><EmptyState v-if="!detail.comments?.length" title="暂无评论" /></section>
        <section v-else-if="detailTab === 'likes'" class="moderation-list"><article v-for="user in likeUsers" :key="user.userId"><strong>{{ user.nickname || user.username }}</strong><p>{{ user.phoneMasked || '隐私号码' }}</p><small>{{ formatDate(user.likedAt) }}</small></article><p v-if="!likeUsers.length" class="text-muted">暂无点赞用户</p></section>
        <section v-else class="moderation-list"><article v-for="report in detail.reports || []" :key="report.id"><header><strong>{{ report.reason || '内容举报' }}</strong><BaseBadge :variant="report.status === 'pending' ? 'warning' : report.status === 'resolved' ? 'success' : 'neutral'">{{ report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已驳回' }}</BaseBadge></header><p>{{ report.description || '未填写补充说明' }}</p><small>{{ report.reporter?.nickname }} · {{ formatDate(report.createdAt) }}</small><footer v-if="report.status === 'pending'"><BaseButton size="sm" variant="outline" @click="askAction('report', report, 'dismiss')">驳回举报</BaseButton><BaseButton size="sm" variant="ghost" @click="askAction('report', report, 'hide')">隐藏内容</BaseButton><BaseButton v-if="report.commentId" size="sm" variant="danger" @click="askAction('report', report, 'delete')">删除评论</BaseButton></footer></article><EmptyState v-if="!detail.reports?.length" title="暂无举报记录" /></section>
      </article>
    </BaseModal>

    <BaseModal :model-value="Boolean(actionTarget)" title="确认审核操作" @update:model-value="(value) => { if (!value) actionTarget = null }">
      <div class="confirm-panel moderation-confirm">
        <p>此操作会立即更新前台可见状态，并记录审核日志。请确认处理理由。</p>
        <BaseTextarea v-model="actionReason" label="审核理由" placeholder="请输入处理依据或补充说明" :rows="5" />
        <div><BaseButton variant="ghost" @click="actionTarget = null">取消</BaseButton><BaseButton :variant="['hidden','deleted','delete','rejected'].includes(actionTarget?.status) ? 'danger' : 'primary'" :loading="actionLoading" @click="confirmAction">确认处理</BaseButton></div>
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


.community-batch-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
  padding: var(--cb-space-3) var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: var(--cb-bg-surface);
}
.community-batch-bar label { display: inline-flex; gap: var(--cb-space-2); align-items: center; font-weight: var(--cb-font-semibold); }
.community-batch-bar span { margin-right: auto; color: var(--cb-text-secondary); }
.row-select { width: 1rem; height: 1rem; accent-color: var(--cb-color-coffee); }

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
  align-items: start;
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  padding: var(--cb-space-2);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: color-mix(in srgb, var(--cb-bg-soft) 72%, transparent);
}

.action-group:first-child {
  background: transparent;
  border-color: transparent;
  padding: 0;
}

.action-group--danger {
  border-color: color-mix(in srgb, var(--cb-danger) 26%, var(--cb-border-soft));
  background: color-mix(in srgb, var(--cb-danger) 8%, transparent);
}

:deep(.base-table tbody tr) {
  transition:
    background-color var(--cb-duration-fast) var(--cb-ease-standard),
    box-shadow var(--cb-duration-fast) var(--cb-ease-standard);
}

:deep(.base-table tbody tr:hover) {
  background: color-mix(in srgb, var(--cb-color-gold) 7%, var(--cb-bg-surface));
  box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--cb-color-gold) 18%, transparent);
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

.moderation-tabs{display:flex;gap:var(--cb-space-2);padding:var(--cb-space-1);background:var(--cb-bg-soft);border-radius:var(--cb-radius-pill)}
.moderation-tabs button{padding:var(--cb-space-2) var(--cb-space-4);color:var(--cb-text-secondary);background:transparent;border:0;border-radius:var(--cb-radius-pill)}
.moderation-tabs button.is-active{color:var(--cb-text-inverse);background:var(--cb-color-coffee);box-shadow:var(--cb-shadow-sm)}
.moderation-list{display:grid;gap:var(--cb-space-3)}
.moderation-list article{display:grid;gap:var(--cb-space-2);padding:var(--cb-space-4);border:1px solid var(--cb-border-soft);border-radius:var(--cb-radius-lg);background:var(--cb-bg-soft)}
.moderation-list article header,.moderation-list article footer{display:flex;flex-wrap:wrap;gap:var(--cb-space-2);align-items:center;justify-content:space-between}
.moderation-list article footer{justify-content:flex-start;padding-top:var(--cb-space-2);border-top:1px solid var(--cb-border-soft)}
.moderation-list small{color:var(--cb-text-muted)}
.moderation-confirm :deep(.base-textarea),.moderation-confirm :deep(textarea){width:100%;min-height:8rem}

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
