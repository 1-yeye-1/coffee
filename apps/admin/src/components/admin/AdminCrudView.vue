<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  BaseBadge,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTable,
  BaseTextarea,
  BaseToast,
  ErrorPanel,
} from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import { uploadContentImage } from '@/api/admin'
import '@/assets/styles/pages/admin-management.css'

const props = defineProps({
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  singular: { type: String, required: true },
  columns: { type: Array, required: true },
  fields: { type: Array, required: true },
  stats: { type: Array, required: true },
  categoryOptions: { type: Array, default: () => [] },
})

const adminStore = useAdminStore()
const route = useRoute()
const keyword = ref(String(route.query.keyword || ''))
const category = ref('')
const status = ref('')
const loading = ref(true)
const editorOpen = ref(false)
const confirmOpen = ref(false)
const toastVisible = ref(false)
const toastTitle = ref('')
const toastVariant = ref('success')
const editingId = ref(null)
const deletingItem = ref(null)
const registrationEvent = ref(null)
const registrationOpen = ref(false)
const form = reactive({})
const initialForm = ref({})
const uploadingField = ref('')
const uploadInputs = ref({})
const updatingStatus = ref(null)
const selectedIds = ref([])
const batchLoading = ref(false)
const apiOrigin = String(import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : '')).replace(/\/api\/?$/, '').replace(/\/$/, '')

