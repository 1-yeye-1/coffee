<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import * as authApi from '@/api/auth'
import { BaseButton, BaseCard, BaseInput } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const form = reactive({ phone: '', password: '', code: '' })
const error = ref('')
const success = ref('')
const sending = ref(false)

function isPhone(value) {
  return /^1\d{10}$/.test(String(value || '').trim())
}

async function sendCode() {
  error.value = ''
  success.value = ''
  if (!isPhone(form.phone)) {
    error.value = '请输入 11 位手机号后再获取验证码。'
    return
  }
  sending.value = true
  try {
    const response = await authApi.sendCode({ phone: form.phone.trim(), scene: 'login' })
    success.value = response.data.devCode
      ? `验证码已发送，开发环境验证码：${response.data.devCode}`
      : '验证码已发送，请留意短信。'
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    sending.value = false
  }
}

async function submit() {
  error.value = ''
  success.value = ''
  if (!isPhone(form.phone)) {
    error.value = '请输入 11 位手机号。'
    return
  }
  if (!form.password && !form.code) {
    error.value = '请输入密码，或填写短信验证码登录。'
    return
  }
  try {
    await authStore.login({ phone: form.phone.trim(), password: form.password, code: form.code.trim() })
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
      <span class="section-eyebrow">欢迎回来</span>
      <h2 class="page-title">登录 Coffee Book</h2>
      <p class="text-muted">使用手机号登录，继续管理订单、预约、活动和社区互动记录。</p>
    </div>
    <form class="cb-stack auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.phone" label="手机号" type="tel" autocomplete="tel" placeholder="请输入手机号" />
      <BaseInput v-model="form.password" label="密码" password autocomplete="current-password" placeholder="请输入密码" />
      <div class="auth-code-row">
        <BaseInput v-model="form.code" label="短信验证码" inputmode="numeric" placeholder="手机号登录可填写验证码" />
        <BaseButton type="button" variant="outline" :loading="sending" @click="sendCode">获取验证码</BaseButton>
      </div>
      <p v-if="success" class="auth-form__success" role="status">{{ success }}</p>
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
.auth-code-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--cb-space-3); align-items: end; }
.auth-form__error,
.auth-form__success { padding: var(--cb-space-3) var(--cb-space-4); border-radius: var(--cb-radius-lg); }
.auth-form__error { color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); }
.auth-form__success { color: var(--cb-success); background: color-mix(in srgb, var(--cb-success) 10%, transparent); }
.auth-form-card__footer { display: grid; gap: var(--cb-space-2); padding-top: var(--cb-space-4); color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); border-top: 0.0625rem solid var(--cb-border-soft); }
.auth-form-card__footer a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
@media (max-width: 35rem) { .auth-code-row { grid-template-columns: 1fr; } }
</style>
