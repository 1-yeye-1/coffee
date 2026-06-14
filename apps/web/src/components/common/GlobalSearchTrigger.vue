<script setup>
import { ref } from 'vue'

import { BaseInput, BaseModal } from '@/components/base'

const open = ref(false)
const keyword = ref('')
</script>

<template>
  <button class="search-trigger" type="button" aria-label="打开全站搜索" @click="open = true">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  </button>

  <BaseModal v-model="open" title="搜索 Coffee Book">
    <div class="search-panel cb-stack">
      <BaseInput
        v-model="keyword"
        label="搜索"
        placeholder="搜索图书、咖啡、活动或社区内容"
        search
        autofocus
      >
        <template #prefix>
          <svg class="search-panel__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </template>
      </BaseInput>
      <div class="search-panel__suggestions">
        <span class="section-eyebrow">搜索建议</span>
        <p>输入关键词后，这里将展示推荐内容与最近搜索。</p>
      </div>
    </div>
  </BaseModal>
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
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.search-trigger:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.search-trigger svg,
.search-panel__icon {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.search-panel__suggestions {
  padding: var(--cb-space-5);
  background: var(--cb-bg-soft);
  border-radius: var(--cb-radius-lg);
}

.search-panel__suggestions p {
  margin-top: var(--cb-space-2);
}
</style>

