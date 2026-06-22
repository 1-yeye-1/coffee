<script setup>
import BaseButton from './BaseButton.vue'

defineProps({
  title: { type: String, default: '内容加载失败' },
  message: { type: String, default: '暂时无法获取数据，请稍后重试。' },
  retryLabel: { type: String, default: '重新加载' },
})

defineEmits(['retry'])
</script>

<template>
  <section class="error-panel" role="alert">
    <span class="error-panel__mark" aria-hidden="true">!</span>
    <div>
      <strong>{{ title }}</strong>
      <p>{{ message }}</p>
    </div>
    <BaseButton size="sm" variant="outline" @click="$emit('retry')">{{ retryLabel }}</BaseButton>
  </section>
</template>

<style scoped>
.error-panel{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:var(--cb-space-4);padding:var(--cb-space-5);align-items:center;color:var(--cb-text-primary);background:color-mix(in srgb,var(--cb-danger) 8%,var(--panel-bg));border:1px solid color-mix(in srgb,var(--cb-danger) 35%,var(--field-border));border-radius:var(--cb-radius-xl)}
.error-panel__mark{display:grid;width:2.5rem;height:2.5rem;place-items:center;color:var(--cb-danger);font-weight:800;background:color-mix(in srgb,var(--cb-danger) 14%,var(--card-bg));border-radius:50%}
.error-panel p{margin-top:var(--cb-space-1);color:var(--cb-text-secondary)}
@media(max-width:42rem){.error-panel{grid-template-columns:auto 1fr}.error-panel :deep(.base-button){grid-column:1/-1}}
</style>
