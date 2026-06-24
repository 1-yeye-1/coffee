<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { BaseBadge, BaseButton, BaseDrawer, BaseInput, BaseModal, BaseSelect, BaseTable, BaseTextarea } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const keyword = ref('')
const status = ref('all')
const level = ref('all')
const modalOpen = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const riskOpen = ref(false)
const saving = ref(false)
const editingId = ref(null)
const selectedIds = ref([])
const batchLoading = ref(false)
const userDetail = ref(null)
const form = reactive({ nickname: '', phone: '', email: '', level: '普通会员', points: 0, status: 'active' })
const riskForm = reactive({ type: 'disable', title: '', reason: '', pointsDelta: 0, target: null })

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' },
]
const levelOptions = ['普通会员', '银卡会员', '金卡会员', '黑金会员'].map((item) => ({ label: item, value: item }))
const columns = [
  { key: 'select', label: '' },
  { key: 'avatar', label: '头像' },
  { key: 'nickname', label: '昵称' },
  { key: 'phone', label: '手机号' },
  { key: 'email', label: '邮箱' },
  { key: 'level', label: '等级' },
  { key: 'growthValue', label: '成长值' },
  { key: 'points', label: '积分' },
  { key: 'lastCheckinDate', label: '最近签到' },
  { key: 'couponCount', label: '优惠券' },
  { key: 'orders', label: '订单' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const visible = computed(() => adminStore.users.filter((item) => {
  const text = `${item.username || ''}${item.nickname || ''}${item.phone || ''}${item.email || ''}`.toLowerCase()
  return (!keyword.value || text.includes(keyword.value.toLowerCase()))
    && (status.value === 'all' || item.status === status.value)
    && (level.value === 'all' || item.level === level.value)
}))

const stats = computed(() => [
  ['用户总数', adminStore.users.length],
  ['启用用户', adminStore.users.filter((item) => item.status === 'active').length],
  ['禁用用户', adminStore.users.filter((item) => item.status === 'disabled').length],
  ['会员用户', adminStore.users.filter((item) => item.level && item.level !== '普通会员').length],
  ['预约受限', adminStore.users.filter((item) => item.bookingRestricted || item.risk?.bookingRestricted).length],
  ['发帖受限', adminStore.users.filter((item) => item.postRestricted || item.risk?.postRestricted).length],
])

const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((item) => selectedIds.value.includes(item.id)))

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : visible.value.map((item) => item.id)
}

async function batchUserStatus(nextStatus) {
  const ids = [...selectedIds.value]
  if (!ids.length || batchLoading.value) return
  if (nextStatus === 'disabled' && !window.confirm(`确认批量禁用 ${ids.length} 个用户？`)) return
  batchLoading.value = true
  adminStore.apiError = ''
  let failed = 0
  try {
    for (const id of ids) {
      try { await adminStore.updateUser(id, { status: nextStatus }) }
      catch { failed += 1 }
    }
    selectedIds.value = []
    await adminStore.fetchAdminCollection('users')
    adminStore.apiError = failed ? `批量操作完成：成功 ${ids.length - failed} 项，失败 ${failed} 项` : `批量操作已完成：成功 ${ids.length} 项`
  } finally {
    batchLoading.value = false
  }
}

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  userDetail.value = item
  try {
    userDetail.value = await adminStore.fetchAdminDetail('users', item.id)
  } finally {
    detailLoading.value = false
  }
}

function edit(item) {
  editingId.value = item.id
  Object.assign(form, {
    nickname: item.nickname || '',
    phone: item.phone || '',
    email: item.email || '',
    level: item.level || '普通会员',
    points: item.points || 0,
    status: item.status || 'active',
  })
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    await adminStore.updateUser(editingId.value, { ...form, points: Number(form.points) || 0 })
    modalOpen.value = false
  } finally {
    saving.value = false
  }
}

function openRisk(item, type) {
  const titleMap = {
    disable: item.status === 'active' ? '禁用用户' : '解禁用户',
    booking: '限制预约',
    post: '限制发帖',
    points: '积分调整',
  }
  Object.assign(riskForm, { type, title: titleMap[type], reason: '', pointsDelta: 0, target: item })
  riskOpen.value = true
}

async function confirmRisk() {
  if (['disable', 'booking', 'post'].includes(riskForm.type) && !riskForm.reason.trim()) {
    adminStore.apiError = '处理原因必填'
    return
  }
  const user = riskForm.target
  if (!user) return
  if (riskForm.type === 'disable') {
    await adminStore.updateUserRisk(user.id, { status: user.status === 'active' ? 'disabled' : 'active', reason: riskForm.reason.trim() })
  } else if (riskForm.type === 'booking') {
    await adminStore.updateUserRisk(user.id, { bookingRestricted: !(user.bookingRestricted || user.risk?.bookingRestricted), reason: riskForm.reason.trim() })
  } else if (riskForm.type === 'post') {
    await adminStore.updateUserRisk(user.id, { postRestricted: !(user.postRestricted || user.risk?.postRestricted), reason: riskForm.reason.trim() })
  } else {
    await adminStore.updateUser(user.id, { points: Number(user.points || 0) + Number(riskForm.pointsDelta || 0) })
  }
  riskOpen.value = false
  if (userDetail.value?.id === user.id) await openDetail(user)
}

