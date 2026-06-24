<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton } from '@/components/base'
import { resolveUploadUrl } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
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
      @click.stop="open = !open"
    >
      <span class="user-menu__avatar" aria-hidden="true">
        <img v-if="avatarUrl && !avatarFailed" :src="avatarUrl" alt="" decoding="async" @error="handleAvatarError" />
        <span v-else>{{ authStore.user?.nickname?.slice(0, 1) || 'C' }}</span>
      </span>
      <span class="user-menu__name">{{ authStore.user?.nickname || 'Coffee Member' }}</span>
      <span aria-hidden="true">⌄</span>
    </button>

    <Transition name="user-menu">
      <div v-if="open" class="user-menu__dropdown" role="menu">
        <RouterLink to="/account" role="menuitem" @click="close">会员中心</RouterLink>
        <RouterLink class="user-menu__notice-link" to="/account/notifications" role="menuitem" @click="close">
          通知中心
          <span v-if="notificationsStore.unreadCount > 0" class="user-menu__badge">{{ notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount }}</span>
        </RouterLink>
        <RouterLink to="/account/orders" role="menuitem" @click="close">我的订单</RouterLink>
        <RouterLink to="/account/bookings" role="menuitem" @click="close">我的预约</RouterLink>
        <button type="button" role="menuitem" @click="logout">退出登录</button>
      </div>
    </Transition>
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
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-bold);
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
  overflow: hidden;
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

.user-menu__dropdown {
  position: absolute;
  z-index: var(--cb-z-dropdown);
  top: calc(100% + var(--cb-space-2));
  right: 0;
  display: grid;
  width: 12rem;
  padding: var(--cb-space-2);
  background: var(--cb-bg-elevated);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-lg);
}

.user-menu__dropdown a,
.user-menu__dropdown button {
  position: relative;
  padding: var(--cb-space-3);
  color: var(--cb-text-secondary);
  text-align: start;
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-md);
}

.user-menu__dropdown a:hover,
.user-menu__dropdown button:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.user-menu__notice-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-2);
}

.user-menu__badge {
  display: inline-grid;
  min-width: 1.25rem;
  height: 1.25rem;
  padding-inline: var(--cb-space-1);
  place-items: center;
  color: var(--cb-text-inverse);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  background: var(--cb-danger);
  border-radius: var(--cb-radius-pill);
}

.user-menu-enter-active,
.user-menu-leave-active {
  transition:
    opacity var(--cb-duration-fast) var(--cb-ease-standard),
    transform var(--cb-duration-fast) var(--cb-ease-standard);
}

.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--cb-space-1) * -1));
}

@media (min-width: 75rem) {
  .user-menu__name {
    display: inline;
  }
}
</style>
