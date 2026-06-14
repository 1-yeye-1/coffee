<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'hover', 'interactive', 'elevated'].includes(value),
  },
  as: {
    type: String,
    default: 'article',
  },
})

const emit = defineEmits(['click'])

function handleKeydown(event) {
  if (props.variant !== 'interactive') return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('click', event)
  }
}
</script>

<template>
  <component
    :is="as"
    class="base-card"
    :class="`base-card--${variant}`"
    :tabindex="variant === 'interactive' ? 0 : undefined"
    :role="variant === 'interactive' ? 'button' : undefined"
    @click="emit('click', $event)"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>

<style scoped>
.base-card {
  padding: var(--cb-space-6);
  color: var(--cb-text-primary);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-sm);
  transition:
    border-color var(--cb-duration-normal) var(--cb-ease-standard),
    box-shadow var(--cb-duration-normal) var(--cb-ease-standard),
    transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}

.base-card--elevated {
  background: var(--cb-bg-elevated);
  border-color: transparent;
  box-shadow: var(--cb-shadow-lg);
}

.base-card--hover:hover,
.base-card--interactive:hover,
.base-card--interactive:focus-visible {
  border-color: var(--cb-border-strong);
  box-shadow: var(--cb-shadow-hover);
  transform: translateY(calc(var(--cb-space-1) * -1));
}

.base-card--interactive {
  cursor: pointer;
}
</style>

