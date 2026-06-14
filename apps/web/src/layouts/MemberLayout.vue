<script setup>
import AppFooter from '@/components/common/AppFooter.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import LayoutShell from '@/components/common/LayoutShell.vue'

const menu = [
  { label: '账户概览', to: '/account' },
  { label: '个人资料', to: '/account/profile' },
  { label: '安全设置', to: '/account/security' },
  { label: '会员权益', to: '/account/membership' },
  { label: '积分记录', to: '/account/points' },
  { label: '我的收藏', to: '/account/favorites' },
  { label: '我的订单', to: '/account/orders' },
  { label: '我的预约', to: '/account/bookings' },
  { label: '活动报名', to: '/account/activities' },
  { label: '我的帖子', to: '/account/posts' },
  { label: '通知中心', to: '/account/notifications' },
  { label: '地址管理', to: '/account/addresses' },
]

function isActive(path, currentPath) {
  return path === '/account' ? currentPath === path : currentPath.startsWith(path)
}
</script>

<template>
  <div class="member-layout cb-page">
    <AppHeader />
    <LayoutShell class="member-layout__shell">
      <header class="member-layout__header">
        <span class="section-eyebrow">Member Center</span>
        <h1 class="section-title">账户中心</h1>
        <p>管理个人资料、会员权益与 Coffee Book 服务记录。</p>
      </header>

      <nav class="member-layout__mobile-nav" aria-label="账户菜单">
        <RouterLink
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          :class="{ 'is-active': isActive(item.to, $route.path) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="member-layout__body">
        <aside class="member-layout__sidebar">
          <nav aria-label="账户菜单">
            <RouterLink
              v-for="item in menu"
              :key="item.to"
              :to="item.to"
              :class="{ 'is-active': isActive(item.to, $route.path) }"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </aside>
        <main class="member-layout__content">
          <RouterView />
        </main>
      </div>
    </LayoutShell>
    <AppFooter />
  </div>
</template>

<style scoped>
.member-layout {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.member-layout__shell {
  flex: 1;
  padding-block: var(--cb-space-10) var(--cb-space-16);
}

.member-layout__header {
  display: grid;
  gap: var(--cb-space-2);
  margin-bottom: var(--cb-space-8);
}

.member-layout__mobile-nav {
  display: flex;
  margin-inline: calc(var(--cb-space-4) * -1);
  padding-inline: var(--cb-space-4);
  gap: var(--cb-space-2);
  overflow-x: auto;
  scrollbar-width: thin;
}

.member-layout__mobile-nav a {
  padding: var(--cb-space-3) var(--cb-space-4);
  flex: 0 0 auto;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-pill);
}

.member-layout__mobile-nav a.is-active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
  border-color: var(--cb-color-coffee);
}

.member-layout__body {
  display: grid;
  gap: var(--cb-space-6);
  margin-top: var(--cb-space-6);
}

.member-layout__sidebar {
  display: none;
}

.member-layout__content {
  min-width: 0;
  padding: var(--cb-space-5);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-sm);
}

@media (min-width: 64rem) {
  .member-layout__mobile-nav {
    display: none;
  }

  .member-layout__body {
    grid-template-columns: 15rem minmax(0, 1fr);
    align-items: start;
  }

  .member-layout__sidebar {
    display: block;
    padding: var(--cb-space-3);
    background: var(--cb-bg-surface);
    border: 0.0625rem solid var(--cb-border-soft);
    border-radius: var(--cb-radius-2xl);
    box-shadow: var(--cb-shadow-sm);
  }

  .member-layout__sidebar nav {
    display: grid;
    gap: var(--cb-space-1);
  }

  .member-layout__sidebar a {
    padding: var(--cb-space-3) var(--cb-space-4);
    color: var(--cb-text-secondary);
    font-size: var(--cb-font-size-sm);
    font-weight: var(--cb-font-semibold);
    border-radius: var(--cb-radius-md);
  }

  .member-layout__sidebar a:hover,
  .member-layout__sidebar a.is-active {
    color: var(--cb-color-coffee);
    background: var(--cb-bg-soft);
  }

  .member-layout__content {
    padding: var(--cb-space-8);
  }
}
</style>
