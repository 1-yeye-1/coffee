<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { exportAdminLogs, getAdminLogDetail, getAdminLogs } from '@/api/admin'
import { BaseBadge, BaseButton, BaseInput, BaseModal, BasePagination, BaseSelect, BaseTable } from '@/components/base'
import '@/assets/styles/pages/admin-management.css'

const loading = ref(false)
const error = ref('')
const rows = ref([])
const detail = ref(null)
const detailOpen = ref(false)
const exportMessage = ref('')
const selectedIds = ref([])
const meta = reactive({ page: 1, pageSize: 15, total: 0 })
const filters = reactive({
  userName: '',
  userId: '',
  role: 'all',
  module: 'all',
  action: 'all',
  startDate: '',
  endDate: '',
  keyword: '',
})

const columns = [
  { key: 'select', label: '' },
  { key: 'createdAt', label: '时间' },
  { key: 'userName', label: '用户' },
  { key: 'role', label: '角色' },
  { key: 'module', label: '模块' },
  { key: 'action', label: '操作' },
  { key: 'target', label: '目标' },
  { key: 'ip', label: 'IP' },
  { key: 'description', label: '描述' },
  { key: 'actions', label: '操作' },
]

const moduleOptions = [
  { label: '全部模块', value: 'all' },
  { label: '登录认证', value: 'auth' },
  { label: '账户', value: 'account' },
  { label: '商品', value: 'product' },
  { label: '订单', value: 'order' },
  { label: '预约', value: 'booking' },
  { label: '社区', value: 'community' },
  { label: '通知', value: 'notification' },
  { label: '积分', value: 'points' },
  { label: '座位', value: 'seat' },
  { label: '上传文件', value: 'upload' },
  { label: '图书', value: 'book' },
]

const actionOptions = [
  { label: '全部操作', value: 'all' },
  { label: '认证', value: 'auth.' },
  { label: '用户资料', value: 'user.' },
  { label: '订单', value: 'order.' },
  { label: '预约', value: 'booking.' },
  { label: '活动', value: 'event.' },
  { label: '社区', value: 'post.' },
  { label: '评论', value: 'comment.' },
  { label: '积分', value: 'points.' },
  { label: '优惠券发放', value: 'coupon.issue' },
  { label: '优惠券兑换', value: 'coupon.redeem' },
  { label: '座位管理', value: 'seat.' },
]

const roleOptions = [
  { label: '全部角色', value: 'all' },
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
]

const actionText = {
  login: '登录',
  create: '新增',
  update: '修改',
  delete: '删除',
  approve: '通过',
  reject: '拒绝',
  change_status: '改状态',
}

const pageCount = computed(() => Math.max(1, Math.ceil(meta.total / meta.pageSize)))
const allVisibleSelected = computed(() => rows.value.length > 0 && rows.value.every((item) => selectedIds.value.includes(item.id)))

function params(page = meta.page) {
  return { ...filters, page, pageSize: meta.pageSize }
}