onMounted(() => adminStore.fetchAdminCollection('users'))
watch(visible, (list) => {
  const ids = new Set(list.map((item) => item.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Users</span>
        <h1>用户管理</h1>
        <p>维护用户资料、会员等级、积分、账号状态和风控限制。</p>
      </div>
    </header>

    <p v-if="adminStore.apiError" class="form-error">{{ adminStore.apiError }}</p>

    <section class="admin-stat-grid">
      <div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="keyword" search placeholder="搜索昵称、手机号或邮箱" />
      <BaseSelect v-model="status" aria-label="用户状态" :options="statusOptions" />
      <BaseSelect v-model="level" aria-label="会员等级" :options="[{ label: '全部等级', value: 'all' }, ...levelOptions]" />
    </section>

    <section class="admin-batch-bar">
      <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length || batchLoading" @change="toggleSelectAll" /> <span>全选当前页</span></label>
      <span class="admin-batch-bar__count">已选择 {{ selectedIds.length }} 项</span>
      <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchUserStatus('active')">批量启用</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchUserStatus('disabled')">批量禁用</BaseButton>
    </section>

    <BaseTable class="admin-users-table" :columns="columns" :items="visible" :loading="adminStore.apiLoading" empty-text="暂无匹配用户">
      <template #head-select><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!visible.length || batchLoading" aria-label="全选当前页" @change="toggleSelectAll" /></template>
      <template #cell-select="{ item }"><input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.id)" :aria-label="`选择 ${item.nickname || item.username || item.id}`" @change="toggleSelect(item.id)" /></template>
      <template #cell-avatar="{ item }"><span class="admin-user-avatar">{{ (item.nickname || item.username || '用').slice(0, 1) }}</span></template>
      <template #cell-nickname="{ item }"><button class="user-link" type="button" @click="openDetail(item)">{{ item.nickname || item.username || '-' }}</button></template>
      <template #cell-email="{ value }">{{ value || '-' }}</template>
      <template #cell-couponCount="{ value }">{{ value || 0 }} 张</template>
      <template #cell-level="{ value }"><BaseBadge variant="premium">{{ value || '普通会员' }}</BaseBadge></template>
      <template #cell-growthValue="{ value }">{{ Number(value || 0).toLocaleString('zh-CN') }}</template>
      <template #cell-lastCheckinDate="{ value }">{{ value || '未签到' }}</template>
      <template #cell-status="{ value }"><BaseBadge :variant="value === 'active' ? 'success' : 'neutral'">{{ value === 'active' ? '启用' : '禁用' }}</BaseBadge></template>
      <template #cell-actions="{ item }">
        <div class="admin-row-actions">
          <BaseButton size="sm" variant="ghost" @click="openDetail(item)">详情</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="edit(item)">编辑</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="openRisk(item, 'points')">积分</BaseButton>
          <BaseButton size="sm" variant="danger" @click="openRisk(item, 'disable')">{{ item.status === 'active' ? '禁用' : '解禁' }}</BaseButton>
        </div>
      </template>
    </BaseTable>

    <BaseDrawer v-model="detailOpen" title="用户 360 详情" @close="userDetail = null">
      <div v-if="detailLoading" class="user-detail">加载中...</div>
      <div v-else-if="userDetail" class="user-detail">
        <section>
          <BaseBadge :variant="userDetail.status === 'active' ? 'success' : 'neutral'">{{ userDetail.status === 'active' ? '启用' : '禁用' }}</BaseBadge>
          <h3>{{ userDetail.nickname || userDetail.username }}</h3>
          <p>{{ userDetail.phone || '-' }} · {{ userDetail.email || '-' }}</p>
        </section>
        <section class="user-metric-grid">
          <article><strong>{{ userDetail.ordersCount || userDetail.orderStats?.total || 0 }}</strong><span>订单</span></article>
          <article><strong>{{ userDetail.bookingsCount || userDetail.bookingStats?.total || 0 }}</strong><span>预约</span></article>
          <article><strong>{{ userDetail.eventsCount || userDetail.eventStats?.total || 0 }}</strong><span>活动</span></article>
          <article><strong>{{ userDetail.postsCount || userDetail.communityStats?.posts || 0 }}</strong><span>社区</span></article>
          <article><strong>{{ userDetail.points || 0 }}</strong><span>积分</span></article>
          <article><strong>{{ userDetail.couponCount || 0 }}</strong><span>优惠券</span></article>
        </section>
        <section class="detail-list">
          <div class="detail-list__row"><span>等级</span><strong>{{ userDetail.level || '普通会员' }}</strong></div>
          <div class="detail-list__row"><span>成长值</span><strong>{{ userDetail.growthValue || 0 }}</strong></div>
          <div class="detail-list__row"><span>最近签到</span><strong>{{ userDetail.lastCheckinDate || '未签到' }}</strong></div>
          <div class="detail-list__row"><span>注册时间</span><strong>{{ formatDate(userDetail.createdAt) }}</strong></div>
          <div class="detail-list__row"><span>预约限制</span><strong>{{ userDetail.bookingRestricted || userDetail.risk?.bookingRestricted ? '已限制' : '未限制' }}</strong></div>
          <div class="detail-list__row"><span>发帖限制</span><strong>{{ userDetail.postRestricted || userDetail.risk?.postRestricted ? '已限制' : '未限制' }}</strong></div>
        </section>
        <section>
          <h3>风控记录</h3>
          <article v-for="log in userDetail.riskLogs || []" :key="log.id" class="user-log"><strong>{{ log.action || log.type }}</strong><span>{{ log.reason || '-' }} · {{ formatDate(log.createdAt) }}</span></article>
          <p v-if="!userDetail.riskLogs?.length" class="text-muted">暂无风控记录</p>
        </section>
        <section>
          <h3>积分记录</h3>
          <article v-for="log in userDetail.pointLogs || []" :key="log.id" class="user-log"><strong>{{ log.changeAmount > 0 ? '+' : '' }}{{ log.changeAmount }}</strong><span>{{ log.reason || log.description || '-' }} · {{ formatDate(log.createdAt) }}</span></article>
          <p v-if="!userDetail.pointLogs?.length" class="text-muted">暂无积分记录</p>
        </section>
        <div class="admin-row-actions">
          <BaseButton size="sm" variant="outline" @click="openRisk(userDetail, 'booking')">{{ userDetail.bookingRestricted || userDetail.risk?.bookingRestricted ? '解除预约限制' : '限制预约' }}</BaseButton>
          <BaseButton size="sm" variant="outline" @click="openRisk(userDetail, 'post')">{{ userDetail.postRestricted || userDetail.risk?.postRestricted ? '解除发帖限制' : '限制发帖' }}</BaseButton>
          <BaseButton size="sm" variant="outline" @click="openRisk(userDetail, 'points')">调整积分</BaseButton>
          <BaseButton size="sm" variant="danger" @click="openRisk(userDetail, 'disable')">{{ userDetail.status === 'active' ? '禁用用户' : '解禁用户' }}</BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <BaseModal v-model="modalOpen" title="编辑用户">
      <form class="admin-form" @submit.prevent="save">
        <BaseInput v-model="form.nickname" label="昵称" />
        <BaseInput v-model="form.phone" label="手机号" />
        <BaseInput v-model="form.email" type="email" label="邮箱" />
        <BaseSelect v-model="form.level" label="会员等级" :options="levelOptions" />
        <BaseInput v-model="form.points" type="number" label="积分" />
        <BaseSelect v-model="form.status" label="账号状态" :options="statusOptions.filter((item) => item.value !== 'all')" />
        <div class="admin-actions"><BaseButton variant="ghost" type="button" @click="modalOpen = false">取消</BaseButton><BaseButton type="submit" :loading="saving">保存</BaseButton></div>
      </form>
    </BaseModal>

    <BaseModal v-model="riskOpen" :title="riskForm.title">
      <div class="admin-form">
        <p>处理对象：{{ riskForm.target?.nickname || riskForm.target?.username }}</p>
        <BaseInput v-if="riskForm.type === 'points'" v-model="riskForm.pointsDelta" type="number" label="积分变动值" />
        <BaseTextarea v-else v-model="riskForm.reason" label="处理原因" placeholder="原因必填" :rows="5" />
        <p v-if="riskForm.type !== 'points' && !riskForm.reason.trim()" class="form-error">原因必填。</p>
        <div class="admin-actions"><BaseButton variant="ghost" @click="riskOpen = false">取消</BaseButton><BaseButton :variant="riskForm.type === 'disable' ? 'danger' : 'primary'" @click="confirmRisk">确认处理</BaseButton></div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-users-table :deep(.base-table) {
  min-width: 94rem;
}

.admin-users-table :deep(th:last-child),
.admin-users-table :deep(td:last-child) {
  position: sticky;
  right: 0;
  z-index: 2;
  min-width: 8rem;
  background: var(--cb-bg-surface);
  box-shadow: -0.75rem 0 1.25rem rgb(42 24 16 / 0.08);
}

.user-link {
  padding: 0;
  color: var(--cb-color-coffee);
  font: inherit;
  font-weight: var(--cb-font-bold);
  background: transparent;
  border: 0;
}

.user-detail,
.user-detail section {
  display: grid;
  gap: var(--cb-space-4);
}

.user-metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.user-metric-grid article,
.user-log {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-3);
  border: 1px solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-soft);
}

.user-metric-grid span,
.user-log span {
  color: var(--cb-text-muted);
}
</style>
