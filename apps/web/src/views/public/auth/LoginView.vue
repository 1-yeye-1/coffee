<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import * as authApi from '@/api/auth'
import { BaseButton, BaseCard, BaseInput } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const mode = ref('sms')
const form = reactive({ phone: '', password: '', smsCode: '', captchaId: '', captchaCode: '' })
const error = ref('')
const success = ref('')
const sending = ref(false)
const countdown = ref(0)
const captchaImage = ref('')
const captchaLoading = ref(false)
let countdownTimer = null

const canSendSms = computed(() => countdown.value <= 0 && !sending.value && Boolean(form.captchaId && form.captchaCode.trim()))

function isPhone(value) { return /^1\d{10}$/.test(String(value || '').trim()) }
function clearFeedback() { error.value = ''; success.value = '' }
function startCountdown(seconds = 60) {
  countdown.value = seconds
  window.clearInterval(countdownTimer)
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(countdownTimer)
  }, 1000)
}
async function refreshCaptcha() {
  captchaLoading.value = true
  try {
    const response = await authApi.getCaptcha()
    form.captchaId = response.data.captchaId
    captchaImage.value = response.data.image
    form.captchaCode = ''
  } catch (requestError) {
    error.value = requestError.message || '图形验证码加载失败。'
  } finally {
    captchaLoading.value = false
  }
}
function assertCaptchaInput() {
  if (!form.captchaId || !form.captchaCode.trim()) throw new Error('请输入图形验证码。')
}
function shouldRefreshCaptcha(message = '') {
  return /图形验证码|验证码.*(无效|过期|错误|失效)|captcha/i.test(String(message))
}
async function sendSmsCode() {
  clearFeedback()
  if (!isPhone(form.phone)) { error.value = '请输入 11 位手机号后再获取验证码。'; return }
  try { assertCaptchaInput() } catch (requestError) { error.value = requestError.message; return }
  sending.value = true
  try {
    const response = await authApi.sendSmsCode({ phone: form.phone.trim(), scene: 'login', captchaId: form.captchaId, captchaCode: form.captchaCode.trim() })
    startCountdown(response.data.cooldown || 60)
    success.value = '验证码已发送，请查看短信或开发环境控制台日志。'
  } catch (requestError) {
    error.value = requestError.message || '验证码发送失败，请刷新图形验证码后重试。'
    if (shouldRefreshCaptcha(error.value)) await refreshCaptcha()
  } finally {
    sending.value = false
  }
}
async function finishLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  await router.replace(redirect || '/')
}
async function loginBySms() {
  clearFeedback()
  if (!isPhone(form.phone)) { error.value = '请输入 11 位手机号。'; return }
  if (!form.smsCode.trim()) { error.value = '请输入短信验证码。'; return }
  try {
    await authStore.loginBySms({ phone: form.phone.trim(), code: form.smsCode.trim() })
    await finishLogin()
  } catch (requestError) {
    error.value = requestError.message || '短信登录失败，请检查验证码。'
  }
}
async function loginByPassword() {
  clearFeedback()
  if (!isPhone(form.phone)) { error.value = '请输入 11 位手机号。'; return }
  if (!form.password) { error.value = '请输入密码。'; return }
  try {
    assertCaptchaInput()
    await authStore.loginByPassword({ phone: form.phone.trim(), password: form.password, captchaId: form.captchaId, captchaCode: form.captchaCode.trim() })
    await finishLogin()
  } catch (requestError) {
    error.value = requestError.message || '密码登录失败，请检查手机号、密码或验证码。'
    if (shouldRefreshCaptcha(error.value)) await refreshCaptcha()
  }
}
function submit() { return mode.value === 'sms' ? loginBySms() : loginByPassword() }
async function switchMode(value) {
  if (mode.value === value) return
  mode.value = value
  clearFeedback()
  form.captchaCode = ''
  form.captchaId = ''
  captchaImage.value = ''
  await refreshCaptcha()
}

onMounted(refreshCaptcha)
onBeforeUnmount(() => window.clearInterval(countdownTimer))
</script>

