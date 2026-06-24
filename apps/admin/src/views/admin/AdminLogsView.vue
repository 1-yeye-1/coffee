<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { fetchAdminLogStats, getAdminLogDetail, getAdminLogs } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BasePagination, BaseSelect, BaseTable } from '@/components/base'
import '@/assets/styles/pages/admin-management.css'

const loading = ref(false)
const error = ref('')
const rows = ref([])
const stats = ref(null)
const detail = ref(null)
const detailOpen = ref(false)
const selectedIds = ref([])
const meta = reactive({ page: 1, pageSize: 15, total: 0 })
const filters = reactive({ userName: '', userId: '', role: 'all', module: 'all', action: 'all', startDate: '', endDate: '', keyword: '', risk: 'all' })

const columns = [
  { key: 'select', label: '' },
  { key: 'createdAt', label: '时间' },
  { key: 'risk', label: '风险' },
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
  { label: '账号', value: 'account' },
  { label: '商品', value: 'product' },
  { label: '订单', value: 'order' },
  { label: '预约', value: 'booking' },
  { label: '社区', value: 'community' },
  { label: '通知', value: 'notification' },
  { label: '积分', value: 'points' },
  { label: '座位', value: 'seat' },
  { label: '上传文件', value: 'upload' },
  { label: '图书', value: 'book' },
  { label: '活动', value: 'event' },
  { label: '用户', value: 'user' },
]

const actionOptions = [
  { label: '全部操作', value: 'all' },
  { label: '认证', value: 'auth.' },
  { label: '用户资料', value: 'user.' },
  { label: '订单', value: 'order.' },
  { label: '预约', value: 'booking.' },
  { label: '活动', value: 'event.' },
  { label: '社区帖子', value: 'post.' },
  { label: '评论', value: 'comment.' },
  { label: '积分', value: 'points.' },
  { label: '优惠券发放', value: 'coupon.issue' },
  { label: '优惠券兑换', value: 'coupon.redeem' },
  { label: '座位管理', value: 'seat.' },
  { label: '删除', value: 'delete' },
]

const roleOptions = [
  { label: '全部角色', value: 'all' },
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
]

const riskOptions = [
  { label: '全部风险', value: 'all' },
  { label: '普通日志', value: 'normal' },
  { label: '风险日志', value: 'risk' },
]

const moduleText = { auth: '登录认证', account: '账号', product: '商品', products: '商品', order: '订单', orders: '订单', booking: '预约', bookings: '预约', community: '社区', post: '社区帖子', posts: '社区帖子', comment: '评论', comments: '评论', notification: '通知', notifications: '通知', points: '积分', coupon: '优惠券', coupons: '优惠券', seat: '座位', seats: '座位', upload: '上传文件', file: '文件', book: '图书', books: '图书', event: '活动', events: '活动', user: '用户', users: '用户' }
const targetText = { admin: '管理员', user: '用户', product: '商品', order: '订单', booking: '预约', post: '帖子', comment: '评论', notification: '通知', coupon: '优惠券', user_coupon: '用户优惠券', seat: '座位', upload: '上传文件', file: '文件', book: '图书', event: '活动' }
const actionText = { 'auth.login': '登录', 'auth.logout': '退出登录', 'auth.register': '注册账号', 'user.avatar.upload': '上传头像', 'points.change': '积分变更', 'coupon.issue': '发放优惠券', 'coupon.redeem': '兑换优惠券', 'booking.create': '创建预约', 'booking.cancel': '取消预约', 'booking.status.update': '更新预约状态', login: '登录', logout: '退出登录', register: '注册账号', create: '新增', update: '修改', delete: '删除', approve: '通过', reject: '拒绝', change_status: '修改状态' }

