<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseButton, BaseCard, BaseInput } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const form = reactive({ username: '', password: '' })
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = '请输入用户名和密码。'
    return
  }
  try {
    const user = await authStore.login(form)
    if (user.role !== 'admin') {
      await router.replace('/403')
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || '/dashboard')
  } catch (requestError) {
    error.value = requestError.message
  }
}
</script>

<template>
  <BaseCard class="auth-form-card" variant="elevated">
    <div class="cb-stack auth-form-card__intro">
      <span class="section-eyebrow">后台管理</span>
      <h2 class="page-title">Coffee Book 后台登录</h2>
      <p class="text-muted">请使用管理员账号进入运营工作台。</p>
    </div>
    <form class="cb-stack auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.username" label="用户名" autocomplete="username" placeholder="请输入管理员用户名" />
      <BaseInput v-model="form.password" label="密码" password autocomplete="current-password" placeholder="请输入密码" />
      <p v-if="error" class="auth-form__error" role="alert">{{ error }}</p>
      <BaseButton type="submit" size="lg" :loading="authStore.loading">登录后台</BaseButton>
    </form>
    <div class="auth-form-card__footer">
      <p>管理员测试账号：<strong>admin / admin123456</strong></p>
    </div>
  </BaseCard>
</template>

<style scoped>
.auth-form-card { display: grid; gap: var(--cb-space-6); }
.auth-form-card__intro { gap: var(--cb-space-2); }
.auth-form { gap: var(--cb-space-4); }
.auth-form__error { padding: var(--cb-space-3) var(--cb-space-4); color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); border-radius: var(--cb-radius-lg); }
.auth-form-card__footer { display: grid; gap: var(--cb-space-2); padding-top: var(--cb-space-4); color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); border-top: 0.0625rem solid var(--cb-border-soft); }
</style>
