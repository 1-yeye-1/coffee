<script setup>
import { onMounted, reactive, ref } from 'vue'

import { getAccountOverview, updateProfile } from '@/api/account'
import { BaseBadge, BaseButton, BaseInput, BaseToast } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import '@/assets/styles/pages/engagement.css'

const authStore = useAuthStore()
const form = reactive({ nickname: '', phone: '', email: '' })
const user = ref(null)
const toastVisible = ref(false)
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    user.value = (await getAccountOverview()).data.user
    Object.assign(form, {
      nickname: user.value.nickname || '',
      phone: user.value.phone || '',
      email: user.value.email || '',
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function save() {
  error.value = ''
  try {
    user.value = (await updateProfile({ nickname: form.nickname, email: form.email })).data
    authStore.user = { ...authStore.user, ...user.value }
    authStore.persist()
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Profile</span>
      <h2 class="page-title">个人资料</h2>
      <p class="page-subtitle">个人资料会同步保存到数据库。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <section v-if="user" class="member-panel profile-card">
      <span class="avatar">{{ (user.nickname || user.username || '用').slice(0, 1) }}</span>
      <div>
        <h3>{{ user.nickname }}</h3>
        <BaseBadge variant="premium">{{ user.level }}</BaseBadge>
        <p>{{ user.points }} 积分</p>
      </div>
    </section>

    <section class="member-panel create-form">
      <h3 class="section-title">基础信息</h3>
      <div class="form-grid">
        <BaseInput v-model="form.nickname" label="昵称" />
        <BaseInput v-model="form.phone" label="手机号" disabled />
        <BaseInput v-model="form.email" type="email" label="邮箱" />
      </div>
      <BaseButton :loading="loading" @click="save">保存资料</BaseButton>
    </section>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" title="保存成功">个人资料已同步到数据库。</BaseToast>
    </div>
  </div>
</template>
