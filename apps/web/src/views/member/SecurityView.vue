<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { sendCode } from '@/api/auth'
import { changePhone, getSecuritySettings, verifyCurrentPhone } from '@/api/account'
import { BaseBadge, BaseButton, BaseInput, BaseToast, ErrorPanel } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import '@/assets/styles/pages/engagement.css'

const authStore = useAuthStore()
const settings = ref(null)
const error = ref('')
const success = ref('')
const loading = ref(false)
const sendingOld = ref(false)
const verifyingOld = ref(false)
const sendingNew = ref(false)
const changing = ref(false)
const oldCountdown = ref(0)
const newCountdown = ref(0)
const oldVerified = ref(false)
const toastVisible = ref(false)
let oldTimer = null
let newTimer = null

const form = reactive({
  currentCode: '',
  newPhone: '',
  newPhoneCode: '',
})

const currentPhone = computed(() => authStore.user?.phone || '')

function isPhone(value) {
  return /^\d{11}$/.test(String(value || '').trim())
}

function startCountdown(target, seconds = 60) {
  const timerRef = target === 'old' ? oldTimer : newTimer
  window.clearInterval(timerRef)
  if (target === 'old') oldCountdown.value = seconds
  else newCountdown.value = seconds
  const timer = window.setInterval(() => {
    if (target === 'old') {
      oldCountdown.value -= 1
      if (oldCountdown.value <= 0) window.clearInterval(oldTimer)
    } else {
      newCountdown.value -= 1
      if (newCountdown.value <= 0) window.clearInterval(newTimer)
    }
  }, 1000)
  if (target === 'old') oldTimer = timer
  else newTimer = timer
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    settings.value = (await getSecuritySettings()).data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function sendOldCode() {
  error.value = ''
  success.value = ''
  if (!currentPhone.value) {
    error.value = '当前账号缺少可验证的手机号，请联系管理员处理。'
    return
  }
  sendingOld.value = true
  try {
    const response = await sendCode({ phone: currentPhone.value, scene: 'change_phone_old' })
    startCountdown('old', response.data.cooldown || 60)
    success.value = '当前手机号验证码已发送，请查看短信或开发环境控制台日志。'
  } catch (err) {
    error.value = err.message || '验证码发送失败。'
  } finally {
    sendingOld.value = false
  }
}

async function verifyOld() {
  error.value = ''
  success.value = ''
  if (!form.currentCode.trim()) {
    error.value = '请输入当前手机号验证码。'
    return
  }
  verifyingOld.value = true
  try {
    await verifyCurrentPhone({ code: form.currentCode.trim() })
    oldVerified.value = true
    success.value = '当前手机号验证通过，请继续验证新手机号。'
  } catch (err) {
    error.value = err.message || '当前手机号验证码错误或已过期。'
  } finally {
    verifyingOld.value = false
  }
}

async function sendNewCode() {
  error.value = ''
  success.value = ''
  if (!oldVerified.value) {
    error.value = '请先完成当前手机号验证。'
    return
  }
  if (!isPhone(form.newPhone)) {
    error.value = '请输入 11 位新手机号。'
    return
  }
  if (form.newPhone === currentPhone.value) {
    error.value = '新手机号不能与当前手机号相同。'
    return
  }
  sendingNew.value = true
  try {
    const response = await sendCode({ phone: form.newPhone.trim(), scene: 'change_phone_new' })
    startCountdown('new', response.data.cooldown || 60)
    success.value = '新手机号验证码已发送，请查看短信或开发环境控制台日志。'
  } catch (err) {
    error.value = err.message || '验证码发送失败。'
  } finally {
    sendingNew.value = false
  }
}

async function submitPhoneChange() {
  error.value = ''
  success.value = ''
  if (!oldVerified.value) {
    error.value = '请先完成当前手机号验证。'
    return
  }
  if (!isPhone(form.newPhone)) {
    error.value = '请输入 11 位新手机号。'
    return
  }
  if (!form.newPhoneCode.trim()) {
    error.value = '请输入新手机号验证码。'
    return
  }
  changing.value = true
  try {
    const updatedUser = (await changePhone({
      newPhone: form.newPhone.trim(),
      newPhoneCode: form.newPhoneCode.trim(),
    })).data
    authStore.user = { ...authStore.user, ...updatedUser }
    authStore.persist()
    await load()
    Object.assign(form, { currentCode: '', newPhone: '', newPhoneCode: '' })
    oldVerified.value = false
    success.value = '手机号更换成功，请妥善保管账号安全。'
    toastVisible.value = true
  } catch (err) {
    error.value = err.message || '手机号更换失败，请稍后重试。'
  } finally {
    changing.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => {
  window.clearInterval(oldTimer)
  window.clearInterval(newTimer)
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Security</span>
      <h2 class="page-title">安全设置</h2>
      <p class="page-subtitle">更换手机号需要先验证当前手机号，再验证新手机号。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <p v-if="success" class="form-success">{{ success }}</p>

    <section v-if="settings" class="member-panel">
      <div class="member-stat-grid">
        <div class="member-stat">
          <span>绑定手机号</span>
          <strong>{{ settings.phone }}</strong>
        </div>
        <div class="member-stat">
          <span>短信验证</span>
          <strong>{{ settings.smsVerification ? '已开启' : '未开启' }}</strong>
        </div>
        <div class="member-stat">
          <span>登录保护</span>
          <strong>{{ settings.loginProtection ? '已开启' : '未开启' }}</strong>
        </div>
      </div>
      <BaseBadge variant="success">安全状态正常</BaseBadge>
    </section>

    <section class="member-panel phone-change">
      <h3 class="section-title">更换手机号</h3>
      <div class="phone-step" :class="{ 'is-done': oldVerified }">
        <span class="phone-step__index">1</span>
        <div>
          <h4>验证当前手机号</h4>
          <p class="text-muted">验证码会发送到当前绑定手机号，开发环境请查看后端控制台日志。</p>
          <div class="phone-step__row">
            <BaseInput v-model="form.currentCode" label="当前手机号验证码" inputmode="numeric" placeholder="请输入验证码" />
            <BaseButton variant="outline" :loading="sendingOld" :disabled="oldCountdown > 0" @click="sendOldCode">
              {{ oldCountdown > 0 ? `${oldCountdown} 秒后重试` : '发送验证码' }}
            </BaseButton>
            <BaseButton :loading="verifyingOld" @click="verifyOld">验证当前手机号</BaseButton>
          </div>
        </div>
      </div>

      <div class="phone-step" :class="{ 'is-disabled': !oldVerified }">
        <span class="phone-step__index">2</span>
        <div>
          <h4>验证新手机号</h4>
          <p class="text-muted">新手机号不能与当前手机号相同，也不能已被其他账号绑定。</p>
          <div class="phone-step__row">
            <BaseInput v-model="form.newPhone" label="新手机号" type="tel" autocomplete="tel" placeholder="请输入新手机号" :disabled="!oldVerified" />
            <BaseInput v-model="form.newPhoneCode" label="新手机号验证码" inputmode="numeric" placeholder="请输入验证码" :disabled="!oldVerified" />
            <BaseButton variant="outline" :loading="sendingNew" :disabled="!oldVerified || newCountdown > 0" @click="sendNewCode">
              {{ newCountdown > 0 ? `${newCountdown} 秒后重试` : '发送新验证码' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <BaseButton :loading="changing" :disabled="!oldVerified" @click="submitPhoneChange">确认更换手机号</BaseButton>
    </section>

    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" title="手机号更换成功">请妥善保管账号安全。</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.phone-change {
  display: grid;
  gap: var(--cb-space-5);
}
.phone-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--cb-space-4);
  padding: var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-bg-surface);
}
.phone-step.is-disabled {
  opacity: 0.65;
}
.phone-step.is-done {
  border-color: color-mix(in srgb, var(--cb-success) 42%, var(--cb-border-soft));
}
.phone-step__index {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-bold);
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
}
.phone-step h4 {
  margin-bottom: var(--cb-space-1);
}
.phone-step__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: var(--cb-space-3);
  align-items: end;
  margin-top: var(--cb-space-3);
}
.form-success {
  padding: var(--cb-space-3) var(--cb-space-4);
  color: var(--cb-success);
  background: color-mix(in srgb, var(--cb-success) 10%, transparent);
  border-radius: var(--cb-radius-lg);
}
@media (max-width: 52rem) {
  .phone-step__row {
    grid-template-columns: 1fr;
  }
}
</style>
