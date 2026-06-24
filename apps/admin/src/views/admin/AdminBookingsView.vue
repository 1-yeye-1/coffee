<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { fetchSeatUsage } from '@/api/admin'
import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseModal, BaseSelect, BaseTable, BaseTextarea, BaseToast, EmptyState, ErrorPanel } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const today = new Date().toISOString().slice(0, 10)
const phone = ref(String(route.query.keyword || ''))
const date = ref('')
const status = ref('all')
const selectedIds = ref([])
const batchLoading = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const current = ref(null)
const cancelOpen = ref(false)
const cancelReason = ref('')
const pendingAction = ref(null)
const toastVisible = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const stats = ref({ todayBookings: 0, pending: 0, currentUsing: 0, todayCancelled: 0, seatUsageRate: 0, seats: { available: 0, reserved: 0, maintenance: 0, total: 0 } })
const usageDate = ref(today)
const usageTimeSlot = ref('09:00-10:30')
const seatUsage = ref([])
const seatUsageLoading = ref(false)

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已完成', value: 'completed' },
  { label: '已爽约', value: 'no_show' },
]
const timeOptions = ['09:00-10:30', '10:30-12:00', '13:00-14:30', '14:30-16:00', '16:00-17:30', '18:00-20:00', '09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map((value) => ({ label: value, value }))
const statusText = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', completed: '已完成', no_show: '已爽约' }
const statusVariant = { pending: 'warning', confirmed: 'success', cancelled: 'neutral', completed: 'premium', no_show: 'danger' }
const allowedActions = {
  pending: [{ status: 'confirmed', label: '确认', variant: 'outline' }, { status: 'cancelled', label: '取消', variant: 'danger' }],
  confirmed: [{ status: 'completed', label: '完成', variant: 'outline' }, { status: 'no_show', label: '爽约', variant: 'ghost' }, { status: 'cancelled', label: '取消', variant: 'danger' }],
}
const columns = [
  { key: 'select', label: '' },
  { key: 'bookingNo', label: '预约编号' },
  { key: 'contactName', label: '用户' },
  { key: 'phone', label: '手机号' },
  { key: 'date', label: '日期' },
  { key: 'timeSlot', label: '时间段' },
  { key: 'seat', label: '座位' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const visible = computed(() => adminStore.bookings.filter((item) => {
  const text = `${item.phone || ''}${item.contactName || ''}${item.bookingNo || ''}`.toLowerCase()
  return (!phone.value || text.includes(phone.value.toLowerCase()))
    && (!date.value || item.date === date.value)
    && (status.value === 'all' || item.status === status.value)
}))
const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((item) => selectedIds.value.includes(item.id)))
const selectedActionableIds = computed(() => selectedIds.value.filter((id) => visible.value.some((item) => Number(item.id) === Number(id))))
const seatCounts = computed(() => ({
  available: seatUsage.value.filter((item) => item.status === 'available').length,
  reserved: seatUsage.value.filter((item) => item.status === 'reserved').length,
  maintenance: seatUsage.value.filter((item) => item.status === 'maintenance').length,
}))

function showToast(title, message = '') {
  toastTitle.value = title
  toastMessage.value = message
  toastVisible.value = true
}

function actionsFor(item) {
  return allowedActions[item.status] || []
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : visible.value.map((item) => item.id)
}

async function load() {
  await adminStore.fetchAdminBookings({ phone: phone.value, date: date.value, status: status.value })
  stats.value = await adminStore.fetchAdminBookingStats({ date: usageDate.value, timeSlot: usageTimeSlot.value })
}

async function loadSeatUsage() {
  seatUsageLoading.value = true
  try {
    seatUsage.value = (await fetchSeatUsage({ date: usageDate.value, timeSlot: usageTimeSlot.value })).data
    stats.value = await adminStore.fetchAdminBookingStats({ date: usageDate.value, timeSlot: usageTimeSlot.value })
  } catch (error) {
    adminStore.apiError = error.message
  } finally {
    seatUsageLoading.value = false
  }
}

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  try {
    current.value = await adminStore.fetchAdminBookingDetail(item.id)
  } finally {
    detailLoading.value = false
  }
}

function requestStatus(item, nextStatus) {
  pendingAction.value = { mode: 'single', ids: [item.id], status: nextStatus }
  if (nextStatus === 'cancelled') {
    cancelReason.value = ''
    cancelOpen.value = true
    return
  }
  runStatusAction()
}

function requestBatchStatus(nextStatus) {
  if (!selectedActionableIds.value.length || batchLoading.value) return
  pendingAction.value = { mode: 'batch', ids: [...selectedActionableIds.value], status: nextStatus }
  if (nextStatus === 'cancelled') {
    cancelReason.value = ''
    cancelOpen.value = true
    return
  }
  runStatusAction()
}

async function runStatusAction(reason = '') {
  if (!pendingAction.value) return
  const action = pendingAction.value
  batchLoading.value = action.mode === 'batch'
  adminStore.apiError = ''
  try {
    if (action.mode === 'batch') {
      const result = await adminStore.batchUpdateAdminBookingStatus(action.ids, action.status, reason)
      selectedIds.value = []
      showToast('批量操作已完成', result.errors?.length ? `${result.errors.length} 项未处理，请查看列表状态。` : '')
    } else {
      await adminStore.updateAdminBookingStatus(action.ids[0], action.status, reason)
      showToast('预约状态已更新')
    }
    await load()
    await loadSeatUsage()
    if (current.value) current.value = await adminStore.fetchAdminBookingDetail(current.value.id)
  } finally {
    batchLoading.value = false
    pendingAction.value = null
  }
}

async function confirmCancel() {
  const reason = cancelReason.value.trim()
  if (!reason) {
    adminStore.apiError = '取消预约必须填写取消原因'
    return
  }
  cancelOpen.value = false
  await runStatusAction(reason)
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function logPayload(log) {
  if (!log?.payload) return ''
  return [log.payload.userName, log.payload.seatCode, log.payload.reason].filter(Boolean).join(' · ')
}

onMounted(async () => {
  await load()
  await loadSeatUsage()
})
watch(() => route.query.keyword, (value) => { phone.value = String(value || '') })
watch(visible, (list) => {
  const ids = new Set(list.map((item) => item.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})
</script>

<template>
  <div class="admin-page booking-admin-page">
    <ErrorPanel v-if="adminStore.apiError" :message="adminStore.apiError" @retry="load" />
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Space</span>
        <h1>预约管理</h1>
        <p>管理预约确认、完成、取消、爽约和指定时段座位占用状态。</p>
      </div>
      <BaseButton variant="outline" :loading="adminStore.apiLoading" @click="load">刷新</BaseButton>
    </header>

    <section class="admin-stat-grid">
      <div class="admin-stat"><span>今日预约数</span><strong>{{ stats.todayBookings }}</strong></div>
      <div class="admin-stat"><span>待确认数</span><strong>{{ stats.pending }}</strong></div>
      <div class="admin-stat"><span>当前使用中</span><strong>{{ stats.currentUsing }}</strong></div>
      <div class="admin-stat"><span>今日取消数</span><strong>{{ stats.todayCancelled }}</strong></div>
      <div class="admin-stat"><span>座位使用率</span><strong>{{ stats.seatUsageRate }}%</strong></div>
    </section>

    <section class="admin-filter-bar booking-filter-bar">
      <BaseInput v-model="phone" search label="搜索" placeholder="预约号、用户或手机号" />
      <BaseInput v-model="date" type="date" label="预约日期" />
      <BaseSelect v-model="status" label="预约状态" :options="statusOptions" />
      <BaseButton @click="load">筛选</BaseButton>
    </section>

    <section class="seat-usage-panel">
      <header>
        <div>
          <h2>座位占用查询</h2>
          <p>按日期和时间段查看数据库中的空闲、已预约、维护中状态。</p>
        </div>
        <div class="seat-usage-controls">
          <BaseInput v-model="usageDate" type="date" label="日期" />
          <BaseSelect v-model="usageTimeSlot" label="时间段" :options="timeOptions" />
          <BaseButton :loading="seatUsageLoading" @click="loadSeatUsage">查询</BaseButton>
        </div>
      </header>
      <div class="seat-usage-summary">
        <BaseBadge variant="success">空闲 {{ seatCounts.available }}</BaseBadge>
        <BaseBadge variant="warning">已预约 {{ seatCounts.reserved }}</BaseBadge>
        <BaseBadge variant="neutral">维护中 {{ seatCounts.maintenance }}</BaseBadge>
      </div>
      <div class="seat-usage-grid" :aria-busy="seatUsageLoading || undefined">
        <button v-for="seat in seatUsage" :key="seat.seatId" type="button" class="seat-chip" :class="`is-${seat.status}`" @click="seat.bookingInfo && openDetail({ id: seat.bookingInfo.id })">
          <strong>{{ seat.code }}</strong>
          <span>{{ seat.name }}</span>
          <small>{{ seat.status === 'available' ? '空闲' : seat.status === 'reserved' ? seat.bookingInfo?.bookingNo || '已预约' : '维护中' }}</small>
        </button>
      </div>
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length || batchLoading" @change="toggleSelectAll" /> <span>全选当前页</span></label>
      <span class="admin-batch-bar__count">已选择 {{ selectedIds.length }} 项</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="requestBatchStatus('confirmed')">批量确认</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="requestBatchStatus('cancelled')">批量取消</BaseButton>
    </section>

    <BaseTable class="booking-table" :columns="columns" :items="visible" :loading="adminStore.apiLoading" empty-text="暂无匹配预约">
      <template #head-select>
        <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length || batchLoading" aria-label="Select current page" @change="toggleSelectAll" />
      </template>
      <template #cell-select="{ item }">
        <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`select ${item.bookingNo || item.id}`" @change="toggleSelect(item.id)" />
      </template>
      <template #cell-bookingNo="{ item }">
        <button class="link-button" type="button" @click="openDetail(item)">{{ item.bookingNo }}</button>
      </template>
      <template #cell-seat="{ item }">{{ item.seatCode || item.seatName || item.seat || '-' }}</template>
      <template #cell-status="{ item }">
        <BaseBadge :variant="statusVariant[item.status] || 'neutral'">{{ statusText[item.status] || item.status }}</BaseBadge>
      </template>
      <template #cell-actions="{ item }">
        <div class="booking-actions">
          <BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton>
          <BaseButton v-for="action in actionsFor(item)" :key="action.status" size="sm" :variant="action.variant" @click="requestStatus(item, action.status)">
            {{ action.label }}
          </BaseButton>
        </div>
      </template>
    </BaseTable>

    <EmptyState v-if="!adminStore.apiLoading && !visible.length" title="暂无预约" description="当前筛选条件下没有预约记录。" />

    <BaseDrawer v-model="detailOpen" title="预约详情" @close="current = null">
      <div v-if="detailLoading" class="detail-loading">加载中...</div>
      <div v-else-if="current" class="booking-detail">
        <section>
          <BaseBadge :variant="statusVariant[current.status] || 'neutral'">{{ statusText[current.status] || current.status }}</BaseBadge>
          <h3>{{ current.bookingNo }}</h3>
        </section>
        <dl>
          <div><dt>用户信息</dt><dd>{{ current.userName || current.contactName }}（ID {{ current.userId }}）</dd></div>
          <div><dt>手机号</dt><dd>{{ current.phone }}</dd></div>
          <div><dt>座位信息</dt><dd>{{ current.seatCode || current.seat }} · {{ current.seatName || '-' }} · {{ current.seatArea || '-' }}</dd></div>
          <div><dt>预约日期</dt><dd>{{ current.date }}</dd></div>
          <div><dt>开始/结束</dt><dd>{{ current.startTime }} - {{ current.endTime }}</dd></div>
          <div><dt>人数</dt><dd>{{ current.peopleCount }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ formatDateTime(current.createdAt) }}</dd></div>
          <div><dt>更新时间</dt><dd>{{ formatDateTime(current.updatedAt) }}</dd></div>
          <div v-if="current.cancelReason"><dt>取消原因</dt><dd>{{ current.cancelReason }}</dd></div>
          <div v-if="current.note"><dt>备注</dt><dd>{{ current.note }}</dd></div>
        </dl>
        <section class="detail-actions">
          <BaseButton v-for="action in actionsFor(current)" :key="action.status" size="sm" :variant="action.variant" @click="requestStatus(current, action.status)">
            {{ action.label }}
          </BaseButton>
        </section>
        <section class="operation-log">
          <h3>操作记录</h3>
          <article v-for="log in current.operationLogs || []" :key="log.id">
            <strong>{{ log.description }}</strong>
            <span>{{ log.operatorName || '系统' }} · {{ formatDateTime(log.createdAt) }}</span>
            <small v-if="logPayload(log)">{{ logPayload(log) }}</small>
          </article>
          <p v-if="!current.operationLogs?.length" class="text-muted">暂无操作记录</p>
        </section>
      </div>
    </BaseDrawer>

    <BaseModal v-model="cancelOpen" title="填写取消原因">
      <div class="cancel-dialog">
        <p>取消预约后会通知用户，并记录到操作日志。</p>
        <BaseTextarea v-model="cancelReason" label="取消原因" placeholder="请输入取消原因" :rows="5" />
        <div class="admin-actions">
          <BaseButton variant="ghost" @click="cancelOpen = false; pendingAction = null">取消</BaseButton>
          <BaseButton variant="danger" @click="confirmCancel">确认取消预约</BaseButton>
        </div>
      </div>
    </BaseModal>

    <div class="booking-toast">
      <BaseToast v-model="toastVisible" variant="success" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.booking-admin-page {
  display: grid;
  gap: var(--cb-space-5);
}

.booking-filter-bar {
  grid-template-columns: minmax(16rem, 1fr) minmax(12rem, .5fr) minmax(12rem, .5fr) auto;
}

.seat-usage-panel {
  display: grid;
  gap: var(--cb-space-4);
  padding: var(--cb-space-5);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.seat-usage-panel header,
.seat-usage-controls,
.seat-usage-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: end;
  justify-content: space-between;
}

.seat-usage-panel h2 {
  font-size: var(--cb-font-size-xl);
}

.seat-usage-panel p {
  color: var(--cb-text-muted);
}

.seat-usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: var(--cb-space-3);
}

.seat-chip {
  display: grid;
  min-height: 5.75rem;
  padding: var(--cb-space-3);
  gap: var(--cb-space-1);
  text-align: left;
  background: var(--cb-bg-soft);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}

.seat-chip.is-available {
  border-color: color-mix(in srgb, var(--cb-success) 28%, var(--cb-border-soft));
}

.seat-chip.is-reserved {
  border-color: color-mix(in srgb, var(--cb-warning) 42%, var(--cb-border-soft));
  background: color-mix(in srgb, var(--cb-warning) 10%, var(--cb-bg-soft));
}

.seat-chip.is-maintenance {
  opacity: .72;
}

.seat-chip small {
  color: var(--cb-text-muted);
}

.booking-table :deep(.base-table) {
  min-width: 74rem;
}

.booking-table :deep(th:last-child),
.booking-table :deep(td:last-child) {
  position: sticky;
  right: 0;
  z-index: 2;
  overflow: visible;
  width: 16rem;
  min-width: 16rem;
  background: var(--cb-bg-surface);
  box-shadow: -0.75rem 0 1.25rem rgb(42 24 16 / .08);
}

.booking-table :deep(th:last-child) {
  z-index: 3;
  background: var(--cb-bg-soft);
}

.link-button {
  padding: 0;
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-bold);
  text-decoration: underline;
  background: transparent;
  border: 0;
}

.booking-actions,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}

.booking-actions :deep(.base-button) {
  min-height: 2rem;
  padding-inline: var(--cb-space-3);
}

.booking-detail,
.booking-detail section,
.booking-detail dl,
.operation-log {
  display: grid;
  gap: var(--cb-space-4);
}

.booking-detail h3 {
  font-size: var(--cb-font-size-2xl);
}

.booking-detail dl div {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: var(--cb-space-3);
}

.booking-detail dt {
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
}

.booking-detail dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.operation-log article {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.operation-log span,
.operation-log small {
  color: var(--cb-text-muted);
}

.cancel-dialog {
  display: grid;
  gap: var(--cb-space-4);
}

.booking-toast {
  position: fixed;
  right: var(--cb-space-5);
  bottom: var(--cb-space-5);
  z-index: var(--cb-z-toast);
  width: min(calc(100% - var(--cb-space-8)), 24rem);
}

@media (max-width: 64rem) {
  .booking-filter-bar {
    grid-template-columns: 1fr;
  }
}
</style>
