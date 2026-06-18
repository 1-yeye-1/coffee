<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import * as authApi from '@/api/auth'
import { BaseButton, BaseCard, BaseInput } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')
const success = ref('')
const sending = ref(false)
const countdown = ref(0)
let countdownTimer = null
const form = reactive({
  nickname: '',
  phone: '',
  code: '',
  password: '',
  confirmPassword: '',
  agreed: false,
})

function isPhone(value) {
  return /^1\d{10}$/.test(String(value || '').trim())
}

function startCountdown(seconds = 60) {
  countdown.value = seconds
  window.clearInterval(countdownTimer)
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(countdownTimer)
  }, 1000)
}

function validate() {
  if (!isPhone(form.phone)) return '请输入 11 位手机号。'
  if (!form.code.trim()) return '请输入短信验证码。'
  if (form.password.length < 6) return '密码至少需要 6 位。'
  if (form.password !== form.confirmPassword) return '两次输入的密码不一致。'
  if (!form.agreed) return '请先阅读并同意服务条款和隐私政策。'
  return ''
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
    const response = await authApi.sendCode({ phone: form.phone.trim(), scene: 'register' })
    startCountdown(response.data.cooldown || 60)
    success.value = '验证码已发送，请查看短信或联系开发环境控制台日志。'
  } catch (requestError) {
    error.value = requestError.message || '验证码发送失败，请稍后重试。'
  } finally {
    sending.value = false
  }
}

async function submit() {
  error.value = validate()
  success.value = ''
  if (error.value) return
  try {
    await authStore.register({
      nickname: form.nickname.trim(),
      phone: form.phone.trim(),
      code: form.code.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    })
    await router.replace('/')
  } catch (requestError) {
    error.value = requestError.message || '注册失败，请稍后重试。'
  }
}

onBeforeUnmount(() => window.clearInterval(countdownTimer))
</script>

<template>
  <BaseCard class="auth-form-card" variant="elevated">
    <div class="cb-stack auth-form-card__intro">
      <span class="section-eyebrow">加入 Coffee Book</span>
      <h2 class="page-title">创建你的账号</h2>
      <p class="text-muted">用手机号注册，保存订单、预约、活动和社区互动记录。</p>
    </div>
    <form class="auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.nickname" label="昵称" autocomplete="nickname" placeholder="可选，默认使用手机号后四位" />
      <BaseInput v-model="form.phone" label="手机号" type="tel" autocomplete="tel" placeholder="请输入 11 位手机号" />
      <div class="auth-code-row">
        <BaseInput v-model="form.code" label="短信验证码" inputmode="numeric" placeholder="请输入验证码" />
        <BaseButton type="button" variant="outline" :loading="sending" :disabled="countdown > 0" @click="sendCode">
          {{ countdown > 0 ? `${countdown} 秒后重试` : '获取验证码' }}
        </BaseButton>
      </div>
      <BaseInput v-model="form.password" label="密码" password autocomplete="new-password" hint="至少 6 位" />
      <BaseInput v-model="form.confirmPassword" label="确认密码" password autocomplete="new-password" />
      <label class="auth-agreement">
        <input v-model="form.agreed" type="checkbox" />
        <span>
          我已阅读并同意
          <RouterLink to="/terms" target="_blank">《服务条款》</RouterLink>
          和
          <RouterLink to="/privacy" target="_blank">《隐私政策》</RouterLink>
        </span>
      </label>
      <p v-if="success" class="auth-form__success" role="status">{{ success }}</p>
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
.auth-code-row,
.auth-form > :first-child,
.auth-agreement,
.auth-form__error,
.auth-form__success,
.auth-form .base-button[type="submit"] { grid-column: 1 / -1; }
.auth-code-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--cb-space-3); align-items: end; }
.auth-agreement { display: flex; gap: var(--cb-space-2); align-items: flex-start; color: var(--cb-text-secondary); font-size: var(--cb-font-size-sm); line-height: var(--cb-line-relaxed); }
.auth-agreement input { margin-top: 0.3rem; accent-color: var(--cb-color-coffee); }
.auth-agreement a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
.auth-form__error,
.auth-form__success { padding: var(--cb-space-3) var(--cb-space-4); border-radius: var(--cb-radius-lg); }
.auth-form__error { color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); }
.auth-form__success { color: var(--cb-success); background: color-mix(in srgb, var(--cb-success) 10%, transparent); }
.auth-form-card__footer { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.auth-form-card__footer a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
@media (max-width: 35rem) {
  .auth-form,
  .auth-code-row { grid-template-columns: 1fr; }
  .auth-form > * { grid-column: 1 !important; }
}
</style>
