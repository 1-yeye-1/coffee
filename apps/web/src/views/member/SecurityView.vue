<script setup>
import { onMounted, ref } from 'vue'

import { getSecuritySettings } from '@/api/account'
import { BaseBadge } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const settings = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    settings.value = (await getSecuritySettings()).data
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Security</span>
      <h2 class="page-title">安全设置</h2>
      <p class="page-subtitle">当前安全信息来自数据库账号记录。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
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
  </div>
</template>
