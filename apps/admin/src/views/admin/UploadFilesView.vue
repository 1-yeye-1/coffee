<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

<<<<<<< HEAD
import { batchDeleteUploadFiles, deleteUploadFile, fetchUploadFileStats, fetchUploadFiles } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseModal, BasePagination, BaseSelect, BaseTable } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
=======
import { batchDeleteUploadFiles, deleteUploadFile, fetchUploadFileStats, fetchUploadFiles, getUploadFileReferences } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseModal, BasePagination, BaseSelect, BaseTable } from '@/components/base'
>>>>>>> origin/master
import { resolveMediaUrl } from '@/utils/media'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const loading = ref(false)
const error = ref('')
const rows = ref([])
const stats = ref(null)
const selectedIds = ref([])
const meta = reactive({ page: 1, pageSize: 10, total: 0 })
const filters = reactive({ scene: 'all', fileType: 'all' })
const deleting = ref(null)
const deleteOpen = ref(false)
const preview = ref(null)
const detailOpen = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

const columns = [
  { key: 'select', label: '' },
  { key: 'preview', label: '预览' },
  { key: 'scene', label: '场景' },
  { key: 'fileType', label: '类型' },
  { key: 'originalName', label: '原始文件名' },
  { key: 'size', label: '大小' },
  { key: 'createdAt', label: '上传时间' },
  { key: 'actions', label: '操作' },
]

const sceneOptions = [
  { label: '全部场景', value: 'all' },
  { label: '头像', value: 'avatar' },
  { label: '社区', value: 'community' },
  { label: '商品', value: 'product' },
  { label: '图书', value: 'book' },
  { label: '活动', value: 'event' },
]

const sceneLabelMap = {
  avatar: '用户头像',
  community: '社区帖子',
  product: '商品图片',
  book: '图书封面',
  event: '活动海报',
  review: '评价媒体',
}

const fileTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
]

const pageCount = computed(() => Math.max(1, Math.ceil(meta.total / meta.pageSize)))
const allVisibleSelected = computed(() => rows.value.length > 0 && rows.value.every((item) => selectedIds.value.includes(item.id)))
const statCards = computed(() => [
  ['文件总数', stats.value?.total ?? meta.total],
  ['图片', stats.value?.images ?? rows.value.filter((item) => item.fileType === 'image').length],
  ['视频', stats.value?.videos ?? rows.value.filter((item) => item.fileType === 'video').length],
<<<<<<< HEAD
  ['未引用', stats.value?.unreferenced ?? rows.value.filter((item) => !(item.references || []).length).length],
=======
  ['未引用', stats.value?.unreferenced ?? rows.value.filter((item) => !Number(item.referenceCount || item.referencesCount || 0)).length],
>>>>>>> origin/master
])

function assetUrl(url) {
  return resolveMediaUrl(url)
}

function formatSize(size) {
  const value = Number(size || 0)
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

<<<<<<< HEAD
function sceneLabel(scene) {
  return sceneLabelMap[scene] || sceneOptions.find((item) => item.value === scene)?.label || scene || '-'
}

=======
>>>>>>> origin/master
async function load(page = meta.page) {
  loading.value = true
  error.value = ''
  try {
    const [files, statResult] = await Promise.all([
      fetchUploadFiles({ page, pageSize: meta.pageSize, scene: filters.scene, fileType: filters.fileType }),
      fetchUploadFileStats().catch(() => ({ data: null })),
    ])
    rows.value = files.data
    stats.value = statResult.data
    selectedIds.value = []
    Object.assign(meta, files.meta)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load(1)
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : rows.value.map((item) => item.id)
}

function askDelete(item) {
  deleting.value = item
  deleteOpen.value = true
}

function openPreview(item) {
  preview.value = { title: item.originalName || item.storedName || '上传媒体', type: item.fileType, url: assetUrl(item.url) }
}

<<<<<<< HEAD
function openInNewWindow(item) {
  window.open(assetUrl(item.url), '_blank', 'noopener,noreferrer')
}

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await adminStore.fetchUploadFileDetail(item.id)
  } catch {
    detail.value = { ...item, references: [], auditLogs: [] }
=======
async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = { ...item, references: [] }
  try {
    const refs = await getUploadFileReferences(item.id)
    detail.value = { ...item, references: refs.data?.items || refs.data || [] }
>>>>>>> origin/master
  } finally {
    detailLoading.value = false
  }
}

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await deleteUploadFile(deleting.value.id)
    deleting.value = null
    deleteOpen.value = false
    await load()
  } catch (err) {
    error.value = err.message
  }
}

