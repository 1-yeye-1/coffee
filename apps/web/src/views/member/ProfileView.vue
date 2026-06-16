<script setup>
import { onMounted, reactive, ref } from 'vue'

import { getAccountOverview, updateProfile } from '@/api/account'
import { resolveUploadUrl, uploadAvatar } from '@/api/upload'
import { BaseBadge, BaseButton, BaseInput, BaseToast } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import '@/assets/styles/pages/engagement.css'

const authStore = useAuthStore()
const form = reactive({ nickname: '', phone: '', email: '' })
const user = ref(null)
const toastVisible = ref(false)
const loading = ref(false)
const avatarUploading = ref(false)
const error = ref('')
const avatarPreview = ref('')
const avatarFile = ref(null)
const avatarInput = ref(null)

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

function validateAvatar(file) {
  if (!file) return '请选择头像图片。'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return '头像仅支持 jpg、jpeg、png、webp 格式。'
  if (file.size > 2 * 1024 * 1024) return '头像文件不能超过 2MB。'
  return ''
}

function selectAvatar(event) {
  const file = event.target.files?.[0]
  const message = validateAvatar(file)
  if (message) {
    error.value = message
    avatarFile.value = null
    avatarPreview.value = ''
    return
  }
  error.value = ''
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

async function submitAvatar() {
  const message = validateAvatar(avatarFile.value)
  if (message) {
    error.value = message
    return
  }
  avatarUploading.value = true
  error.value = ''
  try {
    const response = await uploadAvatar(avatarFile.value)
    const avatar = response.data.url
    user.value = { ...user.value, avatar }
    authStore.user = { ...authStore.user, avatar }
    authStore.persist()
    avatarPreview.value = ''
    avatarFile.value = null
    if (avatarInput.value) avatarInput.value.value = ''
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    avatarUploading.value = false
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
      <img
        v-if="avatarPreview || user.avatar"
        class="profile-avatar"
        :src="avatarPreview || resolveUploadUrl(user.avatar)"
        alt="用户头像"
      />
      <span v-else class="avatar">{{ (user.nickname || user.username || '用').slice(0, 1) }}</span>
      <div>
        <h3>{{ user.nickname }}</h3>
        <BaseBadge variant="premium">{{ user.level }}</BaseBadge>
        <p>{{ user.points }} 积分</p>
      </div>
      <div class="avatar-actions">
        <input ref="avatarInput" class="avatar-input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" @change="selectAvatar" />
        <BaseButton size="sm" variant="outline" type="button" @click="avatarInput?.click()">选择头像</BaseButton>
        <BaseButton size="sm" :loading="avatarUploading" :disabled="!avatarFile" type="button" @click="submitAvatar">上传头像</BaseButton>
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

<style scoped>
.profile-card {
  align-items: center;
}

.profile-avatar {
  width: 4.5rem;
  height: 4.5rem;
  flex: 0 0 auto;
  object-fit: cover;
  border: 0.1875rem solid color-mix(in srgb, var(--cb-color-gold) 34%, var(--cb-bg-surface));
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-sm);
}

.avatar-actions {
  display: flex;
  margin-left: auto;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
}

.avatar-input {
  display: none;
}

@media (max-width: 42rem) {
  .avatar-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
