<script setup>
defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (value) =>
      ['success', 'warning', 'danger', 'info', 'neutral', 'premium'].includes(value),
  },
})
</script>

<template>
  <span class="base-badge" :class="`base-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  width: fit-content;
  min-height: 1.625rem;
  padding: var(--cb-space-1) var(--cb-space-3);
  align-items: center;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  line-height: 1;
  letter-spacing: 0.03em;
  background: var(--cb-bg-soft);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-pill);
}

.base-badge--success {
  color: var(--cb-success);
  background: color-mix(in srgb, var(--cb-success) 12%, var(--cb-bg-surface));
  border-color: color-mix(in srgb, var(--cb-success) 28%, var(--cb-border-soft));
}

.base-badge--warning {
  color: var(--cb-warning);
  background: color-mix(in srgb, var(--cb-warning) 12%, var(--cb-bg-surface));
  border-color: color-mix(in srgb, var(--cb-warning) 28%, var(--cb-border-soft));
}

.base-badge--danger {
  color: var(--cb-danger);
  background: color-mix(in srgb, var(--cb-danger) 12%, var(--cb-bg-surface));
  border-color: color-mix(in srgb, var(--cb-danger) 28%, var(--cb-border-soft));
}

.base-badge--info {
  color: var(--cb-info);
  background: color-mix(in srgb, var(--cb-info) 12%, var(--cb-bg-surface));
  border-color: color-mix(in srgb, var(--cb-info) 28%, var(--cb-border-soft));
}

.base-badge--premium {
  color: var(--cb-color-coffee);
  background: color-mix(in srgb, var(--cb-color-gold) 22%, var(--cb-bg-surface));
  border-color: var(--cb-color-gold);
}
</style>
