<script setup>
import { onMounted, reactive, ref } from 'vue'

import { getAccountOverview, getAvatarHistory, reuseAvatar, selectPresetAvatar, updatePrivacy, updateProfile } from '@/api/account'
import { resolveUploadUrl, uploadAvatar } from '@/api/upload'
import { BaseBadge, BaseButton, BaseInput, BaseToast, ErrorPanel } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import '@/assets/styles/pages/engagement.css'

const authStore = useAuthStore()
const form = reactive({ nickname: '', phone: '', email: '', profilePublic: true })
const user = ref(null)
const toastVisible = ref(false)
const toastTitle = ref('保存成功')
const toastMessage = ref('个人资料已同步到数据库。')
const loading = ref(false)
const avatarUploading = ref(false)
const privacySaving = ref(false)
const error = ref('')
const avatarPreview = ref('')
const avatarFile = ref(null)
const avatarInput = ref(null)
const avatarHistory = ref([])
const presetAvatars = ['#6f4e37', '#a66a3f', '#486b57'].map((color, index) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="36" fill="${color}"/><text x="80" y="102" text-anchor="middle" font-size="72" fill="white">${index + 1}</text></svg>`)}`)

async function load() {
  loading.value = true
  error.value = ''
  try {
    user.value = (await getAccountOverview()).data.user
    avatarHistory.value = (await getAvatarHistory()).data
    Object.assign(form, {
      nickname: user.value.nickname || '',
      phone: user.value.phoneMasked || user.value.phone || '',
      email: user.value.email || '',
      profilePublic: user.value.profilePublic !== false,
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function syncUser(nextUser) {
  user.value = nextUser
  authStore.user = { ...authStore.user, ...nextUser }
  authStore.persist()
}

async function save() {
  error.value = ''
  try {
    syncUser((await updateProfile({ nickname: form.nickname, email: form.email })).data)
    toastTitle.value = '保存成功'
    toastMessage.value = '个人资料已同步到数据库。'
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  }
}

async function savePrivacy() {
  privacySaving.value = true
  error.value = ''
  try {
    syncUser((await updatePrivacy({ profilePublic: form.profilePublic })).data)
    toastTitle.value = '隐私设置已保存'
    toastMessage.value = form.profilePublic
      ? '其他用户现在可以查看你的公开个人主页。'
      : '你的个人主页已关闭对其他用户的访问。'
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    privacySaving.value = false
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
    const avatar = (await uploadAvatar(avatarFile.value)).data.url
    syncUser({ ...user.value, avatar })
    avatarHistory.value = (await getAvatarHistory()).data
    avatarPreview.value = ''
    avatarFile.value = null
    if (avatarInput.value) avatarInput.value.value = ''
    toastTitle.value = '头像已更新'
    toastMessage.value = '新的头像已保存。'
    toastVisible.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    avatarUploading.value = false
  }
}

async function chooseAvatar(avatarUrl) {
  avatarHistory.value = (await selectPresetAvatar(avatarUrl)).data
  syncUser({ ...user.value, avatar: avatarUrl })
}

async function chooseHistory(item) {
  avatarHistory.value = (await reuseAvatar(item.id)).data
  syncUser({ ...user.value, avatar: item.avatarUrl })
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Profile</span>
      <h2 class="page-title">个人资料</h2>
      <p class="page-subtitle">管理你的昵称、头像和个人主页可见性。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <section v-if="user" class="member-panel profile-card">
      <img
        v-if="avatarPreview || user.avatar"
        class="profile-avatar"
          :src="avatarPreview || resolveUploadUrl(user.avatar)"
          alt="用户头像"
          decoding="async"
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

    <section class="member-panel avatar-manager">
      <h3 class="section-title">系统头像</h3>
      <div class="avatar-list"><button v-for="avatar in presetAvatars" :key="avatar" type="button" @click="chooseAvatar(avatar)"><img :src="avatar" alt="系统头像" loading="lazy" decoding="async" /></button></div>
      <h3 class="section-title">历史头像</h3>
      <div class="avatar-list"><button v-for="item in avatarHistory" :key="item.id" type="button" :class="{ 'is-current': item.isCurrent }" @click="chooseHistory(item)"><img :src="resolveUploadUrl(item.avatarUrl)" alt="历史头像" loading="lazy" decoding="async" /><small v-if="item.isCurrent">当前</small></button></div>
    </section>

    <section class="member-panel privacy-panel">
      <div>
        <h3 class="section-title">个人主页可见性</h3>
        <p class="text-muted">关闭后，其他用户点击你的头像或昵称时会看到隐私保护提示。</p>
      </div>
      <label class="privacy-toggle">
        <input v-model="form.profilePublic" type="checkbox" />
        <span>允许其他用户查看我的个人主页</span>
      </label>
      <BaseButton :loading="privacySaving" variant="outline" @click="savePrivacy">保存隐私设置</BaseButton>
    </section>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.profile-card { align-items: center; }
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
.avatar-input { display: none; }
.avatar-manager { display:grid; gap:var(--cb-space-4); }
.avatar-list { display:flex; flex-wrap:wrap; gap:var(--cb-space-3); }
.avatar-list button { position:relative; padding:.2rem; background:transparent; border:.125rem solid transparent; border-radius:var(--cb-radius-lg); }
.avatar-list button.is-current { border-color:var(--cb-color-coffee); }
.avatar-list img { display:block; width:4rem; height:4rem; object-fit:cover; border-radius:var(--cb-radius-md); }
.avatar-list small { position:absolute; right:.2rem; bottom:.2rem; padding:.1rem .25rem; color:white; background:var(--cb-color-coffee); border-radius:.25rem; }
.privacy-panel {
  display: grid;
  gap: var(--cb-space-4);
}
.privacy-toggle {
  display: flex;
  gap: var(--cb-space-3);
  align-items: center;
  color: var(--cb-text-primary);
  font-weight: var(--cb-font-semibold);
}
.privacy-toggle input {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: var(--cb-color-coffee);
}
@media (max-width: 42rem) {
  .avatar-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
