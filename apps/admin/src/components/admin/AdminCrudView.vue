<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'

import {
  BaseBadge,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTable,
  BaseTextarea,
  BaseToast,
} from '@/components/base'
import { useAdminStore } from '@/stores/admin'
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
const keyword = ref('')
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

const items = computed(() => adminStore[props.type])
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
    const statusMatches =
      !status.value ||
      status.value === 'all' ||
      (status.value === 'enabled' ? item.enabled !== false : item.enabled === false)
    return (!query || text.includes(query)) && categoryMatches && statusMatches
  })
})

function resetForm(item = {}) {
  props.fields.forEach((field) => {
    const fallback = field.type === 'number' ? 0 : field.default ?? ''
    form[field.key] = Array.isArray(item[field.key]) ? item[field.key].join('、') : item[field.key] ?? fallback
  })
}

function openCreate() {
  editingId.value = null
  resetForm()
  editorOpen.value = true
}

function openEdit(item) {
  editingId.value = item.id
  resetForm(item)
  editorOpen.value = true
}

async function save() {
  const payload = { id: editingId.value }
  props.fields.forEach((field) => {
    let value = form[field.key]
    if (field.type === 'number') value = Number(value)
    if (field.array) value = String(value).split(/[、,]/).map((item) => item.trim()).filter(Boolean)
    payload[field.key] = value
  })
  if (editingId.value === null) payload.enabled = true
  try {
    await adminStore.upsert(props.type, payload)
    editorOpen.value = false
    notify(editingId.value === null ? `已新增${props.singular}` : `已更新${props.singular}`)
  } catch (error) { notify(error.message, 'error') }
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

onMounted(async () => {
  if (['books', 'products', 'events'].includes(props.type)) {
    await adminStore.fetchAdminCollection(props.type)
  }
  loading.value = false
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title"><span class="section-eyebrow">Management</span><h1>{{ title }}</h1><p>{{ description }}</p></div>
      <BaseButton @click="openCreate">新增{{ singular }}</BaseButton>
    </header>

    <p v-if="['books', 'products'].includes(type)" class="text-muted" role="status">
      {{ adminStore.apiError ? 'API 暂不可用，当前展示本地数据。' : '列表数据来自数据库；新增、编辑、状态修改和删除会同步写入 MySQL。' }}
    </p>

    <section class="admin-stat-grid">
      <div v-for="stat in stats" :key="stat.label" class="admin-stat">
        <div class="admin-stat__top"><span>{{ stat.label }}</span><span class="admin-stat__icon">{{ stat.icon }}</span></div>
        <strong>{{ stat.value(items) }}</strong><small>{{ stat.hint }}</small>
      </div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="keyword" search :placeholder="`搜索${singular}关键词`" />
      <BaseSelect v-model="category" aria-label="分类筛选" :options="categoryFilterOptions" />
      <BaseSelect v-model="status" aria-label="状态筛选" :options="statusOptions" />
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header"><h2>{{ singular }}列表</h2><span class="text-muted">{{ filteredItems.length }} 条记录</span></div>
      <BaseTable :columns="columns" :items="filteredItems" :loading="loading" :empty-text="`暂无匹配${singular}`">
        <template #cell-visual="{ item }"><span class="admin-table-visual">{{ (item.title || item.name).slice(0, 1) }}</span></template>
        <template #cell-primary="{ item }"><div class="admin-cell-primary"><strong>{{ item.title || item.name }}</strong><small>{{ item.author || item.origin || item.location }}</small></div></template>
        <template #cell-category="{ item }"><BaseBadge variant="neutral">{{ item.category }}</BaseBadge></template>
        <template #cell-status="{ item }"><BaseBadge :variant="item.enabled === false ? 'neutral' : item.stock === 0 ? 'danger' : 'success'">{{ item.enabled === false ? '已停用' : item.status || '启用' }}</BaseBadge></template>
        <template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="openEdit(item)">编辑</BaseButton><BaseButton v-if="type === 'events'" size="sm" variant="ghost" @click="viewRegistrations(item)">查看报名</BaseButton><BaseButton size="sm" variant="ghost" @click="toggleItem(item)">{{ item.enabled === false ? '启用' : '停用' }}</BaseButton><BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton></div></template>
      </BaseTable>
    </section>

    <BaseModal v-model="editorOpen" :title="`${editingId === null ? '新增' : '编辑'}${singular}`">
      <form class="admin-form" @submit.prevent="save">
        <template v-for="field in fields" :key="field.key">
          <BaseTextarea v-if="field.type === 'textarea'" v-model="form[field.key]" :label="field.label" :rows="4" />
          <BaseSelect v-else-if="field.type === 'select'" v-model="form[field.key]" :label="field.label" :options="field.options" />
          <BaseInput v-else v-model="form[field.key]" :type="field.type || 'text'" :label="field.label" />
        </template>
        <div class="admin-actions"><BaseButton variant="ghost" type="button" @click="editorOpen = false">取消</BaseButton><BaseButton type="submit">保存</BaseButton></div>
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
