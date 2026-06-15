<script setup>
import { computed, onMounted, ref } from 'vue'

import { getNotifications, markNotificationRead } from '@/api/account'
import { BaseBadge, BaseButton, BaseTable } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const notifications = ref([])
const error = ref('')
const columns = [
  { key: 'title', label: '标题' },
  { key: 'content', label: '内容' },
  { key: 'readAt', label: '状态' },
  { key: 'createdAt', label: '时间' },
  { key: 'actions', label: '操作' },
]
const unread = computed(() => notifications.value.filter((item) => !item.readAt).length)

async function load() {
  notifications.value = (await getNotifications()).data
}

async function read(item) {
  notifications.value = (await markNotificationRead(item.id)).data
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Notifications</span>
      <h2 class="page-title">通知中心</h2>
      <p class="page-subtitle">系统通知从数据库读取，已读状态会同步保存。</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="member-panel">
      <BaseBadge variant="premium">未读通知 {{ unread }} 条</BaseBadge>
    </section>
    <BaseTable :columns="columns" :items="notifications" empty-text="暂无通知">
      <template #cell-readAt="{ value }">
        <BaseBadge :variant="value ? 'neutral' : 'success'">{{ value ? '已读' : '未读' }}</BaseBadge>
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
      <template #cell-actions="{ item }">
        <BaseButton v-if="!item.readAt" size="sm" variant="ghost" @click="read(item)">标记已读</BaseButton>
        <span v-else>-</span>
      </template>
    </BaseTable>
  </div>
</template>