async function deleteUnreferenced() {
<<<<<<< HEAD
  const ids = rows.value.filter((item) => selectedIds.value.includes(item.id) && !(item.references || []).length).map((item) => item.id)
=======
  const ids = rows.value.filter((item) => selectedIds.value.includes(item.id) && !Number(item.referenceCount || item.referencesCount || 0)).map((item) => item.id)
>>>>>>> origin/master
  if (!ids.length) {
    error.value = '请选择未被引用的文件'
    return
  }
  if (!window.confirm(`确认删除 ${ids.length} 个未引用文件？`)) return
  try {
    const result = await batchDeleteUploadFiles({ ids, onlyUnreferenced: true })
    const failed = result.data?.errors?.length || 0
    error.value = failed ? `批量删除完成：成功 ${ids.length - failed} 项，失败 ${failed} 项` : `批量删除完成：成功 ${ids.length} 项`
    await load()
  } catch (err) {
    error.value = err.message
  }
}

async function copyUrl(item) {
  await navigator.clipboard.writeText(assetUrl(item.url))
  error.value = '文件 URL 已复制'
}

<<<<<<< HEAD
function auditActionLabel(action) {
  if (!action) return '-'
  if (action.includes('.upload')) return '上传文件'
  if (action.includes('.delete') || action === 'delete') return '删除文件'
  if (action.includes('.batch_delete')) return '批量删除'
  if (action.includes('view_detail')) return '查看详情'
  if (action.includes('view_sensitive')) return '查看敏感信息'
  return action
}

function auditOperatorLabel(log) {
  const name = log.operatorName || '-'
  const type = log.operatorType === 'user' ? '用户' : '管理员'
  return `${name}（${type}）`
}

=======
>>>>>>> origin/master
onMounted(() => load(1))
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Uploads</span>
        <h1>上传文件</h1>
<<<<<<< HEAD
        <p>查看用户上传媒体，检查引用关系，审计操作记录，并保护仍被业务引用的文件。</p>
=======
        <p>查看用户上传媒体，检查引用关系，并保护仍被业务引用的文件。</p>
>>>>>>> origin/master
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="admin-stat-grid">
      <div v-for="item in statCards" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div>
    </section>

    <section class="admin-toolbar">
      <BaseSelect v-model="filters.scene" label="场景" :options="sceneOptions" />
      <BaseSelect v-model="filters.fileType" label="文件类型" :options="fileTypeOptions" />
      <BaseButton type="button" @click="applyFilters">筛选</BaseButton>
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" @change="toggleSelectAll" /> <span>全选当前页</span></label>
      <span class="admin-batch-bar__count">已选择 {{ selectedIds.length }} 项</span>
      <BaseButton size="sm" variant="danger" :disabled="!selectedIds.length" @click="deleteUnreferenced">批量删除未引用文件</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="rows" :loading="loading" empty-text="暂无上传文件">
      <template #head-select><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" aria-label="全选当前页" @change="toggleSelectAll" /></template>
      <template #cell-select="{ item }"><input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`选择文件 ${item.originalName || item.id}`" @change="toggleSelect(item.id)" /></template>
      <template #cell-preview="{ item }">
        <button class="upload-preview-button" type="button" @click="openPreview(item)">
