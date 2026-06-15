<script setup>
import { BaseBadge } from '@/components/base'

defineProps({
  collapsed: Boolean,
  mobile: Boolean,
})

defineEmits(['navigate'])

const items = [
  { label: '仪表盘', to: '/dashboard', icon: 'D' },
  { label: '图书管理', to: '/books', icon: 'B' },
  { label: '商品管理', to: '/products', icon: 'P' },
  { label: '订单管理', to: '/orders', icon: 'O' },
  { label: '活动管理', to: '/events', icon: 'E' },
  { label: '社区审核', to: '/community', icon: 'C' },
  { label: '预约管理', to: '/bookings', icon: 'R' },
]

function isActive(path, currentPath) {
  return path === '/dashboard' ? currentPath === path || currentPath === '/' : currentPath.startsWith(path)
}
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{ 'admin-sidebar--collapsed': collapsed && !mobile }"
  >
    <RouterLink class="admin-sidebar__brand" to="/dashboard" @click="$emit('navigate')">
      <span class="admin-sidebar__mark">CB</span>
      <span v-if="!collapsed || mobile" class="admin-sidebar__brand-text">
        Coffee Book
        <small>后台管理</small>
      </span>
    </RouterLink>

    <nav class="admin-sidebar__nav" aria-label="后台导航">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :class="{ 'is-active': isActive(item.to, $route.path) }"
        :title="collapsed && !mobile ? item.label : undefined"
        @click="$emit('navigate')"
      >
        <span class="admin-sidebar__icon" aria-hidden="true">{{ item.icon }}</span>
        <span v-if="!collapsed || mobile">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div v-if="!collapsed || mobile" class="admin-sidebar__footer">
      <BaseBadge variant="premium">Coffee Book 后台</BaseBadge>
      <small>运营管理工作台</small>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  color: var(--cb-text-primary);
  background: var(--cb-bg-surface);
}

.admin-sidebar__brand {
  display: flex;
  min-height: 4.75rem;
  padding: var(--cb-space-4);
  align-items: center;
  gap: var(--cb-space-3);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.admin-sidebar__mark {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  color: var(--cb-text-inverse);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  letter-spacing: 0.08em;
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-lg);
}

.admin-sidebar__brand-text {
  display: grid;
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-lg);
  font-weight: var(--cb-font-bold);
  line-height: var(--cb-line-tight);
}

.admin-sidebar__brand-text small {
  margin-top: var(--cb-space-1);
  font-family: var(--cb-font-body);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-medium);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.admin-sidebar__nav {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-4);
}

.admin-sidebar__nav a {
  display: flex;
  min-height: 2.75rem;
  padding: var(--cb-space-2) var(--cb-space-3);
  align-items: center;
  gap: var(--cb-space-3);
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
  border-radius: var(--cb-radius-md);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.admin-sidebar__nav a:hover,
.admin-sidebar__nav a.is-active {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}

.admin-sidebar__icon {
  display: inline-grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  place-items: center;
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-sm);
}

.admin-sidebar__footer {
  display: grid;
  gap: var(--cb-space-2);
  margin-top: auto;
  padding: var(--cb-space-4);
  border-top: 0.0625rem solid var(--cb-border-soft);
}

.admin-sidebar--collapsed .admin-sidebar__brand {
  justify-content: center;
  padding-inline: var(--cb-space-2);
}

.admin-sidebar--collapsed .admin-sidebar__nav {
  padding-inline: var(--cb-space-2);
}

.admin-sidebar--collapsed .admin-sidebar__nav a {
  justify-content: center;
  padding-inline: var(--cb-space-2);
}
</style>
