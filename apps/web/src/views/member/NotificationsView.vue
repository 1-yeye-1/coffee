<script setup>
import { onMounted, ref } from 'vue'

import { BaseButton, ErrorPanel } from '@/components/base'
import NotificationDrawer from '@/components/notifications/NotificationDrawer.vue'
import { useNotificationsStore } from '@/stores/notifications'
import '@/assets/styles/pages/engagement.css'

const open = ref(false)
const notificationsStore = useNotificationsStore()

onMounted(() => {
  notificationsStore.fetchUnreadCount()
})
</script>

<template>
  <div class="member-page notifications-lite">
    <header>
      <span class="section-eyebrow">Messages</span>
      <h2 class="page-title">消息中心</h2>
      <p class="page-subtitle">消息中心已改为右上角小喇叭入口，旧链接会继续保留。</p>
    </header>

    <ErrorPanel v-if="notificationsStore.error" :message="notificationsStore.error" @retry="notificationsStore.fetchUnreadCount" />
    <section v-else class="member-panel notifications-lite__panel">
      <div>
        <h3 class="section-title">当前未读消息</h3>
        <strong>{{ notificationsStore.unreadCount }}</strong>
        <p class="text-muted">点击下方按钮打开聊天式消息面板。</p>
      </div>
      <BaseButton @click="open = true">打开消息中心</BaseButton>
    </section>

    <NotificationDrawer v-model="open" />
  </div>
</template>

<style scoped>
.notifications-lite__panel {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
}
.notifications-lite__panel strong {
  display: block;
  margin: var(--cb-space-2) 0;
  color: var(--cb-color-coffee);
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-5xl);
  line-height: 1;
}
</style>
