<script setup>
import { ref } from 'vue'

import { BaseDrawer } from '@/components/base'
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb.vue'
import AdminHeader from '@/components/common/AdminHeader.vue'
import AdminSidebar from '@/components/common/AdminSidebar.vue'
import LayoutShell from '@/components/common/LayoutShell.vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const mobileOpen = ref(false)
</script>

<template>
  <div
    class="admin-layout"
    :class="{ 'admin-layout--collapsed': adminStore.navigationCollapsed }"
  >
    <div class="admin-layout__desktop-sidebar">
      <AdminSidebar :collapsed="adminStore.navigationCollapsed" />
    </div>

    <div class="admin-layout__main">
      <AdminHeader
        :collapsed="adminStore.navigationCollapsed"
        @toggle-sidebar="adminStore.navigationCollapsed = !adminStore.navigationCollapsed"
        @toggle-mobile="mobileOpen = true"
      />
      <LayoutShell class="admin-layout__content">
        <AdminBreadcrumb />
        <main class="admin-layout__view">
          <RouterView />
        </main>
      </LayoutShell>
    </div>

    <BaseDrawer v-model="mobileOpen" title="后台导航" side="left">
      <template #default>
        <AdminSidebar mobile @navigate="mobileOpen = false" />
      </template>
    </BaseDrawer>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  min-height: 100vh;
  color: var(--cb-text-primary);
  background: var(--cb-bg-page);
}

.admin-layout__desktop-sidebar {
  display: none;
}

.admin-layout__main {
  min-width: 0;
}

.admin-layout__content {
  padding-block: var(--cb-space-5) var(--cb-space-12);
}

.admin-layout__view {
  min-width: 0;
  margin-top: var(--cb-space-4);
  padding: var(--cb-space-5);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-sm);
}

@media (min-width: 64rem) {
  .admin-layout {
    grid-template-columns: 16rem minmax(0, 1fr);
    transition: grid-template-columns var(--cb-duration-normal) var(--cb-ease-emphasized);
  }

  .admin-layout--collapsed {
    grid-template-columns: 4.75rem minmax(0, 1fr);
  }

  .admin-layout__desktop-sidebar {
    position: sticky;
    top: 0;
    display: block;
    height: 100vh;
    border-right: 0.0625rem solid var(--cb-border-soft);
  }

  .admin-layout__content {
    padding-block: var(--cb-space-6) var(--cb-space-16);
  }

  .admin-layout__view {
    padding: var(--cb-space-8);
  }
}
</style>
