<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { deleteUploadFile, fetchUploadFiles } from '@/api/admin'
import { BaseBadge, BaseButton, BaseModal, BasePagination, BaseSelect, BaseTable } from '@/components/base'
import '@/assets/styles/pages/admin-management.css'

const loading = ref(false)
const error = ref('')
const rows = ref([])
const meta = reactive({ page: 1, pageSize: 10, total: 0 })
const filters = reactive({ scene: 'all', fileType: 'all' })
const deleting = ref(null)
const deleteOpen = ref(false)

const columns = [
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
]

const fileTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
]

const pageCount = computed(() => Math.max(1, Math.ceil(meta.total / meta.pageSize)))

function assetUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url
  const base = import.meta.env.DEV ? 'http://127.0.0.1:4173' : ''
  return `${base}${url}`
}

function formatSize(size) {
  const value = Number(size || 0)
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

async function load(page = meta.page) {
  loading.value = true
  error.value = ''
  try {
    const response = await fetchUploadFiles({
      page,
      pageSize: meta.pageSize,
      scene: filters.scene,
      fileType: filters.fileType,
    })
    rows.value = response.data
    Object.assign(meta, response.meta)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load(1)
}

function askDelete(item) {
  deleting.value = item
  deleteOpen.value = true
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

onMounted(() => load(1))
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Uploads</span>
        <h1>上传文件</h1>
        <p>查看用户上传的头像和社区媒体文件，可按场景和文件类型筛选。</p>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="admin-toolbar">
      <BaseSelect v-model="filters.scene" label="场景" :options="sceneOptions" />
      <BaseSelect v-model="filters.fileType" label="文件类型" :options="fileTypeOptions" />
      <BaseButton type="button" @click="applyFilters">筛选</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="rows" :loading="loading" empty-text="暂无上传文件">
      <template #cell-preview="{ item }">
        <img v-if="item.fileType === 'image'" class="upload-thumb" :src="assetUrl(item.url)" alt="上传图片缩略图" loading="lazy" decoding="async" />
        <a v-else class="upload-link" :href="assetUrl(item.url)" target="_blank" rel="noreferrer">查看视频</a>
      </template>
      <template #cell-scene="{ value }">
        <BaseBadge :variant="value === 'avatar' ? 'premium' : 'neutral'">{{ value === 'avatar' ? '头像' : '社区' }}</BaseBadge>
      </template>
      <template #cell-fileType="{ value }">
        <BaseBadge :variant="value === 'image' ? 'success' : 'warning'">{{ value === 'image' ? '图片' : '视频' }}</BaseBadge>
      </template>
      <template #cell-size="{ value }">{{ formatSize(value) }}</template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-actions="{ item }">
        <BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton>
      </template>
    </BaseTable>

    <BasePagination
      v-if="pageCount > 1"
      v-model="meta.page"
      :total-pages="pageCount"
      @change="load"
    />

    <BaseModal v-model="deleteOpen" title="确认删除上传文件" @close="deleting = null">
      <div class="admin-confirm">
        <p>确认删除文件“{{ deleting?.originalName || deleting?.storedName }}”吗？数据库记录会删除，并会尝试同步删除本地物理文件。</p>
        <div class="admin-actions">
          <BaseButton variant="ghost" @click="deleteOpen = false; deleting = null">取消</BaseButton>
          <BaseButton variant="danger" @click="confirmDelete">确认删除</BaseButton>
        </div>
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

.upload-thumb {
  display: block;
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border-radius: var(--cb-radius-md);
  border: 0.0625rem solid var(--cb-border-soft);
}

.upload-link {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}

@media (max-width: 48rem) {
  .admin-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