const items = computed(() => adminStore[props.type])
const statusField = computed(() => props.fields.find((field) => field.key === 'status'))
const columnsWithSelection = computed(() => [{ key: 'select', label: '' }, ...props.columns])
const categoryFilterOptions = computed(() => [{ label: '全部分类', value: 'all' }, ...props.categoryOptions])
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用 / 上架', value: 'enabled' },
  { label: '禁用 / 下架', value: 'disabled' },
]
const filteredItems = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return items.value.filter((item) => {
    const text = [item.title, item.name, item.author, item.category, item.location].join(' ').toLowerCase()
    const categoryMatches = !category.value || category.value === 'all' || item.category === category.value
    const statusMatches = !status.value || status.value === 'all' || item.status === status.value
    return (!query || text.includes(query)) && categoryMatches && statusMatches
  })
})
const visibleFields = computed(() => props.fields.filter((field) => field.key !== 'slug' && field.hidden !== true))
const formDirty = computed(() => JSON.stringify(form) !== JSON.stringify(initialForm.value))
const allVisibleSelected = computed(() => filteredItems.value.length > 0 && filteredItems.value.every((item) => selectedIds.value.includes(item.id)))
const batchActions = computed(() => ({
  products: [
    { label: '\u6279\u91cf\u4e0a\u67b6', kind: 'status', status: 'active' },
    { label: '\u6279\u91cf\u4e0b\u67b6', kind: 'status', status: 'inactive', confirm: true },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
  books: [
    { label: '\u6279\u91cf\u663e\u793a', kind: 'status', status: 'available' },
    { label: '\u6279\u91cf\u9690\u85cf', kind: 'status', status: 'hidden', confirm: true },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
  events: [
    { label: '\u6279\u91cf\u53d1\u5e03', kind: 'status', status: 'published' },
    { label: '\u6279\u91cf\u4e0b\u7ebf', kind: 'status', status: 'cancelled', confirm: true },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
}[props.type] || []))

function resetForm(item = {}) {
  props.fields.forEach((field) => {
    const fallback = field.type === 'number' ? 0 : field.default ?? ''
    if (field.type === 'checkbox') form[field.key] = Boolean(item[field.key] ?? fallback)
    else form[field.key] = Array.isArray(item[field.key]) ? item[field.key].join(', ') : item[field.key] ?? fallback
  })
  initialForm.value = JSON.parse(JSON.stringify(form))
}

function openCreate() {
  editingId.value = null
  adminStore.apiError = ''
  resetForm()
  editorOpen.value = true
}

function openEdit(item) {
  editingId.value = item.id
  adminStore.apiError = ''
  resetForm(item)
  editorOpen.value = true
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : filteredItems.value.map((item) => item.id)
}

async function runBatch(action) {
  const ids = [...selectedIds.value]
  if (!ids.length || batchLoading.value) return
  if (action.confirm && !window.confirm(`${action.label} ${ids.length} ${props.singular}\uff1f`)) return
  batchLoading.value = true
  adminStore.apiError = ''
  let failed = 0
  try {
    for (const id of ids) {
      try {
        if (action.kind === 'delete') await adminStore.remove(props.type, id)
        else await adminStore.updateCollectionStatus(props.type, id, action.status)
      } catch {
        failed += 1
      }
    }
    selectedIds.value = []
    await adminStore.fetchAdminCollection(props.type)
    notify(failed ? `\u6279\u91cf\u64cd\u4f5c\u5b8c\u6210\uff0c${failed} \u9879\u5931\u8d25` : '\u6279\u91cf\u64cd\u4f5c\u5df2\u5b8c\u6210', failed ? 'error' : 'success')
  } finally {
    batchLoading.value = false
  }
}

async function save() {
  adminStore.apiError = ''
  const payload = { id: editingId.value }
  const fieldsToSubmit = editingId.value === null ? props.fields : props.fields.filter((field) => form[field.key] !== initialForm.value[field.key])
  fieldsToSubmit.forEach((field) => {
    let value = form[field.key]
    if (field.type === 'number') value = Number(value)
    if (field.type === 'checkbox') value = Boolean(value)
    if (field.array) value = String(value).split(/[、,，?]/).map((item) => item.trim()).filter(Boolean)
    payload[field.key] = value
  })
  if (editingId.value !== null && Object.keys(payload).length === 1) {
    editorOpen.value = false
    notify('No changes to save')
    return
  }
  if (editingId.value === null) payload.enabled = true
  try {
    await adminStore.upsert(props.type, payload)
    adminStore.apiError = ''
    editorOpen.value = false
    notify(editingId.value === null ? `Created ${props.singular}` : `Updated ${props.singular}`)
  } catch (error) { notify(error.message, 'error') }
}

function requestEditorClose() {
  if (!formDirty.value || window.confirm('There are unsaved changes. Close anyway?')) {
    editorOpen.value = false
  }
}

async function uploadImageField(field, event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  if (event?.stopImmediatePropagation) event.stopImmediatePropagation()
  const file = event.target.files?.[0]
  if (!file) return
  adminStore.apiError = ''
  uploadingField.value = field.key
  try {
    const response = await uploadContentImage(file, field.uploadScene || 'product')
    form[field.key] = response.data.url
    notify('商品示例图上传成功')
  } catch (error) {
    notify(error.message || '图片上传失败', 'error')
  } finally {
    uploadingField.value = ''
    event.target.value = ''
  }
}

function setUploadInput(key, element) {
  if (element) uploadInputs.value[key] = element
  else delete uploadInputs.value[key]
}

function openImagePicker(field, event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  if (event?.stopImmediatePropagation) event.stopImmediatePropagation()
  uploadInputs.value[field.key]?.click()
}

function askDelete(item) {
  deletingItem.value = item
  confirmOpen.value = true
}

function viewRegistrations(item) {
  registrationEvent.value = item
  registrationOpen.value = true
}

async function toggleItem(item) {
  try { await adminStore.toggleEnabled(props.type, item.id) }
  catch (error) { notify(error.message, 'error') }
}

async function changeStatus(item, nextStatus) {
  if (!nextStatus || nextStatus === item.status) return
  updatingStatus.value = item.id
  try {
    await adminStore.updateCollectionStatus(props.type, item.id, nextStatus)
    notify('状态已更新')
  } catch (error) {
    notify(error.message, 'error')
  } finally {
    updatingStatus.value = null
  }
}

async function confirmDelete() {
  try {
    await adminStore.remove(props.type, deletingItem.value.id)
    confirmOpen.value = false
    notify(`已删除${props.singular}`)
  } catch (error) { notify(error.message, 'error') }
}

function notify(title, variant = 'success') {
  toastVisible.value = false
  toastTitle.value = title
  toastVariant.value = variant
  nextTick(() => { toastVisible.value = true })
}

function resolveAssetUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url
  return `${apiOrigin}${url}`
}

onMounted(async () => {
  if (['books', 'products', 'events'].includes(props.type)) {
    await adminStore.fetchAdminCollection(props.type)
  }
  loading.value = false
})

async function retryLoad() {
  loading.value = true
  await adminStore.fetchAdminCollection(props.type)
  loading.value = false
}
watch(() => route.query.keyword, (value) => { keyword.value = String(value || '') })
watch(filteredItems, (list) => {
  const ids = new Set(list.map((item) => item.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title"><span class="section-eyebrow">Management</span><h1>{{ title }}</h1><p>{{ description }}</p></div>
      <BaseButton @click="openCreate">新增{{ singular }}</BaseButton>
    </header>

    <ErrorPanel v-if="adminStore.apiError" :message="adminStore.apiError" @retry="retryLoad" />
    <p v-else-if="['books', 'products'].includes(type)" class="text-muted" role="status">列表数据来自数据库；新增、编辑、状态修改和删除会同步写入 MySQL。</p>

    <section class="admin-stat-grid">
      <div v-for="stat in stats" :key="stat.label" class="admin-stat">
        <div class="admin-stat__top"><span>{{ stat.label }}</span><span class="admin-stat__icon">{{ stat.icon }}</span></div>
        <strong>{{ stat.value(items) }}</strong><small>{{ stat.hint }}</small>
      </div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="keyword" search :placeholder="`搜索${singular}关键词`" />
      <BaseSelect v-model="category" aria-label="分类筛选" :options="categoryFilterOptions" />
      <BaseSelect v-model="status" aria-label="状态筛选" :options="[{ label: '全部状态', value: 'all' }, ...(statusField?.options || [])]" />
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header"><h2>{{ singular }}列表</h2><span class="text-muted">{{ filteredItems.length }} 条记录</span></div>
      <section class="admin-batch-bar">
        <label>
          <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filteredItems.length || batchLoading" @change="toggleSelectAll" />
          <span>&#20840;&#36873;&#24403;&#21069;&#39029;</span>
        </label>
        <span class="admin-batch-bar__count">&#24050;&#36873;&#25321; {{ selectedIds.length }} &#39033;</span>
        <BaseButton v-for="action in batchActions" :key="action.label" size="sm" :variant="action.variant || 'outline'" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="runBatch(action)">{{ action.label }}</BaseButton>
      </section>
      <BaseTable :columns="columnsWithSelection" :items="filteredItems" :loading="loading" :empty-text="`暂无匹配${singular}`">
        <template #head-select>
          <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filteredItems.length || batchLoading" aria-label="Select current page" @change="toggleSelectAll" />
        </template>
        <template #cell-select="{ item }">
          <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`select ${item.title || item.name}`" @change="toggleSelect(item.id)" />
        </template>
        <template #cell-visual="{ item }">
          <img v-if="item.imageUrl" class="admin-table-image" :src="resolveAssetUrl(item.imageUrl)" :alt="item.title || item.name" loading="lazy" decoding="async" />
          <span v-else class="admin-table-visual">{{ (item.title || item.name).slice(0, 1) }}</span>
        </template>
        <template #cell-primary="{ item }"><div class="admin-cell-primary"><strong>{{ item.title || item.name }}</strong><small>{{ item.author || item.origin || item.location }}</small></div></template>
        <template #cell-productType="{ item }"><BaseBadge :variant="item.productType === 'coffee' ? 'premium' : 'neutral'">{{ item.productType === 'coffee' ? '咖啡商品' : '文创商品' }}</BaseBadge></template>
        <template #cell-category="{ item }"><BaseBadge variant="neutral">{{ item.category }}</BaseBadge></template>
        <template #cell-status="{ item }"><BaseSelect :model-value="item.status" :disabled="updatingStatus === item.id" :aria-label="`修改${item.title || item.name}状态`" :options="statusField?.options || []" @update:model-value="changeStatus(item, $event)" /></template>
        <template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="openEdit(item)">编辑</BaseButton><BaseButton v-if="type === 'events'" size="sm" variant="ghost" @click="viewRegistrations(item)">查看报名</BaseButton><BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton></div></template>
      </BaseTable>
    </section>

    <BaseModal
      :model-value="editorOpen"
      :title="`${editingId === null ? 'Create ' : 'Edit '}${singular}`"
      :close-on-overlay="false"
      @update:model-value="(value) => { if (!value) requestEditorClose(); else editorOpen = true }"
    >
      <form class="admin-form" @submit.stop.prevent="save">
        <template v-for="field in visibleFields" :key="field.key">
          <BaseTextarea v-if="field.type === 'textarea'" v-model="form[field.key]" :label="field.label" :rows="4" />
          <BaseSelect v-else-if="field.type === 'select'" v-model="form[field.key]" :label="field.label" :options="field.options" />
          <div v-else-if="field.type === 'image'" class="admin-image-field">
            <BaseInput v-model="form[field.key]" :label="field.label" placeholder="填写图片 URL，或上传一张示例图" />
            <img v-if="form[field.key]" :src="resolveAssetUrl(form[field.key])" alt="商品示例图预览" decoding="async" />
            <div class="admin-upload-control">
              <input
                :ref="(element) => setUploadInput(field.key, element)"
                class="admin-upload-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                @click.stop
                @change.stop.prevent="uploadImageField(field, $event)"
              />
              <button class="admin-upload-button" type="button" @click.stop.prevent="openImagePicker(field, $event)">
                {{ uploadingField === field.key ? '上传中...' : '上传图片' }}
              </button>
              <span>{{ uploadingField === field.key ? '上传中...' : '上传图片' }}</span>
            </div>
          </div>
          <label v-else-if="field.type === 'checkbox'" class="admin-checkbox-field">
            <input v-model="form[field.key]" type="checkbox" />
            <span>{{ field.label }}</span>
          </label>
          <BaseInput v-else v-model="form[field.key]" :type="field.type || 'text'" :label="field.label" />
        </template>
        <div class="admin-actions"><BaseButton variant="ghost" type="button" @click="requestEditorClose">取消</BaseButton><BaseButton type="submit">保存</BaseButton></div>
      </form>
    </BaseModal>

    <BaseModal v-model="confirmOpen" title="确认删除">
      <div class="admin-confirm"><p>确定删除“{{ deletingItem?.title || deletingItem?.name }}”吗？此操作只影响后台本地数据。</p><div class="admin-actions"><BaseButton variant="ghost" @click="confirmOpen = false">取消</BaseButton><BaseButton variant="danger" @click="confirmDelete">确认删除</BaseButton></div></div>
    </BaseModal>
    <BaseModal v-model="registrationOpen" title="活动报名概览">
      <div v-if="registrationEvent" class="admin-form">
        <h3>{{ registrationEvent.title }}</h3>
        <div class="admin-stat-grid">
          <div class="admin-stat"><span>已报名</span><strong>{{ registrationEvent.attendees }}</strong></div>
          <div class="admin-stat"><span>活动容量</span><strong>{{ registrationEvent.capacity }}</strong></div>
        </div>
        <p class="text-muted">本阶段展示本地报名统计，不接入真实报名名单 API。</p>
      </div>
    </BaseModal>
    <div class="admin-toast"><BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastVariant === 'success' ? '数据已更新。' : '操作未完成。' }}</BaseToast></div>
  </div>
</template>

<style scoped>
.admin-image-field {
  display: grid;
  gap: var(--cb-space-3);
}
.admin-image-field img {
  width: 8rem;
  height: 5.5rem;
  object-fit: cover;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}
.admin-upload-button {
  display: inline-flex;
  width: fit-content;
  min-height: 2.5rem;
  padding: 0 var(--cb-space-4);
  align-items: center;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
  border: 0.0625rem solid var(--cb-border-strong);
  border-radius: var(--cb-radius-lg);
  cursor: pointer;
}
.admin-upload-input,
.admin-upload-control > span {
  display: none;
}
.admin-upload-button input {
  display: none;
}
.admin-table-image {
  width: 3rem;
  height: 3rem;
  object-fit: cover;
  border-radius: var(--cb-radius-lg);
}
</style>