<template>
  <BaseCard class="auth-form-card" variant="elevated">
    <div class="cb-stack auth-form-card__intro">
      <span class="section-eyebrow">Welcome Back</span>
      <h2 class="page-title">登录 Coffee Book</h2>
      <p class="text-muted">请选择短信验证码登录或手机号密码登录。</p>
    </div>

    <div class="auth-mode-tabs" role="tablist" aria-label="登录方式">
      <button type="button" :class="{ 'is-active': mode === 'sms' }" @click="switchMode('sms')">验证码登录</button>
      <button type="button" :class="{ 'is-active': mode === 'password' }" @click="switchMode('password')">密码登录</button>
    </div>

    <form class="cb-stack auth-form" @submit.prevent="submit">
      <BaseInput v-model="form.phone" label="手机号" type="tel" autocomplete="tel" placeholder="请输入手机号" />
      <BaseInput v-if="mode === 'password'" v-model="form.password" label="密码" password autocomplete="current-password" placeholder="请输入密码" />

      <div class="auth-code-row">
        <BaseInput v-model="form.captchaCode" label="图形验证码" :maxlength="5" autocomplete="off" placeholder="请输入图形验证码" />
        <button class="captcha-image" type="button" :disabled="captchaLoading" aria-label="刷新图形验证码" @click="refreshCaptcha">
          <img v-if="captchaImage" :src="captchaImage" alt="图形验证码" />
          <span v-else>刷新验证码</span>
        </button>
      </div>

      <template v-if="mode === 'sms'">
        <div class="auth-code-row">
          <BaseInput v-model="form.smsCode" label="短信验证码" inputmode="numeric" autocomplete="one-time-code" placeholder="请输入短信验证码" />
          <BaseButton type="button" variant="outline" :loading="sending" :disabled="!canSendSms" @click="sendSmsCode">
            {{ countdown > 0 ? `${countdown} 秒后重试` : '获取验证码' }}
          </BaseButton>
        </div>
      </template>

      <p v-if="success" class="auth-form__success" role="status">{{ success }}</p>
      <p v-if="error" class="auth-form__error" role="alert">{{ error }}</p>
      <BaseButton type="submit" size="lg" :loading="authStore.loading">{{ mode === 'sms' ? '验证码登录' : '密码登录' }}</BaseButton>
    </form>

    <div class="auth-form-card__footer">
      <p>还没有账号？<RouterLink to="/register">立即注册</RouterLink></p>
      <p class="auth-policy-links">登录即表示你了解 Coffee Book 的 <RouterLink to="/terms">服务条款</RouterLink> 和 <RouterLink to="/privacy">隐私政策</RouterLink></p>
    </div>
  </BaseCard>
</template>

<style scoped>
.auth-form-card { display: grid; gap: var(--cb-space-6); }
.auth-form-card__intro { gap: var(--cb-space-2); }
.auth-form { gap: var(--cb-space-4); }
.auth-mode-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cb-space-2); padding: var(--cb-space-1); background: var(--cb-bg-soft); border-radius: var(--cb-radius-pill); }
.auth-mode-tabs button { min-height: 2.5rem; color: var(--cb-text-secondary); background: transparent; border: 0; border-radius: var(--cb-radius-pill); }
.auth-mode-tabs button.is-active { color: var(--cb-color-coffee); background: var(--cb-bg-surface); box-shadow: var(--cb-shadow-sm); }
.auth-code-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--cb-space-3); align-items: end; }
.captcha-image { width: 9.375rem; height: 3rem; padding: 0; overflow: hidden; background: var(--cb-bg-soft); border: 0.0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-md); }
.captcha-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.auth-form__error,.auth-form__success { padding: var(--cb-space-3) var(--cb-space-4); border-radius: var(--cb-radius-lg); }
.auth-form__error { color: var(--cb-danger); background: color-mix(in srgb, var(--cb-danger) 10%, transparent); }
.auth-form__success { color: var(--cb-success); background: color-mix(in srgb, var(--cb-success) 10%, transparent); }
.auth-form-card__footer { display: grid; gap: var(--cb-space-2); padding-top: var(--cb-space-4); color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); border-top: 0.0625rem solid var(--cb-border-soft); }
.auth-form-card__footer a { color: var(--cb-color-coffee); font-weight: var(--cb-font-semibold); }
.auth-policy-links { line-height: var(--cb-line-relaxed); }
@media (max-width: 35rem) { .auth-code-row { grid-template-columns: 1fr; } }
</style>
