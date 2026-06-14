<script setup>
import { reactive, ref } from 'vue'

import { BaseBadge, BaseButton, BaseInput, BaseToast } from '@/components/base'
import { useMembershipStore } from '@/stores/membership'
import '@/assets/styles/pages/engagement.css'

const membershipStore = useMembershipStore()
const form = reactive({
  nickname: membershipStore.account.nickname,
  phone: membershipStore.account.phone,
  email: membershipStore.account.email,
})
const toastVisible = ref(false)

function save() {
  membershipStore.updateProfile(form)
  toastVisible.value = true
}
</script>

<template>
  <div class="member-page">
    <header><span class="section-eyebrow">Profile</span><h2 class="page-title">个人资料</h2></header>
    <section class="member-panel profile-card"><span class="avatar">{{ membershipStore.account.avatar }}</span><div><h3>{{ membershipStore.account.nickname }}</h3><BaseBadge variant="premium">{{ membershipStore.account.level }}</BaseBadge><p>{{ membershipStore.account.points }} 积分</p></div></section>
    <section class="member-panel create-form"><h3 class="section-title">基础信息</h3><div class="form-grid"><BaseInput v-model="form.nickname" label="昵称" /><BaseInput v-model="form.phone" label="手机号" /><BaseInput v-model="form.email" type="email" label="邮箱" /></div><BaseButton @click="save">保存资料</BaseButton></section>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="保存成功">个人资料已保存到本地。</BaseToast></div>
  </div>
</template>
