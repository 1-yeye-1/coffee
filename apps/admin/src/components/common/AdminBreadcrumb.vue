<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const crumbs = computed(() => {
  const result = [{ label: 'Admin', to: '/dashboard' }]
  if (route.path !== '/dashboard') {
    result.push({ label: route.meta.title || 'Current Page', to: route.path })
  }
  return result
})
</script>

<template>
  <nav class="admin-breadcrumb" aria-label="Breadcrumb">
    <template v-for="(crumb, index) in crumbs" :key="crumb.to">
      <span v-if="index" aria-hidden="true">/</span>
      <RouterLink v-if="index < crumbs.length - 1" :to="crumb.to">{{ crumb.label }}</RouterLink>
      <span v-else aria-current="page">{{ crumb.label }}</span>
    </template>
  </nav>
</template>

<style scoped>
.admin-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}

.admin-breadcrumb a:hover {
  color: var(--cb-color-coffee);
}

.admin-breadcrumb [aria-current="page"] {
  color: var(--cb-text-primary);
  font-weight: var(--cb-font-semibold);
}
</style>
