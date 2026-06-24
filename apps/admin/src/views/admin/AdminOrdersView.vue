<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseModal, BaseSelect, BaseTable, BaseTextarea, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import { resolveMediaUrl } from '@/utils/media'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const keyword = ref(String(route.query.keyword || ''))
const status = ref('all')
const drawerOpen = ref(false)
const current = ref(null)
const selectedIds = ref([])
const batchLoading = ref(false)
const actionModal = reactive({ open: false, mode: 'single', status: '', title: '', reason: '', target: null })

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待确认', value: 'pending_review' },
  { label: '已支付', value: 'paid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '退款中', value: 'refunding' },
  { label: '已退款', value: 'refunded' },
  { label: '支付过期', value: 'payment_expired' },
]

const columns = [
  { key: 'select', label: '' },
  { key: 'id', label: '订单号' },
  { key: 'sourceText', label: '来源' },
  { key: 'user', label: '用户' },
  { key: 'count', label: '商品数' },
  { key: 'amount', label: '金额' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'actions', label: '操作' },
]

const statusText = {
  pending_payment: '待支付',
  pending_review: '待确认',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
  refund_rejected: '退款驳回',
  payment_expired: '支付过期',
}

const badgeVariant = {
  pending_payment: 'warning',
  pending_review: 'warning',
  paid: 'info',
  completed: 'success',
  cancelled: 'neutral',
  refunding: 'warning',
  refunded: 'neutral',
  refund_rejected: 'danger',
  payment_expired: 'neutral',
}

const rows = computed(() => adminStore.orders.map((item) => ({
  ...item,
  sourceText: item.source === 'buy_now' ? '立即购买' : '购物车',
  user: item.address?.recipient || item.receiverPhone || item.userName || `用户 ${item.userId}`,
  count: (item.items || []).reduce((sum, product) => sum + Number(product.quantity || 0), 0),
  amount: item.amounts?.total ?? item.totalAmount ?? 0,
})))

const filtered = computed(() => rows.value.filter((item) =>
  (!keyword.value || `${item.id}${item.orderNo}${item.user}`.toLowerCase().includes(keyword.value.toLowerCase()))
  && (status.value === 'all' || item.status === status.value),
))

const todayKey = new Date().toISOString().slice(0, 10)
const revenue = computed(() => adminStore.orders.filter((item) => ['paid', 'completed'].includes(item.status)).reduce((sum, item) => sum + Number(item.amounts?.total ?? item.totalAmount ?? 0), 0))
const stats = computed(() => [
  ['今日订单', adminStore.orders.filter((item) => String(item.createdAt || '').slice(0, 10) === todayKey).length],
  ['待确认', adminStore.orders.filter((item) => item.status === 'pending_review').length],
  ['待处理退款', adminStore.orders.filter((item) => item.status === 'refunding').length],
  ['已完成', adminStore.orders.filter((item) => item.status === 'completed').length],
  ['今日取消', adminStore.orders.filter((item) => item.status === 'cancelled' && String(item.updatedAt || item.createdAt || '').slice(0, 10) === todayKey).length],
  ['总营收', `¥${revenue.value}`],
])

const editableStatusOptions = computed(() => statusOptions.filter((option) => !['all', 'payment_expired'].includes(option.value)))
const allVisibleSelected = computed(() => filtered.value.length > 0 && filtered.value.every((item) => selectedIds.value.includes(item.id)))

function assetUrl(url) {
  return resolveMediaUrl(url)
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : filtered.value.map((item) => item.id)
}

async function open(item) {
  current.value = await adminStore.fetchAdminOrderDetail(item.id)
  drawerOpen.value = true
}

async function refreshCurrent(action) {
  current.value = await action(current.value.id)
}

function openReasonModal(statusValue, title, target = null, mode = 'single') {
  Object.assign(actionModal, { open: true, mode, status: statusValue, title, reason: '', target })
}

async function confirmReasonAction() {
  if (['cancelled', 'refund_rejected'].includes(actionModal.status) && !actionModal.reason.trim()) {
    adminStore.apiError = '处理原因必填'
    return
  }
  batchLoading.value = actionModal.mode === 'batch'
  try {
    if (actionModal.mode === 'batch') {
      const ids = [...selectedIds.value]
      const result = await adminStore.batchUpdateResource('orders', { ids, status: actionModal.status, reason: actionModal.reason.trim() })
      selectedIds.value = []
      const failed = result?.errors?.length || 0
      adminStore.apiError = failed ? `批量操作完成：成功 ${ids.length - failed} 项，失败 ${failed} 项；${result.errors.map((item) => item.message).join('；')}` : `批量操作已完成：成功 ${ids.length} 项`
    } else if (actionModal.status === 'reject_payment') {
      current.value = await adminStore.rejectAdminOrderPayment(current.value.id, actionModal.reason.trim())
    } else {
      current.value = await adminStore.updateAdminOrderStatus(current.value.id, actionModal.status, { reason: actionModal.reason.trim() })
    }
    actionModal.open = false
  } finally {
    batchLoading.value = false
  }
}

