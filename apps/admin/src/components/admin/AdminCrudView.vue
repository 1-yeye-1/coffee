<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  BaseBadge,
  BaseButton,
  BaseDrawer,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseSkeleton,
  BaseTable,
  BaseTextarea,
  BaseToast,
  EmptyState,
  ErrorPanel,
} from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import { exportEventRegistrations, fetchEventRegistrations, updateEventRegistrationStatus, uploadContentImage } from '@/api/admin'
import { resolveMediaUrl } from '@/utils/media'
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
const registrationLoading = ref(false)
const registrationError = ref('')
const registrationRows = ref([])
const registrationMeta = ref({ page: 1, pageSize: 10, total: 0 })
const registrationFilters = reactive({ keyword: '', status: 'all', checkinStatus: 'all', page: 1, pageSize: 10 })
const registrationAction = ref(null)
const registrationReason = ref('')
const registrationActionLoading = ref(false)
<<<<<<< HEAD
const bookReservationBook = ref(null)
const bookReservationOpen = ref(false)
const bookReservationLoading = ref(false)
const bookReservationError = ref('')
const bookReservationRows = ref([])
const bookReservationMeta = ref({ page: 1, pageSize: 10, total: 0 })
const bookReservationFilters = reactive({ keyword: '', status: 'all', page: 1, pageSize: 10 })
const bookReservationAction = ref(null)
const bookReservationReason = ref('')
const bookReservationActionLoading = ref(false)
=======
>>>>>>> origin/master
const detailOpen = ref(false)
const detailLoading = ref(false)
const currentDetail = ref(null)
const stockOpen = ref(false)
const stockTarget = ref(null)
const stockForm = reactive({ changeType: 'in', amount: 1, reason: '' })
const form = reactive({})
const initialForm = ref({})
const uploadingField = ref('')
const uploadInputs = ref({})
const updatingStatus = ref(null)
const selectedIds = ref([])
const batchLoading = ref(false)

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
    { label: '\u6279\u91cf\u63a8\u8350', kind: 'flags', payload: { isFeatured: true } },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
  books: [
    { label: '\u6279\u91cf\u663e\u793a', kind: 'status', status: 'available' },
    { label: '\u6279\u91cf\u9690\u85cf', kind: 'status', status: 'hidden', confirm: true },
    { label: '\u6279\u91cf\u63a8\u8350', kind: 'flags', payload: { isRecommended: true } },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
  events: [
    { label: '\u6279\u91cf\u53d1\u5e03', kind: 'status', status: 'published' },
    { label: '\u6279\u91cf\u4e0b\u7ebf', kind: 'status', status: 'cancelled', confirm: true },
    { label: '\u6279\u91cf\u5220\u9664', kind: 'delete', variant: 'danger', confirm: true },
  ],
}[props.type] || []))
const canManageStock = computed(() => ['products', 'books'].includes(props.type))
const stockTypeOptions = computed(() => props.type === 'books'
  ? [
      { label: '入库', value: 'in' },
      { label: '出库', value: 'out' },
      { label: '设为指定库存', value: 'adjust' },
      { label: '破损', value: 'damaged' },
      { label: '遗失', value: 'lost' },
    ]
  : [
      { label: '入库', value: 'in' },
      { label: '出库', value: 'out' },
      { label: '设为指定库存', value: 'adjust' },
    ])