<<<<<<< HEAD
          <img v-if="item.fileType === 'image'" class="upload-thumb" :src="assetUrl(item.url)" alt="上传图片缩略图" loading="lazy" decoding="async" @error="($event) => { $event.currentTarget.style.display = 'none'; const fb = $event.currentTarget.nextElementSibling; if (fb) fb.style.display = 'inline-grid'; }" />
          <span v-if="item.fileType === 'image'" class="upload-thumb-fallback" style="display:none">🖼</span>
          <span v-else class="upload-link">查看视频</span>
        </button>
      </template>
      <template #cell-scene="{ value }"><BaseBadge variant="neutral">{{ sceneLabel(value) }}</BaseBadge></template>
=======
          <img v-if="item.fileType === 'image'" class="upload-thumb" :src="assetUrl(item.url)" alt="上传图片缩略图" loading="lazy" decoding="async" />
          <span v-else class="upload-link">查看视频</span>
        </button>
      </template>
      <template #cell-scene="{ value }"><BaseBadge variant="neutral">{{ sceneOptions.find((item) => item.value === value)?.label || value }}</BaseBadge></template>
>>>>>>> origin/master
      <template #cell-fileType="{ value }"><BaseBadge :variant="value === 'image' ? 'success' : 'warning'">{{ value === 'image' ? '图片' : '视频' }}</BaseBadge></template>
      <template #cell-size="{ value }">{{ formatSize(value) }}</template>
      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #cell-actions="{ item }">
        <div class="upload-actions">
          <BaseButton size="sm" variant="outline" @click="openDetail(item)">详情</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="openPreview(item)">预览</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="copyUrl(item)">复制 URL</BaseButton>
<<<<<<< HEAD
          <BaseButton size="sm" variant="ghost" @click="openInNewWindow(item)">新窗口</BaseButton>
          <BaseButton size="sm" variant="danger" :disabled="(item.references || []).length > 0" @click="askDelete(item)">删除</BaseButton>
=======
          <BaseButton size="sm" variant="ghost" @click="window.open(assetUrl(item.url), '_blank', 'noopener')">新窗口</BaseButton>
          <BaseButton size="sm" variant="danger" :disabled="Number(item.referenceCount || item.referencesCount || 0) > 0" @click="askDelete(item)">删除</BaseButton>
>>>>>>> origin/master
        </div>
      </template>
    </BaseTable>

    <BasePagination v-if="pageCount > 1" v-model="meta.page" :total-pages="pageCount" @change="load" />
<<<<<<< HEAD
=======

    <BaseDrawer v-model="detailOpen" title="文件详情" @close="detail = null">
      <div v-if="detailLoading" class="upload-detail">加载中...</div>
      <div v-else-if="detail" class="upload-detail">
        <section>
          <h3>{{ detail.originalName || detail.storedName }}</h3>
          <p>{{ assetUrl(detail.url) }}</p>
          <BaseBadge :variant="detail.references?.length ? 'warning' : 'success'">{{ detail.references?.length ? '已被引用，删除受保护' : '未引用' }}</BaseBadge>
        </section>
        <section>
          <h3>引用关系</h3>
          <article v-for="refItem in detail.references || []" :key="`${refItem.type}-${refItem.id}`" class="reference-item">
            <strong>{{ refItem.type || refItem.module || '业务引用' }}</strong>
            <span>{{ refItem.title || refItem.name || refItem.id }}</span>
          </article>
          <p v-if="!detail.references?.length" class="text-muted">暂无引用关系，可安全删除。</p>
        </section>
        <div class="admin-actions">
          <BaseButton variant="outline" @click="copyUrl(detail)">复制 URL</BaseButton>
          <BaseButton variant="outline" @click="window.open(assetUrl(detail.url), '_blank', 'noopener')">新窗口打开</BaseButton>
          <BaseButton variant="danger" :disabled="detail.references?.length" @click="askDelete(detail)">删除文件</BaseButton>
        </div>
      </div>
    </BaseDrawer>
