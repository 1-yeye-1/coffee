<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const keyword = ref('')
const status = ref('all')
const level = ref('all')
const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = reactive({ nickname: '', phone: '', email: '', level: '普通会员', points: 0, status: 'active' })

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' },
]
const levelOptions = ['普通会员', '银卡会员', '金卡会员', '黑金会员'].map((item) => ({ label: item, value: item }))
const columns = [
  { key: 'avatar', label: '头像' },
  { key: 'nickname', label: '昵称' },
  { key: 'phone', label: '手机号' },
  { key: 'email', label: '邮箱' },
  { key: 'level', label: '等级' },
  { key: 'points', label: '积分' },
  { key: 'birthday', label: '生日' },
  { key: 'couponCount', label: '优惠券' },
  { key: 'orders', label: '订单' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const visible = computed(() => adminStore.users.filter((item) => {
  const text = `${item.username || ''}${item.nickname || ''}${item.phone || ''}${item.email || ''}`.toLowerCase()
  const keywordMatched = !keyword.value || text.includes(keyword.value.toLowerCase())
  const statusMatched = status.value === 'all' || item.status === status.value
  const levelMatched = level.value === 'all' || item.level === level.value
  return keywordMatched && statusMatched && levelMatched
}))

const stats = computed(() => [
  ['用户总数', adminStore.users.length],
  ['启用用户', adminStore.users.filter((item) => item.status === 'active').length],
  ['禁用用户', adminStore.users.filter((item) => item.status === 'disabled').length],
  ['会员用户', adminStore.users.filter((item) => item.level !== '普通会员').length],
])

onMounted(() => {
  adminStore.fetchAdminCollection('users')
})

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

async function toggle(item) {
  await adminStore.updateUser(item.id, { status: item.status === 'active' ? 'disabled' : 'active' })
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Users</span>
        <h1>用户管理</h1>
        <p>维护普通用户资料、会员等级、积分和账号状态；管理员账号已独立存放在后台账号表。</p>
      </div>
    </header>

    <section class="admin-stat-grid">
      <div v-for="item in stats" :key="item[0]" class="admin-stat">
        <span>{{ item[0] }}</span>
        <strong>{{ item[1] }}</strong>
      </div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="keyword" search placeholder="搜索昵称、手机号或邮箱" />
      <BaseSelect v-model="status" aria-label="用户状态" :options="statusOptions" />
      <BaseSelect
        v-model="level"
        aria-label="会员等级"
        :options="[{ label: '全部等级', value: 'all' }, ...levelOptions]"
      />
    </section>

    <BaseTable
      :columns="columns"
      :items="visible"
      :loading="adminStore.apiLoading"
      empty-text="暂无匹配用户"
    >
      <template #cell-avatar="{ item }">
        <span class="admin-user-avatar">{{ (item.nickname || item.username || '用').slice(0, 1) }}</span>
      </template>
      <template #cell-email="{ value }">{{ value || '-' }}</template>
      <template #cell-birthday="{ value }">{{ value || '未设置' }}</template>
      <template #cell-couponCount="{ value }">{{ value || 0 }} 张</template>
      <template #cell-level="{ value }"><BaseBadge variant="premium">{{ value }}</BaseBadge></template>
      <template #cell-status="{ value }">
        <BaseBadge :variant="value === 'active' ? 'success' : 'neutral'">
          {{ value === 'active' ? '启用' : '禁用' }}
        </BaseBadge>
      </template>
      <template #cell-actions="{ item }">
        <div class="admin-row-actions">
          <BaseButton size="sm" variant="ghost" @click="edit(item)">编辑</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="toggle(item)">
            {{ item.status === 'active' ? '禁用' : '启用' }}
          </BaseButton>
        </div>
      </template>
    </BaseTable>

    <p v-if="adminStore.apiError" class="form-error">{{ adminStore.apiError }}</p>

    <BaseModal v-model="modalOpen" title="编辑用户">
      <form class="admin-form" @submit.prevent="save">
        <BaseInput v-model="form.nickname" label="昵称" />
        <BaseInput v-model="form.phone" label="手机号" />
        <BaseInput v-model="form.email" type="email" label="邮箱" />
        <BaseSelect v-model="form.level" label="会员等级" :options="levelOptions" />
        <BaseInput v-model="form.points" type="number" label="积分" />
        <BaseSelect v-model="form.status" label="账号状态" :options="statusOptions.filter((item) => item.value !== 'all')" />
        <div class="admin-actions">
          <BaseButton variant="ghost" type="button" @click="modalOpen = false">取消</BaseButton>
          <BaseButton type="submit" :loading="saving">保存</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
