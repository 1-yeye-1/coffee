<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseSelect, BaseTable, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const keyword = ref(String(route.query.keyword || ''))
const status = ref('')
const drawerOpen = ref(false)
const current = ref(null)
const selectedIds = ref([])
const batchLoading = ref(false)
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待确认', value: 'pending_review' },
  { label: '已支付', value: 'paid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' },
  { label: '支付过期', value: 'payment_expired' },
]
const columns = [
  { key: 'select', label: '' },
  { key: 'id', label: '订单号' },
  { key: 'sourceText', label: '来源' },
  { key: 'user', label: '用户' },
  { key: 'count', label: '商品数量' },
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
  refunded: '已退款',
  payment_expired: '支付过期',
}
const badgeVariant = {
  pending_payment: 'warning',
  pending_review: 'warning',
  paid: 'info',
  completed: 'success',
  cancelled: 'neutral',
  refunded: 'neutral',
  payment_expired: 'neutral',
}
const rows = computed(() => adminStore.orders.map((item) => ({
  ...item,
  sourceText: item.source === 'buy_now' ? '立即购买' : '购物车',
  user: item.address?.recipient || item.receiverPhone || `用户 ${item.userId}`,
  count: item.items.reduce((sum, product) => sum + product.quantity, 0),
  amount: item.amounts.total,
})))
const filtered = computed(() => rows.value.filter((item) =>
  (!keyword.value || `${item.id}${item.orderNo}${item.user}`.toLowerCase().includes(keyword.value.toLowerCase()))
  && (!status.value || status.value === 'all' || item.status === status.value),
))
const revenue = computed(() => adminStore.orders.filter((item) => ['paid', 'completed'].includes(item.status)).reduce((sum, item) => sum + item.amounts.total, 0))
const stats = computed(() => [
  ['订单总数', adminStore.orders.length],
  ['待支付', adminStore.orders.filter((item) => item.status === 'pending_payment').length],
  ['待确认', adminStore.orders.filter((item) => item.status === 'pending_review').length],
  ['已支付', adminStore.orders.filter((item) => item.status === 'paid').length],
  ['已完成', adminStore.orders.filter((item) => item.status === 'completed').length],
  ['总营收', `¥${revenue.value}`],
])
const editableStatusOptions = computed(() => statusOptions.filter((option) => option.value !== 'all' && option.value !== 'payment_expired'))
const allVisibleSelected = computed(() => filtered.value.length > 0 && filtered.value.every((item) => selectedIds.value.includes(item.id)))

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : filtered.value.map((item) => item.id)
}

async function batchOrderStatus(nextStatus, label) {
  const ids = [...selectedIds.value]
  if (!ids.length || batchLoading.value) return
  batchLoading.value = true
  adminStore.apiError = ''
  let failed = 0
  try {
    for (const id of ids) {
      try { await adminStore.updateAdminOrderStatus(id, nextStatus) }
      catch { failed += 1 }
    }
    selectedIds.value = []
    await adminStore.fetchAdminOrders()
    if (failed) adminStore.apiError = `${label}\u5b8c\u6210\uff0c${failed} \u9879\u5931\u8d25`
  } finally {
    batchLoading.value = false
  }
}

async function open(item) {
  current.value = await adminStore.fetchAdminOrderDetail(item.id)
  drawerOpen.value = true
}

async function refreshCurrent(action) {
  current.value = await action(current.value.id)
}

async function updateStatus(nextStatus) {
  current.value = await adminStore.updateAdminOrderStatus(current.value.id, nextStatus)
}

