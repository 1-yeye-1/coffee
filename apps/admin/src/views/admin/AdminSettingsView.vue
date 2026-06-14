<script setup>
import { reactive, ref } from 'vue'

import { BaseButton, BaseInput, BaseTextarea, BaseToast } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore=useAdminStore()
const form=reactive({...adminStore.settings})
const toastVisible=ref(false)
function save(){adminStore.saveSettings(form);toastVisible.value=true}
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Configuration</span><h1>系统设置</h1><p>维护站点信息、首页推荐和 Newsletter 配置。</p></div><BaseButton @click="save">保存设置</BaseButton></header>
    <div class="admin-settings">
      <section class="admin-panel"><div class="admin-panel__header"><h2>站点信息</h2></div><div class="admin-form-grid"><BaseInput v-model="form.siteName" label="站点名称" /><BaseInput v-model="form.phone" label="联系电话" /><BaseInput v-model="form.businessHours" label="营业时间" /></div><BaseTextarea v-model="form.siteDescription" label="站点描述" /></section>
      <section class="admin-panel"><div class="admin-panel__header"><h2>首页推荐配置</h2></div><BaseInput v-model="form.featuredBooks" label="推荐图书" /><BaseInput v-model="form.featuredProducts" label="推荐商品" /><BaseInput v-model="form.featuredEvents" label="推荐活动" /></section>
      <section class="admin-panel"><div class="admin-panel__header"><h2>Newsletter 设置</h2></div><label class="admin-switch"><input v-model="form.newsletterEnabled" type="checkbox" />启用 Newsletter 订阅</label><BaseTextarea v-model="form.newsletterWelcome" label="欢迎语" /></section>
      <BaseButton size="lg" @click="save">保存全部设置</BaseButton>
    </div>
    <div class="admin-toast"><BaseToast v-model="toastVisible" variant="success" title="保存成功">系统设置已保存到本地。</BaseToast></div>
  </div>
</template>
