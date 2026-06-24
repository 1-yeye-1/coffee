<script setup>
import BaseDrawer from '@/components/base/BaseDrawer.vue'

defineProps({
  modelValue: Boolean,
  items: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseDrawer
    :model-value="modelValue"
    title="Coffee Book"
    side="right"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <nav class="mobile-navigation" aria-label="移动端主导航">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        @click="close"
      >
        <span>{{ item.label }}</span>
        <span aria-hidden="true">→</span>
      </RouterLink>
    </nav>
  </BaseDrawer>
</template>

<style scoped>
.mobile-navigation {
  display: grid;
  gap: var(--cb-space-2);
}

.mobile-navigation a {
  display: flex;
  min-height: 3rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
  color: var(--cb-text-secondary);
  font-weight: var(--cb-font-semibold);
  border-radius: var(--cb-radius-lg);
}

.mobile-navigation a:hover,
.mobile-navigation a.router-link-active {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}
</style>
