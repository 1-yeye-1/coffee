<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton } from '@/components/base'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const open = ref(false)
const menuRef = ref(null)

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
  close()
  router.push('/')
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
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
        {{ authStore.user?.nickname?.slice(0, 1) || 'C' }}
      </span>
      <span class="user-menu__name">{{ authStore.user?.nickname || 'Coffee Member' }}</span>
      <span aria-hidden="true">⌄</span>
    </button>

    <Transition name="user-menu">
      <div v-if="open" class="user-menu__dropdown" role="menu">
        <RouterLink to="/account" role="menuitem" @click="close">会员中心</RouterLink>
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
