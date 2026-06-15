<script setup>
import { ref } from 'vue'

import ThemeToggle from './ThemeToggle.vue'

defineProps({
  collapsed: Boolean,
})

defineEmits(['toggle-sidebar', 'toggle-mobile'])

const adminMenuOpen = ref(false)
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__left">
      <button
        class="admin-header__mobile-menu"
        type="button"
        aria-label="打开后台菜单"
        @click="$emit('toggle-mobile')"
      >
        ☰
      </button>
      <button
        class="admin-header__collapse"
        type="button"
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="$emit('toggle-sidebar')"
      >
        {{ collapsed ? '→' : '←' }}
      </button>
      <div>
        <strong>后台管理</strong>
        <small>运营工作台</small>
      </div>
    </div>

    <div class="admin-header__actions">
      <button class="admin-header__icon-button" type="button" aria-label="后台搜索">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
      <button class="admin-header__icon-button" type="button" aria-label="通知">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        <span class="admin-header__dot" />
      </button>
      <ThemeToggle />
      <div class="admin-header__profile">
        <button
          class="admin-header__profile-trigger"
          type="button"
          :aria-expanded="adminMenuOpen"
          aria-haspopup="menu"
          @click="adminMenuOpen = !adminMenuOpen"
        >
          <span class="admin-header__avatar">A</span>
          <span class="admin-header__profile-copy">
            <strong>管理员</strong>
            <small>后台账号</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
        <div v-if="adminMenuOpen" class="admin-header__menu" role="menu">
          <button type="button" role="menuitem">个人设置</button>
          <RouterLink to="/dashboard" role="menuitem">仪表盘</RouterLink>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: sticky;
  z-index: var(--cb-z-sticky);
  top: 0;
  display: flex;
  min-height: 4.75rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-4);
  background: color-mix(in srgb, var(--cb-bg-surface) 90%, transparent);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
  backdrop-filter: blur(var(--cb-space-3));
}

.admin-header__left,
.admin-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--cb-space-2);
}

.admin-header__left > div {
  display: none;
}

.admin-header__left strong,
.admin-header__left small,
.admin-header__profile-copy {
  display: block;
}

.admin-header__left small,
.admin-header__profile-copy small {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-xs);
}

.admin-header__collapse,
.admin-header__mobile-menu,
.admin-header__icon-button {
  position: relative;
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  background: transparent;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}

.admin-header__collapse:hover,
.admin-header__mobile-menu:hover,
.admin-header__icon-button:hover {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}

.admin-header__mobile-menu {
  display: inline-grid;
}

.admin-header__icon-button svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.admin-header__dot {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 0.45rem;
  height: 0.45rem;
  background: var(--cb-danger);
  border-radius: var(--cb-radius-pill);
}

.admin-header__profile {
  position: relative;
}

.admin-header__profile-trigger {
  display: flex;
  min-height: 2.5rem;
  padding: var(--cb-space-1) var(--cb-space-2);
  align-items: center;
  gap: var(--cb-space-2);
  color: var(--cb-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-lg);
}

.admin-header__profile-trigger:hover {
  background: var(--cb-bg-soft);
}

.admin-header__avatar {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-bold);
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
}

.admin-header__profile-copy {
  display: none;
  text-align: left;
}

.admin-header__menu {
  position: absolute;
  top: calc(100% + var(--cb-space-2));
  right: 0;
  display: grid;
  min-width: 10rem;
  padding: var(--cb-space-2);
  background: var(--cb-bg-elevated);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-lg);
}

.admin-header__menu a,
.admin-header__menu button {
  padding: var(--cb-space-2) var(--cb-space-3);
  color: var(--cb-text-secondary);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-md);
}

.admin-header__menu a:hover,
.admin-header__menu button:hover {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}

@media (min-width: 48rem) {
  .admin-header__left > div,
  .admin-header__profile-copy {
    display: block;
  }

  .admin-header__mobile-menu {
    display: none;
  }
}
</style>