async function load(page = meta.page) {
  loading.value = true
  error.value = ''
  try {
    const response = await getAdminLogs(params(page))
    rows.value = response.data
    selectedIds.value = []
    Object.assign(meta, response.meta)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function openDetail(item) {
  try {
    detail.value = (await getAdminLogDetail(item.id)).data
    detailOpen.value = true
  } catch (err) {
    error.value = err.message
  }
}

async function exportLogs() {
  exportMessage.value = ''
  try {
    await exportAdminLogs(params())
  } catch (err) {
    exportMessage.value = err.message || '导出功能暂未开放'
  }
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : rows.value.map((item) => item.id)
}

function applyFilters() {
  load(1)
}

onMounted(() => load(1))
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Admin Logs</span>
        <h1>操作日志</h1>
        <p>查看管理员与普通用户的关键操作，支持按用户、角色、操作类型和时间筛选。</p>
      </div>
      <BaseButton variant="outline" @click="exportLogs">导出日志</BaseButton>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="exportMessage" class="form-error">{{ exportMessage }}</p>

    <section class="logs-toolbar">
      <BaseInput v-model="filters.userName" label="用户名称" placeholder="输入账号或昵称" />
      <BaseInput v-model="filters.userId" label="用户 ID" placeholder="例如 1" />
      <BaseSelect v-model="filters.role" label="角色" :options="roleOptions" />
      <BaseSelect v-model="filters.module" label="模块" :options="moduleOptions" />
      <BaseSelect v-model="filters.action" label="操作类型" :options="actionOptions" />
      <BaseInput v-model="filters.startDate" type="date" label="开始日期" />
      <BaseInput v-model="filters.endDate" type="date" label="结束日期" />
      <BaseInput v-model="filters.keyword" label="关键词" placeholder="搜索描述、目标或模块" />
      <BaseButton @click="applyFilters">筛选</BaseButton>
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" @change="toggleSelectAll" /> <span>&#20840;&#36873;&#24403;&#21069;&#39029;</span></label>
      <span class="admin-batch-bar__count">&#24050;&#36873;&#25321; {{ selectedIds.length }} &#39033;</span>
      <BaseButton size="sm" variant="outline" disabled>&#26085;&#24535;&#20165;&#25903;&#25345;&#26597;&#30475;&#65292;&#19981;&#25191;&#34892;&#25209;&#37327;&#21024;&#38500;</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="rows" :loading="loading" empty-text="暂无操作日志">
      <template #head-select>
        <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" aria-label="Select current page" @change="toggleSelectAll" />
      </template>
      <template #cell-select="{ item }">
        <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`select log ${item.id}`" @change="toggleSelect(item.id)" />
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-userName="{ item }">{{ item.userName || `用户 ${item.userId || '-'}` }}</template>
      <template #cell-role="{ value }"><BaseBadge :variant="value === 'admin' ? 'premium' : 'info'">{{ value === 'admin' ? '管理员' : '普通用户' }}</BaseBadge></template>
      <template #cell-module="{ value }">
        <BaseBadge variant="neutral">{{ value }}</BaseBadge>
      </template>
      <template #cell-action="{ value }">
        <BaseBadge :variant="value === 'delete' ? 'danger' : value === 'approve' ? 'success' : value === 'reject' ? 'warning' : 'premium'">
          {{ actionText[value] || value }}
        </BaseBadge>
      </template>
      <template #cell-target="{ item }">{{ item.targetType || '-' }} {{ item.targetId || '' }}</template>
      <template #cell-description="{ value }"><span class="log-description">{{ value || '-' }}</span></template>
      <template #cell-actions="{ item }">
        <BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton>
      </template>
    </BaseTable>

    <BasePagination
      v-if="pageCount > 1"
      v-model="meta.page"
      :total-pages="pageCount"
      @change="load"
    />

    <BaseModal v-model="detailOpen" title="日志详情" @close="detail = null">
      <dl v-if="detail" class="log-detail">
        <div><dt>时间</dt><dd>{{ new Date(detail.createdAt).toLocaleString('zh-CN') }}</dd></div>
        <div><dt>用户</dt><dd>{{ detail.userName || detail.userId || '-' }}</dd></div>
        <div><dt>用户 ID</dt><dd>{{ detail.userId || '-' }}</dd></div>
        <div><dt>角色</dt><dd>{{ detail.role === 'admin' ? '管理员' : '普通用户' }}</dd></div>
        <div><dt>模块</dt><dd>{{ detail.module }}</dd></div>
        <div><dt>操作</dt><dd>{{ actionText[detail.action] || detail.action }}</dd></div>
        <div><dt>目标类型</dt><dd>{{ detail.targetType || '-' }}</dd></div>
        <div><dt>目标 ID</dt><dd>{{ detail.targetId || '-' }}</dd></div>
        <div><dt>IP</dt><dd>{{ detail.ip || '-' }}</dd></div>
        <div><dt>User Agent</dt><dd>{{ detail.userAgent || '-' }}</dd></div>
        <div><dt>描述</dt><dd>{{ detail.description || '-' }}</dd></div>
      </dl>
    </BaseModal>
  </div>
</template>

<style scoped>
.logs-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--cb-space-4);
  align-items: end;
  margin-bottom: var(--cb-space-5);
}

.log-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.log-detail {
  display: grid;
  gap: var(--cb-space-3);
}

.log-detail div {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: var(--cb-space-3);
}

.log-detail dt {
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
}

.log-detail dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 64rem) {
  .logs-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 42rem) {
  .logs-toolbar,
  .log-detail div {
    grid-template-columns: 1fr;
  }
}
</style>
