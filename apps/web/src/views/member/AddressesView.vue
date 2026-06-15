<script setup>
import { onMounted, reactive, ref } from 'vue'

import { createAddress, getAddresses, updateAddress } from '@/api/account'
import { BaseBadge, BaseButton, BaseInput, BaseTable } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const addresses = ref([])
const error = ref('')
const saving = ref(false)
const form = reactive({ id: null, recipient: '', phone: '', region: '', detail: '', isDefault: false })
const columns = [
  { key: 'recipient', label: '收件人' },
  { key: 'phone', label: '手机号' },
  { key: 'region', label: '地区' },
  { key: 'detail', label: '详细地址' },
  { key: 'isDefault', label: '默认' },
  { key: 'actions', label: '操作' },
]

function reset() {
  Object.assign(form, { id: null, recipient: '', phone: '', region: '', detail: '', isDefault: false })
}

async function load() {
  addresses.value = (await getAddresses()).data
}

function edit(item) {
  Object.assign(form, item)
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    addresses.value = form.id
      ? (await updateAddress(form.id, form)).data
      : (await createAddress(form)).data
    reset()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Address</span>
      <h2 class="page-title">地址管理</h2>
      <p class="page-subtitle">收货地址保存到数据库，仅当前用户可见。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="member-panel create-form">
      <h3 class="section-title">{{ form.id ? '编辑地址' : '新增地址' }}</h3>
      <div class="form-grid">
        <BaseInput v-model="form.recipient" label="收件人" />
        <BaseInput v-model="form.phone" label="手机号" />
        <BaseInput v-model="form.region" label="地区" placeholder="例如：上海市 徐汇区" />
        <BaseInput v-model="form.detail" label="详细地址" />
      </div>
      <label class="checkbox-line">
        <input v-model="form.isDefault" type="checkbox">
        <span>设为默认地址</span>
      </label>
      <div class="cb-cluster">
        <BaseButton variant="ghost" type="button" @click="reset">清空</BaseButton>
        <BaseButton :loading="saving" @click="save">保存地址</BaseButton>
      </div>
    </section>

    <BaseTable :columns="columns" :items="addresses" empty-text="暂无地址">
      <template #cell-isDefault="{ value }">
        <BaseBadge :variant="value ? 'success' : 'neutral'">{{ value ? '默认' : '否' }}</BaseBadge>
      </template>
      <template #cell-actions="{ item }">
        <BaseButton size="sm" variant="ghost" @click="edit(item)">编辑</BaseButton>
      </template>
    </BaseTable>
  </div>
</template>