const registrationColumns = [
  { key: 'nickname', label: '用户' },
  { key: 'phone', label: '手机号' },
  { key: 'email', label: '邮箱' },
  { key: 'status', label: '报名状态' },
  { key: 'checkinStatus', label: '签到状态' },
  { key: 'registeredAt', label: '报名时间' },
  { key: 'actions', label: '操作' },
]
const registrationStatusOptions = [
  { label: '全部报名状态', value: 'all' },
  { label: '已报名', value: 'registered' },
  { label: '已取消', value: 'cancelled' },
  { label: '已参加', value: 'attended' },
  { label: '缺席', value: 'absent' },
]
const checkinStatusOptions = [
  { label: '全部签到状态', value: 'all' },
  { label: '待签到', value: 'pending' },
  { label: '已参加', value: 'attended' },
  { label: '缺席', value: 'absent' },
  { label: '已取消', value: 'cancelled' },
]
<<<<<<< HEAD
const bookReservationColumns = [
  { key: 'nickname', label: '用户' },
  { key: 'phone', label: '手机号' },
  { key: 'reservationNo', label: '预约编号' },
  { key: 'status', label: '预约状态' },
  { key: 'reservedAt', label: '预约时间' },
  { key: 'actions', label: '操作' },
]
const bookReservationStatusOptions = [
  { label: '全部预约状态', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]
const editableBookReservationStatuses = [
  { label: '待处理', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]
=======
>>>>>>> origin/master

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
        else if (action.kind === 'flags') await adminStore.updateFlags(props.type, id, action.payload)
        else await adminStore.updateCollectionStatus(props.type, id, action.status)
      } catch {
        failed += 1
      }
    }
    selectedIds.value = []
    await adminStore.fetchAdminCollection(props.type)
    notify(failed ? `批量操作完成：成功 ${ids.length - failed} 项，失败 ${failed} 项` : `批量操作已完成：成功 ${ids.length} 项`, failed ? 'error' : 'success')
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
  registrationError.value = ''
  Object.assign(registrationFilters, { keyword: '', status: 'all', checkinStatus: 'all', page: 1, pageSize: 10 })
  loadRegistrations()
}

<<<<<<< HEAD
function viewBookReservations(item) {
  bookReservationBook.value = item
  bookReservationOpen.value = true
  bookReservationError.value = ''
  Object.assign(bookReservationFilters, { keyword: '', status: 'all', page: 1, pageSize: 10 })
  loadBookReservations()
}

=======
>>>>>>> origin/master
async function loadRegistrations() {
  if (!registrationEvent.value) return
  registrationLoading.value = true
  registrationError.value = ''
  try {
    const response = await fetchEventRegistrations(registrationEvent.value.id, registrationFilters)
    registrationRows.value = response.data || []
    registrationMeta.value = response.meta || { page: registrationFilters.page, pageSize: registrationFilters.pageSize, total: registrationRows.value.length }
  } catch (error) {
    registrationError.value = error.message || '报名名单加载失败'
  } finally {
    registrationLoading.value = false
  }
}

<<<<<<< HEAD
async function loadBookReservations() {
  if (!bookReservationBook.value) return
  bookReservationLoading.value = true
  bookReservationError.value = ''
  try {
    const response = await adminStore.fetchAdminBookReservations(bookReservationBook.value.id, bookReservationFilters)
    bookReservationRows.value = response.data || []
    bookReservationMeta.value = response.meta || { page: bookReservationFilters.page, pageSize: bookReservationFilters.pageSize, total: bookReservationRows.value.length }
  } catch (error) {
    bookReservationError.value = error.message || '图书预约记录加载失败'
  } finally {
    bookReservationLoading.value = false
  }
}

=======
>>>>>>> origin/master
function searchRegistrations() {
  registrationFilters.page = 1
  loadRegistrations()
}

<<<<<<< HEAD
function searchBookReservations() {
  bookReservationFilters.page = 1
  loadBookReservations()
}

=======
>>>>>>> origin/master
function askRegistrationAction(item, status) {
  registrationReason.value = ''
  registrationAction.value = { item, status }
}

<<<<<<< HEAD
function askBookReservationAction(item, status) {
  bookReservationReason.value = ''
  bookReservationAction.value = { item, status }
}

=======
>>>>>>> origin/master
async function confirmRegistrationAction() {
  if (!registrationAction.value || !registrationEvent.value) return
  const { item, status } = registrationAction.value
  if (status === 'cancelled' && !registrationReason.value.trim()) {
    registrationError.value = '取消报名必须填写原因'
    return
  }
  registrationActionLoading.value = true
  try {
    await updateEventRegistrationStatus(registrationEvent.value.id, item.registrationId, { status, reason: registrationReason.value.trim() })
    registrationAction.value = null
    await Promise.all([loadRegistrations(), adminStore.fetchAdminCollection(props.type)])
    registrationEvent.value = adminStore.events.find((event) => event.id === registrationEvent.value.id) || registrationEvent.value
    notify('报名状态已更新')
  } catch (error) {
    notify(error.message || '报名状态更新失败', 'error')
  } finally {
    registrationActionLoading.value = false
  }
}

