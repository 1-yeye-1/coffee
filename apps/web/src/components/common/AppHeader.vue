<script setup>
import { defineAsyncComponent, onMounted, ref } from 'vue'

import NotificationBell from '@/components/notifications/NotificationBell.vue'

import CartTrigger from './CartTrigger.vue'
import CursorSettings from './CursorSettings.vue'
import GlobalSearchTrigger from './GlobalSearchTrigger.vue'
import LayoutShell from './LayoutShell.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'

const MobileNavigation = defineAsyncComponent(() => import('./MobileNavigation.vue'))
const mobileOpen = ref(false)
const navigation = [
  { label: '首页', to: '/' },
  { label: '咖啡', to: '/coffee' },
  { label: '图书', to: '/books' },
  { label: '活动', to: '/events' },
  { label: '社区', to: '/community' },
  { label: '预约', to: '/booking' },
]

function isActive(path, currentPath) {
  return path === '/' ? currentPath === path : currentPath.startsWith(path)
}

function logHeaderPerf(label) {
  if (!(import.meta.env.DEV || import.meta.env.VITE_HOME_PERF === '1') || typeof performance === 'undefined') return
  console.info(`[home-perf] ${label}: ${Math.round(performance.now())}ms`)
}

function openMobileMenu() {
  mobileOpen.value = true
  logHeaderPerf('header-lazy-loaded')
}

onMounted(() => logHeaderPerf('header-interactive'))
</script>

<template>
  <header class="app-header">
    <LayoutShell class="app-header__inner">
      <RouterLink class="app-header__brand" to="/" aria-label="Coffee Book 首页">
        <span class="app-header__mark" aria-hidden="true">CB</span>
        <span>Coffee Book</span>
      </RouterLink>

      <nav class="app-header__nav" aria-label="主导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="{ 'is-current': isActive(item.to, $route.path) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="app-header__actions">
        <GlobalSearchTrigger />
        <ThemeToggle />
        <CursorSettings />
        <CartTrigger />
        <NotificationBell />
        <UserMenu />
        <button
          class="app-header__menu"
          type="button"
          aria-label="打开移动端菜单"
          :aria-expanded="mobileOpen"
          @click="openMobileMenu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </LayoutShell>

    <MobileNavigation v-if="mobileOpen" v-model="mobileOpen" :items="navigation" />
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: var(--cb-z-sticky);
  top: 0;
  background: color-mix(in srgb, var(--cb-bg-page) 88%, transparent);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
  backdrop-filter: blur(var(--cb-space-3));
}
.app-header__inner {
  display: grid;
  min-height: 4.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--cb-space-4);
  align-items: center;
}
.app-header__brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: var(--cb-space-3);
  color: var(--cb-text-primary);
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-xl);
  font-weight: var(--cb-font-bold);
}
.app-header__mark {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  color: var(--cb-text-inverse);
  font-family: var(--cb-font-body);
  font-size: var(--cb-font-size-xs);
  letter-spacing: 0.08em;
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
}
.app-header__nav {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--cb-space-1);
}
.app-header__nav a {
  position: relative;
  padding: var(--cb-space-3) var(--cb-space-4);
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
  border-radius: var(--cb-radius-pill);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard);
}
.app-header__nav a:hover,
.app-header__nav a.is-current {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}
.app-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: var(--cb-space-1);
}
.app-header__menu {
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
.app-header__menu:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}
.app-header__menu svg {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 1.75;
}
@media (max-width: 30rem) {
  .app-header__brand > span:last-child,
  .app-header__actions :deep(.base-button) {
    display: none;
  }
}
@media (min-width: 64rem) {
  .app-header__inner {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .app-header__nav {
    display: flex;
  }
  .app-header__menu {
    display: none;
  }
}
</style>
