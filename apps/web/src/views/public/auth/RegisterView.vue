<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton, BaseCard, BaseInput } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')
const form = reactive({ username: '', nickname: '', email: '', phone: '', password: '', confirmPassword: '' })

function validate() {
  if (!form.username.trim()) return '用户名不能为空。'
  if (form.password.length < 6) return '密码至少需要 6 位。'
  if (form.password !== form.confirmPassword) return '两次输入的密码不一致。'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '邮箱格式不正确。'
  return ''
}

async function submit() {
  error.value = validate()
  if (error.value) return
  try {
    await authStore.register({
      username: form.username.trim(), nickname: form.nickname.trim(), email: form.email.trim(),
      phone: form.phone.trim(), password: form.password,
    })
    await authStore.login({ username: form.username.trim(), password: form.password })
    await router.replace('/')
  } catch (requestError) {
    error.value = requestError.message
  }
}
</script>

<template>
  <BaseCard class="auth-form-card" variant="elevated">
    <div class="cb-stack auth-form-card__intro">
      <span class="section-eyebrow">Join Coffee Book</span>
      <h2 class="page-title">创建你的账户</h2>
      <p class="text-muted">收藏阅读灵感，管理订单、预约和活动记录。</p>
    </div>
    <form class="auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.username" label="用户名" autocomplete="username" />
      <BaseInput v-model="form.nickname" label="昵称" autocomplete="nickname" />
      <BaseInput v-model="form.email" label="邮箱" type="email" autocomplete="email" />
      <BaseInput v-model="form.phone" label="手机号" type="tel" autocomplete="tel" />
      <BaseInput v-model="form.password" label="密码" password autocomplete="new-password" hint="至少 6 位" />
      <BaseInput v-model="form.confirmPassword" label="确认密码" password autocomplete="new-password" />
      <p v-if="error" class="auth-form__error" role="alert">{{ error }}</p>
      <BaseButton type="submit" size="lg" :loading="authStore.loading">注册并登录</BaseButton>
    </form>
    <p class="auth-form-card__footer">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
  </BaseCard>
</template>

<style scoped>
.auth-form-card { display: grid; gap: var(--cb-space-6); }
.auth-form-card__intro { gap: var(--cb-space-2); }
.auth-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cb-space-4); }
.auth-form > :first-child, .auth-form > :nth-child(5), .auth-form > :nth-child(6), .auth-form__error, .auth-form .base-button { grid-column: 1 / -1; }
.auth-form__error { padding: var(--cb-space-3) var(--cb-space-4); color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); border-radius: var(--cb-radius-lg); }
.auth-form-card__footer { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.auth-form-card__footer a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
@media (max-width: 35rem) { .auth-form { grid-template-columns: 1fr; } .auth-form > * { grid-column: 1 !important; } }
</style>