const pageCount = computed(() => Math.max(1, Math.ceil(meta.total / meta.pageSize)))
const allVisibleSelected = computed(() => rows.value.length > 0 && rows.value.every((item) => selectedIds.value.includes(item.id)))
const statCards = computed(() => [
  ['日志总数', stats.value?.total ?? meta.total],
  ['管理员操作', stats.value?.admin ?? rows.value.filter((item) => item.role === 'admin').length],
  ['风险日志', stats.value?.risk ?? rows.value.filter(isRiskLog).length],
  ['今日日志', stats.value?.today ?? rows.value.filter((item) => String(item.createdAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length],
])

function params(page = meta.page) {
  return { ...filters, page, pageSize: meta.pageSize }
}

function validateDateRange() {
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return '开始日期不能晚于结束日期。'
  return ''
}

function isRiskLog(item) {
  return item.riskLevel === 'high' || item.risk === true || ['delete', 'reject', 'cancelled', 'disabled'].some((word) => String(item.action || item.description || '').includes(word))
}

function actionLabel(value) {
  if (!value) return '-'
  const direct = actionText[value]
  if (direct) return direct
  const parts = String(value).split('.')
  return actionText[parts[parts.length - 1]] || value
}

function moduleLabel(value) {
  return moduleText[value] || value || '-'
}

function targetLabel(item) {
  if (!item.targetType && !item.targetId) return '-'
  return `${targetText[item.targetType] || item.targetType || '目标'} ${item.targetId || ''}`.trim()
}

function descriptionLabel(value) {
  if (!value) return '-'
  return String(value)
    .replace(/^User (.+) login$/, '用户 $1 登录')
    .replace(/^User (.+) registered$/, '用户 $1 注册')
    .replace(/^Registration reward \+100$/, '注册奖励 +100 积分')
    .replace(/^User (.+) logout$/, '用户 $1 退出登录')
}

async function load(page = meta.page) {
  const rangeError = validateDateRange()
  if (rangeError) {
    error.value = rangeError
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [logs, statResult] = await Promise.all([
      getAdminLogs(params(page)),
      fetchAdminLogStats().catch(() => ({ data: null })),
    ])
    rows.value = logs.data
    stats.value = statResult.data
    selectedIds.value = []
    Object.assign(meta, logs.meta)
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

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((itemId) => itemId !== id) : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : rows.value.map((item) => item.id)
}

function applyFilters() {
  load(1)
}

function downloadFile(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function exportJson() {
  downloadFile(`admin-logs-${Date.now()}.json`, 'application/json;charset=utf-8', JSON.stringify(rows.value, null, 2))
}

function exportCsv() {
  const head = ['时间', '用户', '角色', '模块', '操作', '目标', 'IP', '描述']
  const body = rows.value.map((item) => [item.createdAt, item.userName || item.userId || '-', item.role, moduleLabel(item.module), actionLabel(item.action), targetLabel(item), item.ip || '-', descriptionLabel(item.description)])
  const csv = [head, ...body].map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadFile(`admin-logs-${Date.now()}.csv`, 'text/csv;charset=utf-8', `\ufeff${csv}`)
}

function pretty(value) {
  if (!value) return '{}'
  try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2) }
  catch { return String(value) }
}

onMounted(() => load(1))
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Admin Logs</span>
        <h1>操作日志</h1>
        <p>查看管理员与用户关键操作，支持高级筛选、风险标记、详情 payload 和导出。</p>
      </div>
      <div class="cb-cluster">
        <BaseButton variant="outline" @click="exportCsv">导出 CSV</BaseButton>
        <BaseButton variant="outline" @click="exportJson">导出 JSON</BaseButton>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="admin-stat-grid">
      <div v-for="item in statCards" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div>
    </section>

    <section class="logs-toolbar">
      <BaseInput v-model="filters.userName" label="用户名称" placeholder="账号或昵称" />
      <BaseInput v-model="filters.userId" label="用户 ID" placeholder="例如 1" />
      <BaseSelect v-model="filters.role" label="角色" :options="roleOptions" />
      <BaseSelect v-model="filters.module" label="模块" :options="moduleOptions" />
      <BaseSelect v-model="filters.action" label="操作类型" :options="actionOptions" />
      <BaseSelect v-model="filters.risk" label="风险标记" :options="riskOptions" />
      <BaseInput v-model="filters.startDate" type="date" label="开始日期" :max="filters.endDate || undefined" />
      <BaseInput v-model="filters.endDate" type="date" label="结束日期" :min="filters.startDate || undefined" />
      <BaseInput v-model="filters.keyword" label="关键词" placeholder="描述、目标或模块" />
      <BaseButton @click="applyFilters">筛选</BaseButton>
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" @change="toggleSelectAll" /> <span>全选当前页</span></label>
      <span class="admin-batch-bar__count">已选择 {{ selectedIds.length }} 项</span>
      <BaseButton size="sm" variant="outline" disabled>日志仅支持查看和导出</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="rows" :loading="loading" empty-text="暂无操作日志">
      <template #head-select><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!rows.length" aria-label="全选当前页" @change="toggleSelectAll" /></template>
      <template #cell-select="{ item }"><input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`选择日志 ${item.id}`" @change="toggleSelect(item.id)" /></template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-risk="{ item }"><BaseBadge :variant="isRiskLog(item) ? 'danger' : 'neutral'">{{ isRiskLog(item) ? '风险' : '普通' }}</BaseBadge></template>
      <template #cell-userName="{ item }">{{ item.userName || `用户 ${item.userId || '-'}` }}</template>
      <template #cell-role="{ value }"><BaseBadge :variant="value === 'admin' ? 'premium' : 'info'">{{ value === 'admin' ? '管理员' : '普通用户' }}</BaseBadge></template>
      <template #cell-module="{ value }"><BaseBadge variant="neutral">{{ moduleLabel(value) }}</BaseBadge></template>
      <template #cell-action="{ value }"><BaseBadge :variant="String(value).includes('delete') ? 'danger' : String(value).includes('reject') ? 'warning' : 'premium'">{{ actionLabel(value) }}</BaseBadge></template>
      <template #cell-target="{ item }">{{ targetLabel(item) }}</template>
      <template #cell-description="{ value }"><span class="log-description">{{ descriptionLabel(value) }}</span></template>
      <template #cell-actions="{ item }"><BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton></template>
    </BaseTable>

    <BasePagination v-if="pageCount > 1" v-model="meta.page" :total-pages="pageCount" @change="load" />

    <BaseDrawer v-model="detailOpen" title="日志详情" @close="detail = null">
      <div v-if="detail" class="log-detail">
        <section class="detail-list">
          <div class="detail-list__row"><span>时间</span><strong>{{ new Date(detail.createdAt).toLocaleString('zh-CN') }}</strong></div>
          <div class="detail-list__row"><span>用户</span><strong>{{ detail.userName || detail.userId || '-' }}</strong></div>
          <div class="detail-list__row"><span>角色</span><strong>{{ detail.role === 'admin' ? '管理员' : '普通用户' }}</strong></div>
          <div class="detail-list__row"><span>模块</span><strong>{{ moduleLabel(detail.module) }}</strong></div>
          <div class="detail-list__row"><span>操作</span><strong>{{ actionLabel(detail.action) }}</strong></div>
          <div class="detail-list__row"><span>目标</span><strong>{{ targetLabel(detail) }}</strong></div>
          <div class="detail-list__row"><span>IP</span><strong>{{ detail.ip || '-' }}</strong></div>
          <div class="detail-list__row"><span>描述</span><strong>{{ descriptionLabel(detail.description) }}</strong></div>
        </section>
        <section>
          <h3>Payload</h3>
          <pre>{{ pretty(detail.payload || detail.metadata) }}</pre>
        </section>
        <section>
          <h3>变更 Diff</h3>
          <div class="diff-grid">
            <article><strong>操作前</strong><pre>{{ pretty(detail.before || detail.beforePayload) }}</pre></article>
            <article><strong>操作后</strong><pre>{{ pretty(detail.after || detail.afterPayload) }}</pre></article>
          </div>
        </section>
        <section>
          <h3>User Agent</h3>
          <p class="text-muted">{{ detail.userAgent || '-' }}</p>
        </section>
      </div>
    </BaseDrawer>
  </div>
</template>

<style scoped>
.logs-toolbar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.log-detail,
.log-detail section {
  display: grid;
  gap: var(--cb-space-4);
}

pre {
  overflow: auto;
  max-height: 18rem;
  padding: var(--cb-space-4);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
  color: var(--cb-text-primary);
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cb-space-4);
}

@media (max-width: 72rem) {
  .logs-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .diff-grid {
    grid-template-columns: 1fr;
  }
}
</style>