<<<<<<< HEAD
async function confirmBookReservationAction() {
  if (!bookReservationAction.value || !bookReservationBook.value) return
  const { item, status } = bookReservationAction.value
  bookReservationActionLoading.value = true
  try {
    await adminStore.updateAdminBookReservationStatus(bookReservationBook.value.id, item.id, { status, reason: bookReservationReason.value.trim() })
    bookReservationAction.value = null
    await Promise.all([loadBookReservations(), adminStore.fetchAdminCollection('books')])
    const refreshed = adminStore.books.find((book) => Number(book.id) === Number(bookReservationBook.value.id))
    if (refreshed) bookReservationBook.value = refreshed
    if (currentDetail.value?.id === item.bookId || currentDetail.value?.id === bookReservationBook.value?.id) {
      try {
        currentDetail.value = await adminStore.fetchAdminDetail('books', bookReservationBook.value.id) || currentDetail.value
      } catch {
        // ignore detail refresh error
      }
    }
    notify('图书预约状态已更新')
  } catch (error) {
    notify(error.message || '图书预约状态更新失败', 'error')
  } finally {
    bookReservationActionLoading.value = false
  }
}

=======
>>>>>>> origin/master
async function downloadRegistrations() {
  if (!registrationEvent.value) return
  try {
    const blob = await exportEventRegistrations(registrationEvent.value.id, registrationFilters)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `event-${registrationEvent.value.id}-registrations.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify('报名名单已导出')
  } catch (error) {
    notify(error.message || '导出失败', 'error')
  }
}

function changeRegistrationPage(page) {
  registrationFilters.page = page
  loadRegistrations()
}

<<<<<<< HEAD
function changeBookReservationPage(page) {
  bookReservationFilters.page = page
  loadBookReservations()
}

=======
>>>>>>> origin/master
function registrationStatusLabel(status) {
  return { registered: '已报名', cancelled: '已取消', attended: '已参加', absent: '缺席' }[status] || status || '-'
}

function checkinStatusLabel(status) {
  return { pending: '待签到', attended: '已参加', absent: '缺席', cancelled: '已取消' }[status] || status || '-'
}

<<<<<<< HEAD
function bookReservationStatusLabel(status) {
  return { pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[status] || status || '-'
}

=======
>>>>>>> origin/master
function formatRegistrationDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  currentDetail.value = item
  try {
    currentDetail.value = await adminStore.fetchAdminDetail(props.type, item.id) || item
  } catch {
    currentDetail.value = item
  } finally {
    detailLoading.value = false
  }
}

function openStock(item) {
  stockTarget.value = item
  Object.assign(stockForm, { changeType: 'in', amount: 1, reason: '' })
  stockOpen.value = true
}

async function saveStock() {
  if (!stockForm.reason.trim()) {
    adminStore.apiError = '库存调整原因必填'
    return
  }
  const result = await adminStore.adjustStock(props.type, stockTarget.value.id, { ...stockForm, amount: Number(stockForm.amount) })
  stockOpen.value = false
  stockTarget.value = null
  currentDetail.value = result
  notify('库存已调整')
}

async function updateFlag(item, key, value) {
  const result = await adminStore.updateFlags(props.type, item.id, { [key]: value })
  if (currentDetail.value?.id === item.id) currentDetail.value = { ...currentDetail.value, ...result }
  notify('标记已更新')
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
  return resolveMediaUrl(url)
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
        <template #cell-primary="{ item }"><div class="admin-cell-primary"><button class="admin-link-button" type="button" @click="openDetail(item)">{{ item.title || item.name }}</button><small>{{ item.author || item.origin || item.location }}</small></div></template>
        <template #cell-productType="{ item }"><BaseBadge :variant="item.productType === 'coffee' ? 'premium' : 'neutral'">{{ item.productType === 'coffee' ? '咖啡商品' : '文创商品' }}</BaseBadge></template>
        <template #cell-category="{ item }"><BaseBadge variant="neutral">{{ item.category }}</BaseBadge></template>
        <template #cell-status="{ item }"><BaseSelect :model-value="item.status" :disabled="updatingStatus === item.id" :aria-label="`修改${item.title || item.name}状态`" :options="statusField?.options || []" @update:model-value="changeStatus(item, $event)" /></template>
        <template #cell-stock="{ item }"><span :class="{ 'stock-warning': Number(item.stock || 0) <= Number(item.lowStockThreshold || (type === 'books' ? 3 : 5)) }">{{ item.stock }}</span></template>
<<<<<<< HEAD
        <template #cell-reservableStock="{ item }"><span :class="{ 'stock-warning': type === 'books' && Number(item.reservableStock || 0) === 0 }">{{ item.reservableStock ?? 0 }}</span></template>
        <template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton><BaseButton size="sm" variant="ghost" @click="openEdit(item)">编辑</BaseButton><BaseButton v-if="canManageStock" size="sm" variant="outline" @click="openStock(item)">库存</BaseButton><BaseButton v-if="type === 'books'" size="sm" variant="ghost" @click="viewBookReservations(item)">预约记录</BaseButton><BaseButton v-if="type === 'events'" size="sm" variant="ghost" @click="viewRegistrations(item)">查看报名</BaseButton><BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton></div></template>
=======
        <template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton><BaseButton size="sm" variant="ghost" @click="openEdit(item)">编辑</BaseButton><BaseButton v-if="canManageStock" size="sm" variant="outline" @click="openStock(item)">库存</BaseButton><BaseButton v-if="type === 'events'" size="sm" variant="ghost" @click="viewRegistrations(item)">查看报名</BaseButton><BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton></div></template>
>>>>>>> origin/master
      </BaseTable>
    </section>

    <BaseDrawer v-model="detailOpen" :title="`${singular}详情`" @close="currentDetail = null">
      <div v-if="detailLoading" class="admin-detail-loading">加载中...</div>
      <div v-else-if="currentDetail" class="admin-detail">
        <section>
          <BaseBadge v-if="currentDetail.status" variant="neutral">{{ currentDetail.status }}</BaseBadge>
          <h3>{{ currentDetail.title || currentDetail.name }}</h3>
<<<<<<< HEAD
          <p v-if="type !== 'books'" class="text-muted">{{ currentDetail.description || currentDetail.summary || currentDetail.location || '暂无简介' }}</p>
          <template v-else>
            <p v-if="currentDetail.summary" class="text-muted">{{ currentDetail.summary }}</p>
            <section v-if="currentDetail.description" class="admin-detail-text">
              <h4>内容简介</h4>
              <p>{{ currentDetail.description }}</p>
            </section>
            <section v-if="currentDetail.authorBio" class="admin-detail-text">
              <h4>作者介绍</h4>
              <p>{{ currentDetail.authorBio }}</p>
            </section>
            <p v-if="!currentDetail.summary && !currentDetail.description && !currentDetail.authorBio" class="text-muted">暂无简介</p>
          </template>
=======
          <p class="text-muted">{{ currentDetail.description || currentDetail.summary || currentDetail.location || '暂无简介' }}</p>
>>>>>>> origin/master
        </section>
        <section v-if="['products', 'books'].includes(type)" class="flag-grid">
          <label v-if="type === 'products'"><input type="checkbox" :checked="currentDetail.isFeatured" @change="updateFlag(currentDetail, 'isFeatured', $event.target.checked)" /> 推荐</label>
          <label v-if="type === 'products'"><input type="checkbox" :checked="currentDetail.isNew" @change="updateFlag(currentDetail, 'isNew', $event.target.checked)" /> 新品</label>
          <label v-if="type === 'products'"><input type="checkbox" :checked="currentDetail.isHot" @change="updateFlag(currentDetail, 'isHot', $event.target.checked)" /> 热销</label>
          <label v-if="type === 'books'"><input type="checkbox" :checked="currentDetail.isRecommended" @change="updateFlag(currentDetail, 'isRecommended', $event.target.checked)" /> 推荐</label>
          <label v-if="type === 'books'"><input type="checkbox" :checked="currentDetail.isFeatured" @change="updateFlag(currentDetail, 'isFeatured', $event.target.checked)" /> 热门</label>
          <label v-if="type === 'books'"><input type="checkbox" :checked="currentDetail.isNew" @change="updateFlag(currentDetail, 'isNew', $event.target.checked)" /> 新书</label>
        </section>
        <dl class="admin-detail-list">
          <div><dt>分类</dt><dd>{{ currentDetail.category || '-' }}</dd></div>
          <div v-if="type === 'products'"><dt>价格</dt><dd>¥{{ currentDetail.price }}</dd></div>
          <div v-if="canManageStock"><dt>库存</dt><dd>{{ currentDetail.stock }} / 预警 {{ currentDetail.lowStockThreshold || (type === 'books' ? 3 : 5) }}</dd></div>
<<<<<<< HEAD
          <div v-if="type === 'books'"><dt>可预约</dt><dd>{{ currentDetail.reservableStock ?? 0 }} / 当前预约中 {{ currentDetail.activeReservationCount || 0 }}</dd></div>
=======
>>>>>>> origin/master
          <div v-if="type === 'books'"><dt>馆藏位置</dt><dd>{{ currentDetail.locationLabel || currentDetail.shelfArea || '-' }} {{ currentDetail.shelfCode || '' }}</dd></div>
          <div v-if="type === 'events'"><dt>报名</dt><dd>{{ currentDetail.attendees || 0 }} / {{ currentDetail.capacity || 0 }}</dd></div>
          <div><dt>更新时间</dt><dd>{{ currentDetail.updatedAt ? new Date(currentDetail.updatedAt).toLocaleString('zh-CN') : '-' }}</dd></div>
        </dl>
        <section v-if="canManageStock" class="stock-log">
          <header><h3>库存日志</h3><BaseButton size="sm" variant="outline" @click="openStock(currentDetail)">调整库存</BaseButton></header>
          <article v-for="log in currentDetail.stockLogs || []" :key="log.id">
            <strong>{{ log.changeType }} {{ log.changeAmount > 0 ? '+' : '' }}{{ log.changeAmount }}</strong>
            <span>{{ log.beforeStock }} → {{ log.afterStock }} · {{ log.reason }}</span>
            <small>{{ log.operatorName || '系统' }} · {{ new Date(log.createdAt).toLocaleString('zh-CN') }}</small>
          </article>
          <p v-if="!currentDetail.stockLogs?.length" class="text-muted">暂无库存日志</p>
        </section>
      </div>
    </BaseDrawer>

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
    <BaseModal v-model="stockOpen" title="库存调整">
      <form class="admin-form" @submit.prevent="saveStock">
        <p>当前对象：{{ stockTarget?.title || stockTarget?.name }}</p>
        <BaseSelect v-model="stockForm.changeType" label="调整方式" :options="stockTypeOptions" />
        <BaseInput v-model="stockForm.amount" type="number" label="数量 / 目标库存" min="0" />
        <BaseTextarea v-model="stockForm.reason" label="调整原因" placeholder="原因必填，例如补货、盘点修正、损耗登记" :rows="4" />
        <div class="admin-actions"><BaseButton variant="ghost" type="button" @click="stockOpen = false">取消</BaseButton><BaseButton type="submit">确认调整</BaseButton></div>
      </form>
    </BaseModal>
    <BaseDrawer v-model="registrationOpen" title="活动报名名单" @close="registrationEvent = null">
      <div v-if="registrationEvent" class="admin-detail registration-admin">
        <section>
          <BaseBadge variant="neutral">{{ registrationEvent.status }}</BaseBadge>
          <h3>{{ registrationEvent.title }}</h3>
          <p class="text-muted">报名 {{ registrationEvent.attendees || 0 }} / {{ registrationEvent.capacity || 0 }}</p>
        </section>
        <div class="admin-stat-grid">
          <div class="admin-stat"><span>已报名</span><strong>{{ registrationEvent.attendees || 0 }}</strong></div>
          <div class="admin-stat"><span>名单总数</span><strong>{{ registrationMeta.total || 0 }}</strong></div>
          <div class="admin-stat"><span>本页已参加</span><strong>{{ registrationRows.filter((item) => item.status === 'attended').length }}</strong></div>
        </div>
        <ErrorPanel v-if="registrationError" :message="registrationError" @retry="loadRegistrations" />
        <section class="admin-filter-bar">
          <BaseInput v-model="registrationFilters.keyword" search placeholder="搜索昵称、手机号、邮箱" @keyup.enter="searchRegistrations" />
          <BaseSelect v-model="registrationFilters.status" :options="registrationStatusOptions" @update:model-value="searchRegistrations" />
          <BaseSelect v-model="registrationFilters.checkinStatus" :options="checkinStatusOptions" @update:model-value="searchRegistrations" />
          <BaseButton variant="outline" @click="downloadRegistrations">导出 CSV</BaseButton>
        </section>
        <BaseSkeleton v-if="registrationLoading" variant="table" :lines="6" />
        <EmptyState v-else-if="!registrationRows.length" title="暂无报名记录" />
        <BaseTable v-else class="registration-table" :columns="registrationColumns" :items="registrationRows" empty-text="暂无报名记录">
          <template #cell-nickname="{ item }"><strong>{{ item.nickname || `用户${item.userId}` }}</strong></template>
          <template #cell-status="{ item }"><BaseBadge variant="neutral">{{ registrationStatusLabel(item.status) }}</BaseBadge></template>
          <template #cell-checkinStatus="{ item }"><BaseBadge :variant="item.checkinStatus === 'attended' ? 'success' : item.checkinStatus === 'absent' ? 'danger' : 'neutral'">{{ checkinStatusLabel(item.checkinStatus) }}</BaseBadge></template>
          <template #cell-registeredAt="{ value }">{{ formatRegistrationDate(value) }}</template>
          <template #cell-actions="{ item }">
            <div class="admin-row-actions">
              <BaseButton size="sm" variant="ghost" :disabled="item.status === 'attended'" @click="askRegistrationAction(item, 'attended')">标记已参加</BaseButton>
              <BaseButton size="sm" variant="ghost" :disabled="item.status === 'absent'" @click="askRegistrationAction(item, 'absent')">标记缺席</BaseButton>
              <BaseButton size="sm" variant="danger" :disabled="item.status === 'cancelled'" @click="askRegistrationAction(item, 'cancelled')">取消报名</BaseButton>
            </div>
          </template>
        </BaseTable>
        <div v-if="registrationMeta.total > registrationMeta.pageSize" class="admin-pagination">
          <BaseButton size="sm" variant="outline" :disabled="registrationMeta.page <= 1 || registrationLoading" @click="changeRegistrationPage(registrationMeta.page - 1)">上一页</BaseButton>
          <span class="text-muted">第 {{ registrationMeta.page }} 页 / 共 {{ Math.ceil(registrationMeta.total / registrationMeta.pageSize) }} 页</span>
          <BaseButton size="sm" variant="outline" :disabled="registrationMeta.page >= Math.ceil(registrationMeta.total / registrationMeta.pageSize) || registrationLoading" @click="changeRegistrationPage(registrationMeta.page + 1)">下一页</BaseButton>
        </div>
      </div>
    </BaseDrawer>
<<<<<<< HEAD
    <BaseDrawer v-model="bookReservationOpen" title="图书预约记录" @close="bookReservationBook = null">
      <div v-if="bookReservationBook" class="admin-detail registration-admin">
        <section>
          <BaseBadge variant="neutral">{{ bookReservationBook.status }}</BaseBadge>
          <h3>{{ bookReservationBook.title }}</h3>
          <p class="text-muted">可预约 {{ bookReservationBook.reservableStock ?? 0 }} / 当前预约中 {{ bookReservationBook.activeReservationCount || 0 }}</p>
        </section>
        <div class="admin-stat-grid">
          <div class="admin-stat"><span>当前预约中</span><strong>{{ bookReservationBook.activeReservationCount || 0 }}</strong></div>
          <div class="admin-stat"><span>列表总数</span><strong>{{ bookReservationMeta.total || 0 }}</strong></div>
          <div class="admin-stat"><span>剩余可预约</span><strong>{{ bookReservationBook.reservableStock ?? 0 }}</strong></div>
        </div>
        <ErrorPanel v-if="bookReservationError" :message="bookReservationError" @retry="loadBookReservations" />
        <section class="admin-filter-bar">
          <BaseInput v-model="bookReservationFilters.keyword" search placeholder="搜索用户、手机号、预约编号" @keyup.enter="searchBookReservations" />
          <BaseSelect v-model="bookReservationFilters.status" :options="bookReservationStatusOptions" @update:model-value="searchBookReservations" />
        </section>
        <BaseSkeleton v-if="bookReservationLoading" variant="table" :lines="6" />
        <EmptyState v-else-if="!bookReservationRows.length" title="暂无图书预约记录" />
        <BaseTable v-else class="registration-table" :columns="bookReservationColumns" :items="bookReservationRows" empty-text="暂无图书预约记录">
          <template #cell-nickname="{ item }"><strong>{{ item.nickname || `用户${item.userId}` }}</strong></template>
          <template #cell-status="{ item }"><BaseBadge :variant="item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'danger' : item.status === 'confirmed' ? 'info' : 'warning'">{{ bookReservationStatusLabel(item.status) }}</BaseBadge></template>
          <template #cell-reservedAt="{ value }">{{ formatRegistrationDate(value) }}</template>
          <template #cell-actions="{ item }">
            <div class="admin-row-actions">
              <BaseButton v-for="statusItem in editableBookReservationStatuses" :key="statusItem.value" size="sm" variant="ghost" :disabled="item.status === statusItem.value" @click="askBookReservationAction(item, statusItem.value)">{{ statusItem.label }}</BaseButton>
            </div>
          </template>
        </BaseTable>
        <div v-if="bookReservationMeta.total > bookReservationMeta.pageSize" class="admin-pagination">
          <BaseButton size="sm" variant="outline" :disabled="bookReservationMeta.page <= 1 || bookReservationLoading" @click="changeBookReservationPage(bookReservationMeta.page - 1)">上一页</BaseButton>
          <span class="text-muted">第 {{ bookReservationMeta.page }} 页 / 共 {{ Math.ceil(bookReservationMeta.total / bookReservationMeta.pageSize) }} 页</span>
          <BaseButton size="sm" variant="outline" :disabled="bookReservationMeta.page >= Math.ceil(bookReservationMeta.total / bookReservationMeta.pageSize) || bookReservationLoading" @click="changeBookReservationPage(bookReservationMeta.page + 1)">下一页</BaseButton>
        </div>
      </div>
    </BaseDrawer>
=======
>>>>>>> origin/master
    <BaseModal :model-value="Boolean(registrationAction)" title="更新报名状态" @update:model-value="(value) => { if (!value) registrationAction = null }">
      <div class="admin-form">
        <p>将 {{ registrationAction?.item?.nickname }} 更新为 {{ registrationStatusLabel(registrationAction?.status) }}。</p>
        <BaseTextarea v-model="registrationReason" :label="registrationAction?.status === 'cancelled' ? '取消原因' : '备注原因'" :placeholder="registrationAction?.status === 'cancelled' ? '取消报名必须填写原因' : '标记缺席可填写原因'" :rows="4" />
        <p v-if="registrationAction?.status === 'cancelled' && !registrationReason.trim()" class="form-error">取消报名必须填写原因。</p>
        <div class="admin-actions"><BaseButton variant="ghost" @click="registrationAction = null">取消</BaseButton><BaseButton :variant="registrationAction?.status === 'cancelled' ? 'danger' : 'primary'" :loading="registrationActionLoading" @click="confirmRegistrationAction">确认更新</BaseButton></div>
<<<<<<< HEAD
      </div>
    </BaseModal>
    <BaseModal :model-value="Boolean(bookReservationAction)" title="更新图书预约状态" @update:model-value="(value) => { if (!value) bookReservationAction = null }">
      <div class="admin-form">
        <p>将 {{ bookReservationAction?.item?.nickname || `用户${bookReservationAction?.item?.userId || ''}` }} 的预约更新为 {{ bookReservationStatusLabel(bookReservationAction?.status) }}。</p>
        <BaseTextarea v-model="bookReservationReason" label="备注" placeholder="可选填写处理说明" :rows="4" />
        <div class="admin-actions"><BaseButton variant="ghost" @click="bookReservationAction = null">取消</BaseButton><BaseButton :variant="bookReservationAction?.status === 'cancelled' ? 'danger' : 'primary'" :loading="bookReservationActionLoading" @click="confirmBookReservationAction">确认更新</BaseButton></div>
=======
>>>>>>> origin/master
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

.admin-link-button {
  padding: 0;
  color: var(--cb-color-coffee);
  font: inherit;
  font-weight: var(--cb-font-bold);
  text-align: left;
  background: transparent;
  border: 0;
}

.stock-warning {
  color: var(--cb-danger);
  font-weight: var(--cb-font-bold);
}

.admin-detail,
.admin-detail section,
.admin-detail-list,
.stock-log {
  display: grid;
  gap: var(--cb-space-4);
}

.admin-detail h3 {
  font-size: var(--cb-font-size-2xl);
}

<<<<<<< HEAD
.admin-detail-text h4 {
  margin: 0 0 var(--cb-space-2);
  font-size: var(--cb-font-size-sm);
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
}

.admin-detail-text p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

=======
>>>>>>> origin/master
.flag-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.flag-grid label {
  display: flex;
  gap: var(--cb-space-2);
  align-items: center;
  padding: var(--cb-space-3);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.admin-detail-list div {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: var(--cb-space-3);
}

.admin-detail-list dt {
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
}

.admin-detail-list dd {
  margin: 0;
}

.stock-log header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-3);
}

.stock-log article {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.stock-log span,
.stock-log small {
  color: var(--cb-text-muted);
}

.registration-admin {
  width: 100%;
  min-width: 0;
}

.registration-table :deep(.base-table-wrap) {
  max-width: 100%;
  overflow-x: hidden;
}

.registration-table :deep(.base-table) {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
}

.registration-table :deep(.base-table th),
.registration-table :deep(.base-table td) {
  padding: var(--cb-space-3);
  white-space: normal;
}

.registration-table :deep(.base-table td) {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.registration-table :deep(.base-table th:nth-child(1)),
.registration-table :deep(.base-table td:nth-child(1)) {
  width: 8%;
}

.registration-table :deep(.base-table th:nth-child(2)),
.registration-table :deep(.base-table td:nth-child(2)) {
  width: 12%;
}

.registration-table :deep(.base-table th:nth-child(3)),
.registration-table :deep(.base-table td:nth-child(3)) {
  width: 26%;
}

.registration-table :deep(.base-table th:nth-child(4)),
.registration-table :deep(.base-table td:nth-child(4)),
.registration-table :deep(.base-table th:nth-child(5)),
.registration-table :deep(.base-table td:nth-child(5)) {
  width: 9%;
}

.registration-table :deep(.base-table th:nth-child(6)),
.registration-table :deep(.base-table td:nth-child(6)) {
  width: 16%;
}

.registration-table :deep(.base-table th:nth-child(7)),
.registration-table :deep(.base-table td:nth-child(7)) {
  width: 20%;
}

.registration-table :deep(.admin-row-actions) {
  align-items: flex-start;
  gap: var(--cb-space-2);
}

.registration-table :deep(.admin-row-actions > *) {
  min-width: max-content;
}

.admin-pagination {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: flex-end;
}
</style>
