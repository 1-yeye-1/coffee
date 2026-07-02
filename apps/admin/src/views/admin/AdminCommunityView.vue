<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { applyCommunityUserPenalty, fetchPostLikeUsers, fetchPostModeration, processAdminReport, updateAdminCommentStatus } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseModal, BaseSelect, BaseTable, BaseTextarea, EmptyState, ErrorPanel } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import { resolveMediaUrl } from '@/utils/media'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const detail = ref(null)
const detailTab = ref('preview')
const likeUsers = ref([])
const selectedPostIds = ref([])
const mediaPreview = ref(null)
const actionTarget = ref(null)
const actionReason = ref('')
const actionLoading = ref(false)
const penaltyOpen = ref(false)
const penaltyReason = ref('')
const penaltyType = ref('mute_1d')
const penaltyDurationDays = ref(3)
const penaltyUntil = ref('')
const penaltyLoading = ref(false)
<<<<<<< HEAD
const filters = reactive({ keyword: String(route.query.keyword || ''), status: String(route.query.status || 'all'), featured: 'all', media: 'all' })
=======
const filters = reactive({ keyword: String(route.query.keyword || ''), status: 'all', featured: 'all', media: 'all' })
>>>>>>> origin/master

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
const featuredOptions = [{ label: '全部内容', value: 'all' }, { label: '精选内容', value: 'featured' }, { label: '非精选', value: 'normal' }]
const mediaOptions = [{ label: '全部媒体', value: 'all' }, { label: '图片', value: 'image' }, { label: '视频', value: 'video' }, { label: '无媒体', value: 'none' }]
const statusMap = { pending: { label: '待审核', variant: 'warning' }, published: { label: '已发布', variant: 'success' }, rejected: { label: '已拒绝', variant: 'danger' }, reported: { label: '举报待复核', variant: 'warning' }, hidden: { label: '已隐藏', variant: 'neutral' } }

const penaltyOptions = [
  { label: '禁言 1 天', value: 'mute_1d' },
  { label: '禁言 7 天', value: 'mute_7d' },
  { label: '限制发帖', value: 'post_ban' },
  { label: '永久限制', value: 'permanent_post_ban' },
  { label: '恢复权限', value: 'restore' },
]

const rows = computed(() => adminStore.posts.map((item) => ({
  ...item,
  status: item.reviewStatus || item.status || 'pending',
  commentsCount: Array.isArray(item.comments) ? item.comments.length : Number(item.commentsCount || item.comments || 0),
  mediaType: item.mediaType || (item.mediaUrl ? 'image' : ''),
})))

const visible = computed(() => rows.value.filter((item) => {
  const word = filters.keyword.trim().toLowerCase()
  return (!word || `${item.title || ''}${item.excerpt || ''}${item.author || ''}`.toLowerCase().includes(word))
    && (filters.status === 'all' || item.status === filters.status)
    && (filters.featured === 'all' || (filters.featured === 'featured' ? item.featured : !item.featured))
    && (filters.media === 'all' || (filters.media === 'none' ? !item.mediaUrl : item.mediaType === filters.media))
}))

const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((item) => selectedPostIds.value.includes(item.id)))
const stats = computed(() => [
  { label: '全部内容', value: rows.value.length, mark: 'A' },
  { label: '待审核', value: rows.value.filter((item) => item.status === 'pending').length, mark: 'P' },
  { label: '已发布', value: rows.value.filter((item) => item.status === 'published').length, mark: 'S' },
  { label: '精选内容', value: rows.value.filter((item) => item.featured).length, mark: 'F' },
  { label: '举报待处理', value: rows.value.filter((item) => item.status === 'reported').length, mark: 'R' },
])

function assetUrl(url) {
  return resolveMediaUrl(url)
}

