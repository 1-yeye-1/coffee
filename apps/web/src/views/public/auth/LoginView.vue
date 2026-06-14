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
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || '/')
  } catch (requestError) {
    error.value = requestError.message
  }
}
</script>

<template>
  <BaseCard class="auth-form-card" variant="elevated">
    <div class="cb-stack auth-form-card__intro">
      <span class="section-eyebrow">Welcome Back</span>
      <h2 class="page-title">登录 Coffee Book</h2>
      <p class="text-muted">继续探索咖啡、阅读与城市文化生活。</p>
    </div>
    <form class="cb-stack auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.username" label="用户名" autocomplete="username" placeholder="请输入用户名" />
      <BaseInput v-model="form.password" label="密码" password autocomplete="current-password" placeholder="请输入密码" />
      <p v-if="error" class="auth-form__error" role="alert">{{ error }}</p>
      <BaseButton type="submit" size="lg" :loading="authStore.loading">登录</BaseButton>
    </form>
    <div class="auth-form-card__footer">
      <p>还没有账号？<RouterLink to="/register">立即注册</RouterLink></p>
    </div>
  </BaseCard>
</template>

<style scoped>
.auth-form-card { display: grid; gap: var(--cb-space-6); }
.auth-form-card__intro { gap: var(--cb-space-2); }
.auth-form { gap: var(--cb-space-4); }
.auth-form__error { padding: var(--cb-space-3) var(--cb-space-4); color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); border-radius: var(--cb-radius-lg); }
.auth-form-card__footer { display: grid; gap: var(--cb-space-2); padding-top: var(--cb-space-4); color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); border-top: 0.0625rem solid var(--cb-border-soft); }
.auth-form-card__footer a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
</style>
