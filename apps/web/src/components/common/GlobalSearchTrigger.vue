<script setup>
import { defineAsyncComponent, ref } from 'vue'

const GlobalSearchPanel = defineAsyncComponent(() => import('./GlobalSearchPanel.vue'))
const open = ref(false)

function openSearch() {
  open.value = true
  if (import.meta.env.DEV || import.meta.env.VITE_HOME_PERF === '1') console.info(`[home-perf] header-lazy-loaded: ${Math.round(performance.now())}ms`)
}
</script>

<template>
  <button class="search-trigger" type="button" aria-label="打开全站搜索" title="全站搜索" @click="openSearch">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  </button>
  <GlobalSearchPanel v-if="open" v-model="open" />
</template>

<style scoped>
.search-trigger {
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
.search-trigger:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}
.search-trigger svg {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 1.75;
}
</style>
