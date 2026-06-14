<script setup>
import BaseButton from './BaseButton.vue'

defineProps({
  title: {
    type: String,
    default: '暂无内容',
  },
  description: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action'])
</script>

<template>
  <section class="empty-state" aria-live="polite">
    <div v-if="$slots.icon" class="empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <BaseButton v-if="actionLabel" variant="outline" @click="emit('action')">
      {{ actionLabel }}
    </BaseButton>
    <slot name="action" />
  </section>
</template>

<style scoped>
.empty-state {
  display: flex;
  width: 100%;
  min-height: 16rem;
  padding: var(--cb-space-8);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--cb-space-3);
  text-align: center;
  background: var(--cb-bg-soft);
  border: 0.0625rem dashed var(--cb-border-strong);
  border-radius: var(--cb-radius-2xl);
}

.empty-state__icon {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: var(--cb-space-2);
  place-items: center;
  color: var(--cb-color-coffee);
  font-size: var(--cb-font-size-3xl);
  background: var(--cb-bg-surface);
  border-radius: var(--cb-radius-pill);
  box-shadow: var(--cb-shadow-sm);
}

.empty-state__title {
  font-size: var(--cb-font-size-2xl);
}

.empty-state__description {
  max-width: 34rem;
}
</style>
