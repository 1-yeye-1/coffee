<script setup>
import { computed, onMounted, ref } from 'vue'

import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseSelect, BaseTable, EmptyState } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const keyword = ref('')
const status = ref('')
const drawerOpen = ref(false)
const current = ref(null)
const statusOptions = [{ label: '全部状态', value: 'all' }, { label: '待支付', value: 'pending_payment' }, { label: '已支付', value: 'paid' }, { label: '已完成', value: 'completed' }, { label: '已取消', value: 'cancelled' }]
const columns = [{ key: 'id', label: '订单号' }, { key: 'user', label: '用户' }, { key: 'count', label: '商品数量' }, { key: 'amount', label: '金额' }, { key: 'status', label: '状态' }, { key: 'createdAt', label: '创建时间' }, { key: 'actions', label: '操作' }]
const statusText = { pending_payment: '待支付', paid: '已支付', completed: '已完成', cancelled: '已取消' }
const rows = computed(() => adminStore.orders.map((item) => ({ ...item, user: item.address?.recipient || item.receiverPhone || 'Coffee Reader', count: item.items.reduce((sum, product) => sum + product.quantity, 0), amount: item.amounts.total })))
const filtered = computed(() => rows.value.filter((item) => (!keyword.value || `${item.id}${item.user}`.toLowerCase().includes(keyword.value.toLowerCase())) && (!status.value || status.value === 'all' || item.status === status.value)))
const revenue = computed(() => adminStore.orders.filter((item) => ['paid','completed'].includes(item.status)).reduce((sum,item)=>sum+item.amounts.total,0))
const stats = computed(() => [
  ['订单总数', adminStore.orders.length], ['待支付', adminStore.orders.filter((item)=>item.status==='pending_payment').length],
  ['已支付', adminStore.orders.filter((item)=>item.status==='paid').length], ['已完成', adminStore.orders.filter((item)=>item.status==='completed').length],
  ['已取消', adminStore.orders.filter((item)=>item.status==='cancelled').length], ['总营收', `¥${revenue.value}`],
])
async function open(item){current.value=await adminStore.fetchAdminOrderDetail(item.id);drawerOpen.value=true}
async function updateStatus(status){ current.value=await adminStore.updateAdminOrderStatus(current.value.id,status) }
onMounted(() => adminStore.fetchAdminOrders())
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Commerce</span><h1>订单管理</h1><p>查看订单详情并维护支付和履约状态。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="keyword" search placeholder="搜索订单号或用户" /><BaseSelect v-model="status" aria-label="订单状态" :options="statusOptions" /></section>
    <BaseTable :columns="columns" :items="filtered" empty-text="暂无匹配订单">
      <template #cell-id="{ value }"><strong>{{ value }}</strong></template><template #cell-amount="{ value }">¥{{ value }}</template>
      <template #cell-status="{ value }"><BaseBadge :variant="value === 'completed' ? 'success' : value === 'paid' ? 'info' : value === 'cancelled' ? 'neutral' : 'warning'">{{ statusText[value] }}</BaseBadge></template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-actions="{ item }"><BaseButton size="sm" variant="outline" @click="open(item)">查看详情</BaseButton></template>
    </BaseTable>
    <BaseDrawer v-model="drawerOpen" title="订单详情">
      <div v-if="current" class="admin-form">
        <div><BaseBadge :variant="current.status === 'completed' ? 'success' : current.status === 'paid' ? 'info' : current.status === 'cancelled' ? 'neutral' : 'warning'">{{ statusText[current.status] }}</BaseBadge><h3>{{ current.id }}</h3><p>{{ new Date(current.createdAt).toLocaleString('zh-CN') }}</p></div>
        <section><h3>商品清单</h3><div class="admin-ranking"><div v-for="item in current.items" :key="item.id" class="admin-ranking__item"><span>{{ item.name }} × {{ item.quantity }}</span><strong>¥{{ item.lineTotal || item.price * item.quantity }}</strong></div></div></section>
        <section class="detail-list"><div class="detail-list__row"><span>配送方式</span><strong>{{ current.deliveryType === 'pickup' ? '到店自取' : '快递配送' }}</strong></div><div class="detail-list__row"><span>支付方式</span><strong>{{ current.paymentMethod }}</strong></div><div class="detail-list__row"><span>商品总价</span><strong>¥{{ current.amounts.subtotal }}</strong></div><div class="detail-list__row"><span>实付金额</span><strong>¥{{ current.amounts.total }}</strong></div></section>
        <div class="admin-row-actions"><BaseButton v-if="current.status === 'pending_payment'" size="sm" @click="updateStatus('paid')">标记已支付</BaseButton><BaseButton v-if="current.status === 'paid'" size="sm" @click="updateStatus('completed')">确认完成</BaseButton><BaseButton v-if="['pending_payment','paid'].includes(current.status)" size="sm" variant="danger" @click="updateStatus('cancelled')">取消订单</BaseButton></div>
      </div>
      <EmptyState v-else title="未选择订单" />
    </BaseDrawer>
  </div>
</template>
