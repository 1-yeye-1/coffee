<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

import NotificationDrawer from './NotificationDrawer.vue'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const open = ref(false)

async function refresh() {
  if (authStore.isAuthenticated) await notificationsStore.fetchUnreadCount()
  else notificationsStore.reset()
}

function toggle() {
  open.value = !open.value
}

onMounted(() => {
  refresh()
  window.addEventListener('coffee-book:auth-login', refresh)
  window.addEventListener('coffee-book:auth-logout', refresh)
  window.addEventListener('coffee-book:notifications-updated', refresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('coffee-book:auth-login', refresh)
  window.removeEventListener('coffee-book:auth-logout', refresh)
  window.removeEventListener('coffee-book:notifications-updated', refresh)
})

watch(open, (value) => {
  if (!value) refresh()
})
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="notification-bell">
    <button
      class="notification-bell__button"
      type="button"
      :aria-expanded="open"
      aria-label="打开消息中心"
      title="消息中心"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11v2a3 3 0 0 0 3 3h1l4 3v-14l-4 3H7a3 3 0 0 0-3 3Z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
      <span v-if="notificationsStore.unreadCount" class="notification-bell__badge">
        {{ notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount }}
      </span>
    </button>
    <NotificationDrawer v-model="open" />
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}
.notification-bell__button {
  position: relative;
  display: inline-grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-pill);
}
.notification-bell__button:hover,
.notification-bell__button[aria-expanded="true"] {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}
.notification-bell__button svg {
  width: 1.3rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
.notification-bell__badge {
  position: absolute;
  top: 0.35rem;
  right: 0.3rem;
  min-width: 1.05rem;
  height: 1.05rem;
  padding: 0 0.25rem;
  color: var(--cb-text-inverse);
  font-size: 0.65rem;
  font-weight: var(--cb-font-bold);
  line-height: 1.05rem;
  text-align: center;
  background: var(--cb-danger);
  border-radius: var(--cb-radius-pill);
}
</style>