>>>>>>> origin/master

    <!-- ===== 详情抽屉 ===== -->
    <BaseDrawer v-model="detailOpen" title="文件详情" @close="detail = null">
      <div v-if="detailLoading" class="upload-detail">加载中...</div>
      <div v-else-if="detail" class="upload-detail">
        <!-- 文件基本信息 -->
        <section class="detail-section">
          <h3>文件信息</h3>
          <dl class="detail-grid">
            <div><dt>文件名</dt><dd>{{ detail.originalName || detail.storedName }}</dd></div>
            <div><dt>存储名</dt><dd class="text-mono">{{ detail.storedName }}</dd></div>
            <div><dt>文件类型</dt><dd><BaseBadge :variant="detail.fileType === 'image' ? 'success' : 'warning'">{{ detail.fileType === 'image' ? '图片' : '视频' }}</BaseBadge></dd></div>
            <div><dt>MIME</dt><dd class="text-mono">{{ detail.mimeType || '-' }}</dd></div>
            <div><dt>文件大小</dt><dd>{{ formatSize(detail.size) }}</dd></div>
            <div><dt>上传时间</dt><dd>{{ formatDate(detail.createdAt) }}</dd></div>
            <div class="detail-grid__full"><dt>URL</dt><dd class="text-small">{{ assetUrl(detail.url) }}</dd></div>
          </dl>
          <img v-if="detail.fileType === 'image'" class="detail-preview-image" :src="assetUrl(detail.url)" alt="文件预览" loading="lazy" decoding="async" @error="($event) => ($event.currentTarget.style.display = 'none')" />
        </section>

        <!-- 上传来源 -->
        <section class="detail-section">
          <h3>上传来源</h3>
          <dl class="detail-grid">
            <div><dt>上传场景</dt><dd><BaseBadge variant="neutral">{{ sceneLabel(detail.scene) }}</BaseBadge></dd></div>
            <div v-if="detail.uploaderName"><dt>上传用户</dt><dd>{{ detail.uploaderName }}</dd></div>
            <div v-if="detail.uploaderPhone"><dt>用户手机</dt><dd>{{ detail.uploaderPhone }}</dd></div>
            <div v-if="detail.userId"><dt>用户 ID</dt><dd>#{{ detail.userId }}</dd></div>
            <div v-else><dt>用户</dt><dd class="text-muted">后台管理员上传（无关联用户）</dd></div>
          </dl>
        </section>

        <!-- 引用关系 -->
        <section class="detail-section">
          <h3>引用关系 <BaseBadge :variant="detail.references?.length ? 'warning' : 'success'">{{ detail.references?.length ? '已引用' : '未引用' }}</BaseBadge></h3>
          <article v-for="refItem in detail.references || []" :key="`${refItem.type}-${refItem.id}`" class="reference-item">
            <strong>{{ { product: '商品图片', book: '图书封面', event: '活动海报', post: '社区帖子', user: '用户头像' }[refItem.type] || refItem.type }}</strong>
            <span>{{ refItem.label || `#${refItem.id}` }}</span>
          </article>
          <p v-if="!detail.references?.length" class="text-muted">未被任何业务引用，可安全删除。</p>
        </section>

        <!-- 操作审计记录 -->
        <section class="detail-section">
          <h3>操作记录</h3>
          <div v-if="detail.auditLogs?.length" class="audit-log-list">
            <article v-for="log in detail.auditLogs" :key="log.id" class="audit-log-item">
              <div class="audit-log-item__top">
                <strong>{{ auditActionLabel(log.action) }}</strong>
                <small>{{ formatDate(log.createdAt) }}</small>
              </div>
              <span>{{ auditOperatorLabel(log) }}</span>
              <span v-if="log.description" class="text-muted">{{ log.description }}</span>
            </article>
          </div>
          <p v-else class="text-muted">暂无操作记录。</p>
        </section>

        <!-- 操作按钮 -->
        <div class="admin-actions">
          <BaseButton variant="outline" @click="copyUrl(detail)">复制 URL</BaseButton>
          <BaseButton variant="outline" @click="openInNewWindow(detail)">新窗口打开</BaseButton>
          <BaseButton variant="danger" :disabled="detail.references?.length" @click="askDelete(detail)">删除文件</BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <!-- ===== 删除确认 ===== -->
    <BaseModal v-model="deleteOpen" title="确认删除上传文件" @close="deleting = null">
      <div class="admin-confirm">
        <p>确认删除文件"{{ deleting?.originalName || deleting?.storedName }}"吗？数据库记录会删除，并会尝试同步删除本地物理文件。</p>
        <div class="admin-actions">
          <BaseButton variant="ghost" @click="deleteOpen = false; deleting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="confirmDelete">确认删除</BaseButton>
        </div>
      </div>
    </BaseModal>

