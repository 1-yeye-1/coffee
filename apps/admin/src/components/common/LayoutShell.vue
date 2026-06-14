<script setup>
defineProps({
  as: {
    type: String,
    default: 'div',
  },
  size: {
    type: String,
    default: 'xl',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value),
  },
  padded: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <component
    :is="as"
    class="layout-shell"
    :class="[`layout-shell--${size}`, { 'layout-shell--padded': padded }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.layout-shell {
  width: 100%;
  margin-inline: auto;
}

.layout-shell--sm {
  max-width: var(--cb-container-sm);
}

.layout-shell--md {
  max-width: var(--cb-container-md);
}

.layout-shell--lg {
  max-width: var(--cb-container-lg);
}

.layout-shell--xl {
  max-width: var(--cb-container-xl);
}

.layout-shell--full {
  max-width: none;
}

.layout-shell--padded {
  padding-inline: var(--cb-space-4);
}

@media (min-width: 48rem) {
  .layout-shell--padded {
    padding-inline: var(--cb-space-6);
  }
}

@media (min-width: 80rem) {
  .layout-shell--padded {
    padding-inline: var(--cb-space-8);
  }
}
</style>

