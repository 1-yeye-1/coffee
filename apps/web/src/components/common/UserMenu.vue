<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { resolveUploadUrl } from '@/api/upload'
import BaseButton from '@/components/base/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const UserMenuDropdown = defineAsyncComponent(() => import('./UserMenuDropdown.vue'))
const open = ref(false)
const menuRef = ref(null)
const avatarFailed = ref(false)
const avatarUrl = computed(() => authStore.user?.avatar ? resolveUploadUrl(authStore.user.avatar) : '')

function close() {
  open.value = false
}

function handleDocumentClick(event) {
  if (!menuRef.value?.contains(event.target)) close()
}

function handleKeydown(event) {
  if (event.key === 'Escape') close()
}

async function logout() {
  await authStore.logout()
  notificationsStore.reset()
  close()
  router.push('/')
}

function refreshUnread() {
  if (authStore.isAuthenticated) notificationsStore.fetchUnreadCount()
}

function handleAvatarError() {
  avatarFailed.value = true
}

function toggleMenu() {
  open.value = !open.value
  if (open.value && (import.meta.env.DEV || import.meta.env.VITE_HOME_PERF === '1')) console.info(`[home-perf] header-lazy-loaded: ${Math.round(performance.now())}ms`)
}

watch(() => authStore.user?.avatar, () => {
  avatarFailed.value = false
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
  refreshUnread()
  window.addEventListener('coffee-book:auth-login', refreshUnread)
  window.addEventListener('coffee-book:notifications-updated', refreshUnread)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('coffee-book:auth-login', refreshUnread)
  window.removeEventListener('coffee-book:notifications-updated', refreshUnread)
})
</script>

<template>
  <BaseButton v-if="!authStore.isAuthenticated" size="sm" @click="$router.push('/login')">
    登录
  </BaseButton>

  <div v-else ref="menuRef" class="user-menu">
    <button
      class="user-menu__trigger"
      type="button"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click.stop="toggleMenu"
    >
      <span class="user-menu__avatar" aria-hidden="true">
        <img v-if="avatarUrl && !avatarFailed" :src="avatarUrl" alt="" decoding="async" @error="handleAvatarError" />
        <span v-else>{{ authStore.user?.nickname?.slice(0, 1) || 'C' }}</span>
      </span>
      <span class="user-menu__name">{{ authStore.user?.nickname || 'Coffee Member' }}</span>
      <span aria-hidden="true">⌄</span>
    </button>

    <UserMenuDropdown
      v-if="open"
      :unread-count="notificationsStore.unreadCount"
      @close="close"
      @logout="logout"
    />
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.user-menu__trigger {
  display: inline-flex;
  min-height: 2.75rem;
  padding: var(--cb-space-1) var(--cb-space-2);
  align-items: center;
  gap: var(--cb-space-2);
  color: var(--cb-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-pill);
}

.user-menu__trigger:hover {
  background: var(--cb-bg-soft);
}

.user-menu__avatar {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  overflow: hidden;
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-bold);
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
}

.user-menu__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu__name {
  display: none;
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

@media (min-width: 75rem) {
  .user-menu__name {
    display: inline;
  }
}
</style>