<<<<<<< HEAD
    <!-- ===== 媒体预览 ===== -->
=======
>>>>>>> origin/master
    <BaseModal :model-value="Boolean(preview)" :title="preview?.title || '媒体预览'" @update:model-value="(value) => { if (!value) preview = null }">
      <div v-if="preview" class="upload-preview">
        <img v-if="preview.type === 'image'" :src="preview.url" alt="上传图片预览" decoding="async" />
        <video v-else controls :src="preview.url">当前浏览器不支持视频预览。</video>
        <a :href="preview.url" target="_blank" rel="noreferrer">新窗口打开原文件</a>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 14rem)) auto;
  gap: var(--cb-space-4);
  align-items: end;
  margin-bottom: var(--cb-space-5);
}

.upload-preview-button {
  padding: 0;
  background: transparent;
  border: 0;
}

.upload-thumb {
  display: block;
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border-radius: var(--cb-radius-md);
  border: 1px solid var(--cb-border-soft);
<<<<<<< HEAD
  background: var(--cb-bg-soft);
}

.upload-thumb-fallback {
  display: inline-grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  font-size: var(--cb-font-size-xl);
  border-radius: var(--cb-radius-md);
  border: 1px solid var(--cb-border-soft);
  background: var(--cb-bg-soft);
=======
>>>>>>> origin/master
}

.upload-link {
  display: inline-grid;
  min-height: 2.5rem;
  padding-inline: var(--cb-space-3);
  place-items: center;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}

.upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}

.upload-preview,
.upload-detail,
<<<<<<< HEAD
.upload-detail .detail-section {
=======
.upload-detail section {
>>>>>>> origin/master
  display: grid;
  gap: var(--cb-space-4);
}

.upload-preview img,
.upload-preview video {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

<<<<<<< HEAD
.detail-grid {
  display: grid;
  gap: var(--cb-space-3);
  margin: 0;
}

.detail-grid div {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: var(--cb-space-3);
  align-items: baseline;
}

.detail-grid dt {
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
  font-size: var(--cb-font-size-sm);
}

.detail-grid dd {
  margin: 0;
}

.detail-grid__full {
  grid-column: 1 / -1;
  grid-template-columns: 5rem minmax(0, 1fr) !important;
}

.detail-preview-image {
  display: block;
  width: 100%;
  max-height: 16rem;
  object-fit: contain;
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border-soft);
  background: var(--cb-bg-soft);
}

.text-mono {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: var(--cb-font-size-xs);
  overflow-wrap: anywhere;
}
.text-small {
  font-size: var(--cb-font-size-xs);
  overflow-wrap: anywhere;
}

=======
>>>>>>> origin/master
.reference-item {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

<<<<<<< HEAD
.reference-item strong {
  font-size: var(--cb-font-size-sm);
}

.audit-log-list {
  display: grid;
  gap: var(--cb-space-2);
}

.audit-log-item {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.audit-log-item__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--cb-space-3);
}

.audit-log-item__top strong {
  font-size: var(--cb-font-size-sm);
}

.audit-log-item__top small {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-xs);
}

=======
>>>>>>> origin/master
@media (max-width: 48rem) {
  .admin-toolbar {
    grid-template-columns: 1fr;
  }
  .detail-grid div {
    grid-template-columns: 4rem minmax(0, 1fr);
  }
}
</style>
