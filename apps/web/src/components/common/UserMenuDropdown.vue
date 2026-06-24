<script setup>
defineProps({
  unreadCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close', 'logout'])
</script>

<template>
  <Transition name="user-menu" appear>
    <div class="user-menu__dropdown" role="menu">
      <RouterLink to="/account" role="menuitem" @click="emit('close')">会员中心</RouterLink>
      <RouterLink class="user-menu__notice-link" to="/account/notifications" role="menuitem" @click="emit('close')">
        通知中心
        <span v-if="unreadCount > 0" class="user-menu__badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </RouterLink>
      <RouterLink to="/account/orders" role="menuitem" @click="emit('close')">我的订单</RouterLink>
      <RouterLink to="/account/bookings" role="menuitem" @click="emit('close')">我的预约</RouterLink>
      <button type="button" role="menuitem" @click="emit('logout')">退出登录</button>
    </div>
  </Transition>
</template>

<style scoped>
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
</style>