function brewMethodText(value) {
  return { self_grind: '自己手磨', barista: '咖啡师制作' }[value] || '-'
}

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
        <span class="section-eyebrow">订单</span>
        <h1>订单管理</h1>
        <p>查看订单详情，处理模拟支付确认、驳回和履约状态。</p>
      </div>
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
      <label>
        <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filtered.length || batchLoading" @change="toggleSelectAll" />
        <span>&#20840;&#36873;&#24403;&#21069;&#39029;</span>
      </label>
      <span class="admin-batch-bar__count">&#24050;&#36873;&#25321; {{ selectedIds.length }} &#39033;</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchOrderStatus('paid', '\u6279\u91cf\u6807\u8bb0\u5df2\u5904\u7406')">&#25209;&#37327;&#26631;&#35760;&#24050;&#22788;&#29702;</BaseButton>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchOrderStatus('completed', '\u6279\u91cf\u6807\u8bb0\u5df2\u5b8c\u6210')">&#25209;&#37327;&#26631;&#35760;&#24050;&#23436;&#25104;</BaseButton>
    </section>

    <BaseTable :columns="columns" :items="filtered" :loading="adminStore.apiLoading" empty-text="暂无匹配订单">
      <template #head-select>
        <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!filtered.length || batchLoading" aria-label="Select current page" @change="toggleSelectAll" />
      </template>
      <template #cell-select="{ item }">
        <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`select ${item.orderNo || item.id}`" @change="toggleSelect(item.id)" />
      </template>
      <template #cell-id="{ item }"><strong>{{ item.orderNo || item.id }}</strong></template>
      <template #cell-amount="{ value }">¥{{ value }}</template>
      <template #cell-status="{ value }"><BaseBadge :variant="badgeVariant[value] || 'warning'">{{ statusText[value] || value }}</BaseBadge></template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-actions="{ item }"><BaseButton size="sm" variant="outline" @click="open(item)">查看详情</BaseButton></template>
    </BaseTable>

    <BaseDrawer v-model="drawerOpen" title="订单详情">
      <div v-if="current" class="admin-form">
        <div>
          <BaseBadge :variant="badgeVariant[current.status] || 'warning'">{{ statusText[current.status] || current.status }}</BaseBadge>
          <h3>{{ current.orderNo || current.id }}</h3>
          <p>{{ new Date(current.createdAt).toLocaleString('zh-CN') }}</p>
        </div>
        <BaseSelect :model-value="current.status" label="订单状态" :options="editableStatusOptions" @update:model-value="updateStatus" />

        <section>
          <h3>商品清单</h3>
          <div class="admin-ranking">
            <div v-for="item in current.items" :key="item.id" class="admin-ranking__item">
              <span>
                {{ item.name }} × {{ item.quantity }}
                <small>制作方式：{{ brewMethodText(item.brewMethod) }}</small>
              </span>
              <strong>¥{{ item.lineTotal || item.price * item.quantity }}</strong>
            </div>
          </div>
        </section>

        <section class="detail-list">
          <div class="detail-list__row"><span>订单来源</span><strong>{{ current.source === 'buy_now' ? '立即购买' : '购物车' }}</strong></div>
          <div class="detail-list__row"><span>配送方式</span><strong>{{ current.deliveryType === 'pickup' ? '到店自取' : '快递配送' }}</strong></div>
          <div class="detail-list__row"><span>支付方式</span><strong>{{ current.paymentMethod }}</strong></div>
          <div class="detail-list__row"><span>支付状态</span><strong>{{ current.paymentStatus || '-' }}</strong></div>
          <div class="detail-list__row"><span>支付有效期</span><strong>{{ current.paymentExpiresAt ? new Date(current.paymentExpiresAt).toLocaleString('zh-CN') : '-' }}</strong></div>
          <div class="detail-list__row"><span>商品总价</span><strong>¥{{ current.amounts.subtotal }}</strong></div>
          <div class="detail-list__row"><span>实付金额</span><strong>¥{{ current.amounts.total }}</strong></div>
        </section>

        <div class="admin-row-actions">
          <BaseButton v-if="current.status === 'pending_review'" size="sm" @click="refreshCurrent(adminStore.confirmAdminOrderPayment)">确认支付</BaseButton>
          <BaseButton v-if="current.status === 'pending_review'" size="sm" variant="danger" @click="refreshCurrent(adminStore.rejectAdminOrderPayment)">驳回支付</BaseButton>
          <BaseButton v-if="current.status === 'pending_payment'" size="sm" variant="outline" @click="refreshCurrent(adminStore.expireAdminOrderPayment)">标记过期</BaseButton>
          <BaseButton v-if="current.status === 'paid'" size="sm" @click="updateStatus('completed')">确认完成</BaseButton>
          <BaseButton v-if="['pending_payment', 'paid'].includes(current.status)" size="sm" variant="danger" @click="updateStatus('cancelled')">取消订单</BaseButton>
        </div>
      </div>
      <EmptyState v-else title="未选择订单" />
    </BaseDrawer>
  </div>
</template>