async function updateStatus(nextStatus) {
  if (['cancelled', 'refund_rejected'].includes(nextStatus)) {
    openReasonModal(nextStatus, nextStatus === 'cancelled' ? '取消订单' : '驳回退款')
    return
  }
  current.value = await adminStore.updateAdminOrderStatus(current.value.id, nextStatus)
}

function batchOrderStatus(nextStatus, title) {
  const ids = [...selectedIds.value]
  if (!ids.length || batchLoading.value) return
  if (['cancelled', 'refund_rejected'].includes(nextStatus)) {
    openReasonModal(nextStatus, title, null, 'batch')
    return
  }
  actionModal.mode = 'batch'
  actionModal.status = nextStatus
  actionModal.reason = ''
  confirmReasonAction()
}

function brewMethodText(value) {
  return { self_grind: '自己手磨', barista: '咖啡师制作' }[value] || '-'
}

function exportCsv() {
  const head = ['订单号', '用户', '金额', '状态', '创建时间']
  const body = filtered.value.map((item) => [item.orderNo || item.id, item.user, item.amount, statusText[item.status] || item.status, formatDate(item.createdAt)])
  const csv = [head, ...body].map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `orders-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const timeline = computed(() => {
  const item = current.value
  if (!item) return []
  return [
    ['创建订单', item.createdAt],
    ['支付提交', item.paidAt || item.paymentSubmittedAt],
    ['确认支付', item.confirmedAt],
    ['完成订单', item.completedAt],
    ['取消 / 退款', item.cancelledAt || item.refundedAt],
  ].filter((entry) => entry[1])
})

onMounted(() => adminStore.fetchAdminOrders())
watch(() => route.query.keyword, (value) => { keyword.value = String(value || '') })
watch(filtered, (list) => {
  const ids = new Set(list.map((item) => item.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Orders</span>
        <h1>订单管理</h1>
        <p>查看订单详情、支付记录、退款审核和状态时间线，支持批量处理与导出。</p>
      </div>
      <BaseButton variant="outline" @click="exportCsv">导出 CSV</BaseButton>
    </header>

    <p v-if="adminStore.apiError" class="form-error" role="alert">{{ adminStore.apiError }}</p>

    <section class="admin-stat-grid">
      <div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="keyword" search placeholder="搜索订单号或用户" />
      <BaseSelect v-model="status" aria-label="订单状态" :options="statusOptions" />
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filtered.length || batchLoading" @change="toggleSelectAll" /> <span>全选当前页</span></label>
      <span class="admin-batch-bar__count">已选择 {{ selectedIds.length }} 项</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchOrderStatus('paid', '批量确认订单')">批量确认</BaseButton>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchOrderStatus('completed', '批量完成订单')">批量完成</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchOrderStatus('cancelled', '批量取消订单')">批量取消</BaseButton>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length" @click="exportCsv">导出筛选结果</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="filtered" :loading="adminStore.apiLoading" empty-text="暂无匹配订单">
      <template #head-select>
        <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filtered.length || batchLoading" aria-label="全选当前页" @change="toggleSelectAll" />
      </template>
      <template #cell-select="{ item }">
        <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`选择订单 ${item.orderNo || item.id}`" @change="toggleSelect(item.id)" />
      </template>
      <template #cell-id="{ item }"><strong>{{ item.orderNo || item.id }}</strong></template>
      <template #cell-amount="{ value }">¥{{ value }}</template>
      <template #cell-status="{ value }"><BaseBadge :variant="badgeVariant[value] || 'warning'">{{ statusText[value] || value }}</BaseBadge></template>
      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #cell-actions="{ item }"><BaseButton size="sm" variant="outline" @click="open(item)">详情</BaseButton></template>
    </BaseTable>

    <BaseDrawer v-model="drawerOpen" title="订单详情">
      <div v-if="current" class="order-detail">
        <section>
          <BaseBadge :variant="badgeVariant[current.status] || 'warning'">{{ statusText[current.status] || current.status }}</BaseBadge>
          <h3>{{ current.orderNo || current.id }}</h3>
          <p>{{ formatDate(current.createdAt) }}</p>
        </section>
        <BaseSelect :model-value="current.status" label="订单状态" :options="editableStatusOptions" @update:model-value="updateStatus" />

        <section>
          <h3>商品清单</h3>
          <div class="admin-ranking">
            <div v-for="item in current.items || []" :key="item.id" class="admin-ranking__item">
              <span>{{ item.name }} × {{ item.quantity }}<small>制作方式：{{ brewMethodText(item.brewMethod) }}</small></span>
              <strong>¥{{ item.lineTotal || item.price * item.quantity }}</strong>
            </div>
          </div>
        </section>

        <section class="detail-list">
          <div class="detail-list__row"><span>订单来源</span><strong>{{ current.source === 'buy_now' ? '立即购买' : '购物车' }}</strong></div>
          <div class="detail-list__row"><span>配送方式</span><strong>{{ current.deliveryType === 'pickup' ? '到店自取' : '快递配送' }}</strong></div>
          <div class="detail-list__row"><span>支付方式</span><strong>{{ current.paymentMethod || '-' }}</strong></div>
          <div class="detail-list__row"><span>支付状态</span><strong>{{ current.paymentStatus || '-' }}</strong></div>
          <div class="detail-list__row"><span>支付有效期</span><strong>{{ formatDate(current.paymentExpiresAt) }}</strong></div>
          <div class="detail-list__row"><span>商品总价</span><strong>¥{{ current.amounts?.subtotal ?? 0 }}</strong></div>
          <div class="detail-list__row"><span>实付金额</span><strong>¥{{ current.amounts?.total ?? 0 }}</strong></div>
          <div class="detail-list__row"><span>取消 / 退款原因</span><strong>{{ current.cancelReason || current.refundReason || '-' }}</strong></div>
        </section>

        <section>
          <h3>支付记录</h3>
          <article v-for="payment in current.payments || []" :key="payment.id" class="order-note">
            <strong>{{ payment.method || current.paymentMethod || '支付记录' }} · {{ payment.status || current.paymentStatus }}</strong>
            <span>金额 ¥{{ payment.amount || current.amounts?.total || 0 }} · {{ formatDate(payment.createdAt) }}</span>
          </article>
          <p v-if="!current.payments?.length" class="text-muted">暂无支付记录</p>
          <a v-if="current.paymentProofUrl" class="proof-link" :href="assetUrl(current.paymentProofUrl)" target="_blank" rel="noreferrer">新窗口查看支付凭证</a>
        </section>

        <section>
          <h3>状态时间线</h3>
          <ol class="order-timeline">
            <li v-for="item in timeline" :key="item[0]"><strong>{{ item[0] }}</strong><span>{{ formatDate(item[1]) }}</span></li>
          </ol>
        </section>

        <section>
          <h3>操作日志</h3>
          <article v-for="log in current.auditLogs || current.logs || []" :key="log.id" class="order-note">
            <strong>{{ log.action || log.description }}</strong>
            <span>{{ log.operatorName || log.userName || '系统' }} · {{ formatDate(log.createdAt) }}</span>
          </article>
          <p v-if="!(current.auditLogs || current.logs || []).length" class="text-muted">暂无操作日志</p>
        </section>

        <div class="admin-row-actions">
          <BaseButton v-if="current.status === 'pending_review'" size="sm" @click="refreshCurrent(adminStore.confirmAdminOrderPayment)">确认支付</BaseButton>
          <BaseButton v-if="current.status === 'pending_review'" size="sm" variant="danger" @click="openReasonModal('reject_payment', '驳回支付凭证')">驳回支付</BaseButton>
          <BaseButton v-if="current.status === 'pending_payment'" size="sm" variant="outline" @click="refreshCurrent(adminStore.expireAdminOrderPayment)">标记过期</BaseButton>
          <BaseButton v-if="current.status === 'paid'" size="sm" @click="updateStatus('completed')">确认完成</BaseButton>
          <BaseButton v-if="current.status === 'refunding'" size="sm" @click="updateStatus('refunded')">通过退款</BaseButton>
          <BaseButton v-if="current.status === 'refunding'" size="sm" variant="danger" @click="openReasonModal('refund_rejected', '驳回退款')">驳回退款</BaseButton>
          <BaseButton v-if="['pending_payment', 'pending_review'].includes(current.status)" size="sm" variant="danger" @click="openReasonModal('cancelled', '取消订单')">取消订单</BaseButton>
        </div>
      </div>
      <EmptyState v-else title="未选择订单" />
    </BaseDrawer>

    <BaseModal v-model="actionModal.open" :title="actionModal.title">
      <div class="admin-form">
        <BaseTextarea v-model="actionModal.reason" label="处理原因" placeholder="请输入处理原因" :rows="5" />
        <p v-if="['cancelled', 'refund_rejected'].includes(actionModal.status) && !actionModal.reason.trim()" class="form-error">原因必填。</p>
        <div class="admin-actions">
          <BaseButton variant="ghost" @click="actionModal.open = false">取消</BaseButton>
          <BaseButton :variant="['cancelled', 'refund_rejected', 'reject_payment'].includes(actionModal.status) ? 'danger' : 'primary'" :loading="batchLoading" @click="confirmReasonAction">确认处理</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.order-detail,
.order-detail section {
  display: grid;
  gap: var(--cb-space-4);
}

.order-note {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.order-note span,
.order-timeline span {
  color: var(--cb-text-muted);
}

.proof-link {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}

.order-timeline {
  display: grid;
  gap: var(--cb-space-3);
  padding-left: 1.25rem;
}
</style>