function statusMeta(status) {
  return statusMap[status] || { label: status || '未知', variant: 'neutral' }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

function riskMeta(risk) {
  if (!risk || risk.status === 'normal') return { label: '正常', variant: 'success', restore: '' }
  if (risk.isPermanent || risk.status === 'permanent_post_ban') return { label: '永久限制', variant: 'danger', restore: '' }
  return { label: '限制发帖中', variant: 'warning', restore: risk.restoreAt || risk.postLimitUntil }
}

async function refresh() {
  await adminStore.fetchAdminCollection('posts')
  selectedPostIds.value = selectedPostIds.value.filter((id) => adminStore.posts.some((item) => item.id === id))
}

function toggleSelectPost(id) {
  selectedPostIds.value = selectedPostIds.value.includes(id) ? selectedPostIds.value.filter((itemId) => itemId !== id) : [...selectedPostIds.value, id]
}

function toggleSelectVisible() {
  selectedPostIds.value = allVisibleSelected.value ? [] : visible.value.map((item) => item.id)
}

async function batchReview(status) {
  const ids = [...selectedPostIds.value]
  if (!ids.length) return
  if (['rejected', 'hidden'].includes(status)) {
    actionTarget.value = { type: 'batch', ids, status }
    actionReason.value = ''
    return
  }
  actionLoading.value = true
  try {
    let failed = 0
    for (const id of ids) {
      try { await adminStore.reviewPost(id, status) }
      catch { failed += 1 }
    }
    adminStore.apiError = failed ? `批量审核完成：成功 ${ids.length - failed} 条，失败 ${failed} 条` : `批量审核完成：成功 ${ids.length} 条`
    selectedPostIds.value = []
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
    likeUsers.value = likes.data?.items || likes.data || []
  } catch {
    likeUsers.value = []
  }
}

function openMediaPreview(item) {
  if (!item?.mediaUrl) return
  mediaPreview.value = { title: item.title || '社区媒体', type: item.mediaType || 'image', url: assetUrl(item.mediaUrl) }
}

function askAction(type, item, status = '') {
  actionReason.value = ''
  actionTarget.value = { type, item, status }
}

async function confirmAction() {
  if (!actionTarget.value) return
  const { type, item, status, ids } = actionTarget.value
  if (['rejected', 'hidden', 'deleted', 'delete'].includes(status) && !actionReason.value.trim()) {
    adminStore.apiError = '审核原因必填'
    return
  }
  actionLoading.value = true
  try {
    if (type === 'batch') {
      let failed = 0
      for (const id of ids) {
        try { await adminStore.reviewPost(id, status, actionReason.value.trim()) }
        catch { failed += 1 }
      }
      adminStore.apiError = failed ? `批量审核完成：成功 ${ids.length - failed} 条，失败 ${failed} 条` : `批量审核完成：成功 ${ids.length} 条`
      selectedPostIds.value = []
    }
    if (type === 'post') await adminStore.reviewPost(item.id, status, actionReason.value.trim())
    if (type === 'comment') await updateAdminCommentStatus(detail.value.id, item.id, status, actionReason.value.trim())
    if (type === 'report') await processAdminReport(item.id, status, actionReason.value.trim())
    const detailId = detail.value?.id
    await refresh()
    if (detailId) await openDetail({ id: detailId })
    actionTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

function openPenalty() {
  penaltyReason.value = ''
  penaltyType.value = 'mute_1d'
  penaltyDurationDays.value = 3
  penaltyUntil.value = ''
  penaltyOpen.value = true
}

async function confirmPenalty() {
  if (!penaltyReason.value.trim()) {
    adminStore.apiError = '处罚原因必填'
    return
  }
  if (penaltyType.value === 'permanent_post_ban' && !window.confirm('确认永久限制该用户的社区发帖和评论权限？')) return
  const userId = detail.value?.userId
  if (!userId) {
    adminStore.apiError = '无法识别帖子作者'
    return
  }
  penaltyLoading.value = true
  try {
    await applyCommunityUserPenalty(userId, {
      penaltyType: penaltyType.value,
      reason: penaltyReason.value.trim(),
      durationDays: penaltyType.value === 'post_ban' ? Number(penaltyDurationDays.value) || undefined : undefined,
      until: penaltyType.value === 'post_ban' && penaltyUntil.value ? penaltyUntil.value : undefined,
    })
    const detailId = detail.value.id
    penaltyOpen.value = false
    await refresh()
    await openDetail({ id: detailId })
    adminStore.apiError = '用户处罚已生效'
  } catch (error) {
    adminStore.apiError = error.message || '用户处罚失败'
  } finally {
    penaltyLoading.value = false
  }
}

onMounted(refresh)
watch(() => route.query.keyword, (value) => { filters.keyword = String(value || '') })
</script>

<template>
  <div class="admin-page community-admin">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Moderation</span>
        <h1>社区内容管理</h1>
        <p>审核帖子、评论和举报，查看媒体、点赞用户与审核时间线。</p>
      </div>
      <BaseButton variant="outline" :loading="adminStore.apiLoading" @click="refresh">刷新</BaseButton>
    </header>

    <ErrorPanel v-if="adminStore.apiError" :message="adminStore.apiError" @retry="refresh" />

    <section class="community-stats">
      <article v-for="item in stats" :key="item.label" class="community-stat"><span>{{ item.mark }}</span><div><strong>{{ item.value }}</strong><small>{{ item.label }}</small></div></article>
    </section>

    <section class="community-toolbar">
      <BaseInput v-model="filters.keyword" search label="搜索" placeholder="标题、摘要或作者" />
      <BaseSelect v-model="filters.status" label="状态" :options="statusOptions" />
      <BaseSelect v-model="filters.featured" label="精选" :options="featuredOptions" />
      <BaseSelect v-model="filters.media" label="媒体" :options="mediaOptions" />
    </section>

    <section class="community-batch-bar">
      <label><input type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length" @change="toggleSelectVisible" /> 全选当前列表</label>
      <span>已选择 {{ selectedPostIds.length }} 条</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedPostIds.length || actionLoading" :loading="actionLoading" @click="batchReview('published')">全部通过</BaseButton>
      <BaseButton size="sm" variant="ghost" :disabled="!selectedPostIds.length || actionLoading" @click="batchReview('rejected')">全部驳回</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedPostIds.length || actionLoading" @click="batchReview('hidden')">全部隐藏</BaseButton>
    </section>

    <BaseTable v-if="visible.length || adminStore.apiLoading" class="community-table" :columns="columns" :items="visible" :loading="adminStore.apiLoading" empty-text="暂无社区内容">
      <template #head-select><input class="row-select" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length" aria-label="全选当前列表" @change="toggleSelectVisible" /></template>
      <template #cell-select="{ item }"><input class="row-select" type="checkbox" :checked="selectedPostIds.includes(item.id)" :aria-label="`选择帖子 ${item.title}`" @change="toggleSelectPost(item.id)" /></template>
      <template #cell-title="{ item }"><div class="post-title-cell"><strong>{{ item.title }}</strong><p>{{ item.excerpt || item.content }}</p></div></template>
      <template #cell-author="{ item }"><div class="author-cell"><span class="author-avatar">{{ String(item.author || 'C').slice(0, 1) }}</span><strong>{{ item.author || 'Coffee Reader' }}</strong></div></template>
      <template #cell-media="{ item }"><button v-if="item.mediaUrl" class="media-cell" type="button" @click="openMediaPreview(item)"><img v-if="item.mediaType === 'image'" :src="assetUrl(item.mediaUrl)" alt="帖子图片" loading="lazy" decoding="async" /><span v-else>视频</span></button><span v-else class="text-muted">无媒体</span></template>
      <template #cell-status="{ item }"><BaseBadge :variant="statusMeta(item.status).variant">{{ statusMeta(item.status).label }}</BaseBadge></template>
      <template #cell-featured="{ item }"><BaseBadge :variant="item.featured ? 'premium' : 'neutral'">{{ item.featured ? '精选' : '普通' }}</BaseBadge></template>
      <template #cell-engagement="{ item }"><span class="text-muted">赞 {{ item.likes || 0 }} · 评 {{ item.commentsCount }}</span></template>
      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #cell-actions="{ item }">
        <div class="action-stack">
          <BaseButton size="sm" variant="outline" @click="openDetail(item)">详情</BaseButton>
          <BaseButton size="sm" variant="ghost" :disabled="item.status === 'published'" @click="askAction('post', item, 'published')">通过</BaseButton>
          <BaseButton size="sm" variant="ghost" :disabled="item.status === 'rejected'" @click="askAction('post', item, 'rejected')">拒绝</BaseButton>
          <BaseButton size="sm" variant="danger" :disabled="item.status === 'hidden'" @click="askAction('post', item, 'hidden')">隐藏</BaseButton>
        </div>
      </template>
    </BaseTable>

    <EmptyState v-else title="暂无匹配内容" action-label="刷新列表" @action="refresh" />

    <BaseDrawer :model-value="Boolean(detail)" title="帖子详情" @update:model-value="(value) => { if (!value) detail = null }">
      <article v-if="detail" class="post-detail">
        <nav class="moderation-tabs">
          <button v-for="tab in [{key:'preview',label:'帖子预览'},{key:'comments',label:`评论 ${detail.commentsCount || 0}`},{key:'likes',label:`点赞 ${detail.likes || 0}`},{key:'reports',label:`举报 ${(detail.reports || []).length}`},{key:'timeline',label:'审核时间线'}]" :key="tab.key" type="button" :class="{ 'is-active': detailTab === tab.key }" @click="detailTab = tab.key">{{ tab.label }}</button>
        </nav>
        <template v-if="detailTab === 'preview'">
          <p class="risk-status"><BaseBadge :variant="riskMeta(detail.authorRisk).variant">{{ riskMeta(detail.authorRisk).label }}</BaseBadge><span v-if="riskMeta(detail.authorRisk).restore">恢复时间：{{ formatDate(riskMeta(detail.authorRisk).restore) }}</span></p>
          <header><BaseBadge :variant="statusMeta(detail.status).variant">{{ statusMeta(detail.status).label }}</BaseBadge><h2>{{ detail.title }}</h2><p>作者：{{ detail.author || 'Coffee Reader' }} · {{ formatDate(detail.createdAt) }}</p></header>
          <div v-if="detail.mediaUrl" class="detail-media"><img v-if="detail.mediaType === 'image'" :src="assetUrl(detail.mediaUrl)" alt="帖子图片" decoding="async" @click="openMediaPreview(detail)" /><video v-else controls :src="assetUrl(detail.mediaUrl)">当前浏览器不支持视频预览。</video></div>
          <p>{{ detail.content || detail.excerpt }}</p>
          <div class="detail-actions"><BaseButton size="sm" variant="outline" @click="askAction('post', detail, 'published')">通过</BaseButton><BaseButton size="sm" variant="ghost" @click="askAction('post', detail, 'rejected')">拒绝</BaseButton><BaseButton size="sm" variant="danger" @click="askAction('post', detail, 'hidden')">隐藏</BaseButton><BaseButton size="sm" variant="outline" @click="openPenalty">处罚用户</BaseButton></div>
        </template>
        <section v-else-if="detailTab === 'comments'" class="moderation-list"><article v-for="comment in detail.comments || []" :key="comment.id"><header><strong>{{ comment.user?.nickname || comment.author || '匿名用户' }}</strong><BaseBadge :variant="comment.status === 'published' ? 'success' : 'neutral'">{{ comment.status || 'published' }}</BaseBadge></header><p>{{ comment.content }}</p><footer><BaseButton size="sm" variant="outline" @click="askAction('comment', comment, 'published')">恢复</BaseButton><BaseButton size="sm" variant="ghost" @click="askAction('comment', comment, 'hidden')">隐藏</BaseButton><BaseButton size="sm" variant="danger" @click="askAction('comment', comment, 'deleted')">删除</BaseButton></footer></article><EmptyState v-if="!detail.comments?.length" title="暂无评论" /></section>
        <section v-else-if="detailTab === 'likes'" class="moderation-list"><article v-for="user in likeUsers" :key="user.userId || user.id"><strong>{{ user.nickname || user.username || user.userId }}</strong><p>{{ user.phoneMasked || '隐私号码' }}</p><small>{{ formatDate(user.likedAt) }}</small></article><p v-if="!likeUsers.length" class="text-muted">暂无点赞用户</p></section>
        <section v-else-if="detailTab === 'reports'" class="moderation-list"><article v-for="report in detail.reports || []" :key="report.id"><header><strong>{{ report.reason || '内容举报' }}</strong><BaseBadge :variant="report.status === 'pending' ? 'warning' : 'neutral'">{{ report.status || 'pending' }}</BaseBadge></header><p>{{ report.description || '未填写补充说明' }}</p><footer v-if="report.status === 'pending'"><BaseButton size="sm" variant="outline" @click="askAction('report', report, 'dismiss')">驳回举报</BaseButton><BaseButton size="sm" variant="ghost" @click="askAction('report', report, 'hide')">隐藏内容</BaseButton><BaseButton v-if="report.commentId" size="sm" variant="danger" @click="askAction('report', report, 'delete')">删除评论</BaseButton></footer></article><EmptyState v-if="!detail.reports?.length" title="暂无举报记录" /></section>
        <section v-else class="moderation-list"><article v-for="log in detail.auditLogs || detail.timeline || []" :key="log.id || log.createdAt"><strong>{{ log.action || log.status }}</strong><p>{{ log.reason || log.description || '-' }}</p><small>{{ formatDate(log.createdAt) }}</small></article><p v-if="!(detail.auditLogs || detail.timeline || []).length" class="text-muted">暂无审核时间线</p></section>
      </article>
    </BaseDrawer>

    <BaseModal :model-value="Boolean(actionTarget)" title="确认审核操作" @update:model-value="(value) => { if (!value) actionTarget = null }">
      <div class="admin-form">
        <p>该操作会更新前台可见状态，并记录审核日志。</p>
        <BaseTextarea v-model="actionReason" label="审核原因" placeholder="拒绝、隐藏、删除等操作必须填写原因" :rows="5" />
        <p v-if="['rejected', 'hidden', 'deleted', 'delete'].includes(actionTarget?.status) && !actionReason.trim()" class="form-error">原因必填。</p>
        <div class="admin-actions"><BaseButton variant="ghost" @click="actionTarget = null">取消</BaseButton><BaseButton :variant="['hidden','deleted','delete','rejected'].includes(actionTarget?.status) ? 'danger' : 'primary'" :loading="actionLoading" @click="confirmAction">确认处理</BaseButton></div>
      </div>
    </BaseModal>

    <BaseModal v-model="penaltyOpen" title="用户处罚">
      <div class="admin-form">
        <p>当前帖子作者：{{ detail?.author || 'Coffee Reader' }}</p>
        <BaseSelect v-model="penaltyType" label="处罚类型" :options="penaltyOptions" />
        <BaseInput v-if="penaltyType === 'post_ban'" v-model="penaltyDurationDays" type="number" label="限制天数" min="1" />
        <BaseInput v-if="penaltyType === 'post_ban'" v-model="penaltyUntil" type="datetime-local" label="或指定恢复时间" />
        <p v-if="penaltyType === 'permanent_post_ban'" class="form-error">永久限制会长期禁止该用户发帖和评论，提交时需要二次确认。</p>
        <BaseTextarea v-model="penaltyReason" label="处罚原因" placeholder="原因必填" :rows="5" />
        <div class="admin-actions"><BaseButton variant="ghost" @click="penaltyOpen = false">取消</BaseButton><BaseButton variant="danger" :loading="penaltyLoading" @click="confirmPenalty">确认处罚</BaseButton></div>
      </div>
    </BaseModal>

    <BaseModal :model-value="Boolean(mediaPreview)" :title="mediaPreview?.title || '媒体预览'" @update:model-value="(value) => { if (!value) mediaPreview = null }">
      <div v-if="mediaPreview" class="media-preview"><img v-if="mediaPreview.type === 'image'" :src="mediaPreview.url" alt="媒体预览" decoding="async" /><video v-else controls :src="mediaPreview.url">当前浏览器不支持视频预览。</video><a class="media-preview__link" :href="mediaPreview.url" target="_blank" rel="noreferrer">新窗口打开</a></div>
    </BaseModal>
  </div>
</template>

<style scoped>
.community-admin { display: grid; gap: var(--cb-space-5); }
.community-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--cb-space-4); }
.community-stat { display: flex; gap: var(--cb-space-3); align-items: center; padding: var(--cb-space-4); border: 1px solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); background: var(--cb-bg-surface); }
.community-stat > span,.author-avatar { display: inline-grid; width: 2.25rem; height: 2.25rem; place-items: center; color: var(--cb-color-coffee); font-weight: var(--cb-font-bold); background: color-mix(in srgb, var(--cb-color-gold) 20%, var(--cb-bg-soft)); border-radius: var(--cb-radius-lg); }
.community-stat strong { display: block; font-size: var(--cb-font-size-2xl); }
.community-stat small { color: var(--cb-text-secondary); }
.community-toolbar { display: grid; grid-template-columns: minmax(16rem, 1.5fr) repeat(3, minmax(0, 1fr)); gap: var(--cb-space-4); padding: var(--cb-space-4); align-items: end; border: 1px solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); background: var(--cb-bg-surface); }
.community-batch-bar { display: flex; flex-wrap: wrap; gap: var(--cb-space-3); align-items: center; padding: var(--cb-space-3) var(--cb-space-4); border: 1px solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); background: var(--cb-bg-surface); }
.community-batch-bar span { margin-right: auto; color: var(--cb-text-secondary); }
.community-table :deep(.base-table) { min-width: 84rem; }
.community-table :deep(th:last-child),.community-table :deep(td:last-child) { position: sticky; right: 0; z-index: 2; min-width: 8rem; background: var(--cb-bg-surface); box-shadow: -0.75rem 0 1.25rem rgb(42 24 16 / 0.08); }
.row-select { width: 1rem; height: 1rem; accent-color: var(--cb-color-coffee); }
.post-title-cell { display: grid; min-width: 18rem; gap: var(--cb-space-2); }
.post-title-cell p { display: -webkit-box; overflow: hidden; color: var(--cb-text-secondary); -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.author-cell { display: flex; align-items: center; gap: var(--cb-space-2); }
.media-cell { display: grid; overflow: hidden; width: 4rem; height: 3rem; padding: 0; place-items: center; color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); border: 1px solid var(--cb-border-soft); border-radius: var(--cb-radius-md); background: var(--cb-bg-soft); }
.media-cell img { width: 100%; height: 100%; object-fit: cover; }
.action-stack { display: grid; min-width: 7rem; gap: var(--cb-space-2); }
.post-detail,.post-detail header,.moderation-list { display: grid; gap: var(--cb-space-4); }
.moderation-tabs { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); padding: var(--cb-space-1); background: var(--cb-bg-soft); border-radius: var(--cb-radius-pill); }
.moderation-tabs button { padding: var(--cb-space-2) var(--cb-space-4); color: var(--cb-text-secondary); background: transparent; border: 0; border-radius: var(--cb-radius-pill); }
.moderation-tabs button.is-active { color: var(--cb-text-inverse); background: var(--cb-color-coffee); }
.detail-media,.moderation-list article { overflow: hidden; border: 1px solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); background: var(--cb-bg-soft); }
.detail-media img,.detail-media video,.media-preview img,.media-preview video { display: block; width: 100%; max-height: 70vh; object-fit: contain; background: var(--cb-bg-soft); }
.moderation-list article { display: grid; gap: var(--cb-space-2); padding: var(--cb-space-4); }
.moderation-list footer,.detail-actions { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }
.risk-status { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); align-items: center; color: var(--cb-text-secondary); }
.media-preview { display: grid; gap: var(--cb-space-4); }
.media-preview__link { justify-self: start; color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
@media (max-width: 72rem) { .community-stats,.community-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 42rem) { .community-stats,.community-toolbar { grid-template-columns: 1fr; } }
</style>
