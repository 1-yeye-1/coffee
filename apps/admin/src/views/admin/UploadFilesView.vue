<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { batchDeleteUploadFiles, deleteUploadFile, fetchUploadFileStats, fetchUploadFiles, getUploadFileReferences } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseModal, BasePagination, BaseSelect, BaseTable } from '@/components/base'
import { resolveMediaUrl } from '@/utils/media'
import '@/assets/styles/pages/admin-management.css'

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
  ['未引用', stats.value?.unreferenced ?? rows.value.filter((item) => !Number(item.referenceCount || item.referencesCount || 0)).length],
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

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = { ...item, references: [] }
  try {
    const refs = await getUploadFileReferences(item.id)
    detail.value = { ...item, references: refs.data?.items || refs.data || [] }
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
  const ids = rows.value.filter((item) => selectedIds.value.includes(item.id) && !Number(item.referenceCount || item.referencesCount || 0)).map((item) => item.id)
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

onMounted(() => load(1))
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Uploads</span>
        <h1>上传文件</h1>
        <p>查看用户上传媒体，检查引用关系，并保护仍被业务引用的文件。</p>
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
          <img v-if="item.fileType === 'image'" class="upload-thumb" :src="assetUrl(item.url)" alt="上传图片缩略图" loading="lazy" decoding="async" />
          <span v-else class="upload-link">查看视频</span>
        </button>
      </template>
      <template #cell-scene="{ value }"><BaseBadge variant="neutral">{{ sceneOptions.find((item) => item.value === value)?.label || value }}</BaseBadge></template>
      <template #cell-fileType="{ value }"><BaseBadge :variant="value === 'image' ? 'success' : 'warning'">{{ value === 'image' ? '图片' : '视频' }}</BaseBadge></template>
      <template #cell-size="{ value }">{{ formatSize(value) }}</template>
      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #cell-actions="{ item }">
        <div class="upload-actions">
          <BaseButton size="sm" variant="outline" @click="openDetail(item)">详情</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="openPreview(item)">预览</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="copyUrl(item)">复制 URL</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="window.open(assetUrl(item.url), '_blank', 'noopener')">新窗口</BaseButton>
          <BaseButton size="sm" variant="danger" :disabled="Number(item.referenceCount || item.referencesCount || 0) > 0" @click="askDelete(item)">删除</BaseButton>
        </div>
      </template>
    </BaseTable>

    <BasePagination v-if="pageCount > 1" v-model="meta.page" :total-pages="pageCount" @change="load" />

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

    <BaseModal v-model="deleteOpen" title="确认删除上传文件" @close="deleting = null">
      <div class="admin-confirm">
        <p>确认删除文件“{{ deleting?.originalName || deleting?.storedName }}”吗？数据库记录会删除，并会尝试同步删除本地物理文件。</p>
        <div class="admin-actions">
          <BaseButton variant="ghost" @click="deleteOpen = false; deleting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="confirmDelete">确认删除</BaseButton>
        </div>
      </div>
    </BaseModal>

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
.upload-detail section {
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

.reference-item {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

@media (max-width: 48rem) {
  .admin-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
