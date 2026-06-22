<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: Boolean,
  loading: Boolean,
})

const attrs = useAttrs()
const isDisabled = computed(() => props.disabled || props.loading)
const cursorLabel = computed(() => attrs['data-cursor'] || (props.variant === 'danger' ? 'WARN' : undefined))
const motionType = computed(() => attrs['data-motion'] || (props.size !== 'sm' && ['primary', 'secondary'].includes(props.variant) ? 'magnetic' : undefined))
</script>

<template>
  <button
    v-bind="attrs"
    :type="type"
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`]"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :data-cursor="cursorLabel"
    :data-motion="motionType"
  >
    <span v-if="loading" class="base-button__dots" aria-hidden="true"><i v-for="dot in 3" :key="dot" class="base-button__dot" /></span>
    <span v-else-if="$slots['icon-left']" class="base-button__icon" aria-hidden="true">
      <slot name="icon-left" />
    </span>
    <span class="base-button__label"><slot /></span>
    <span v-if="!loading && $slots['icon-right']" class="base-button__icon" aria-hidden="true">
      <slot name="icon-right" />
    </span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: var(--cb-space-2);
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-semibold);
  line-height: 1;
  white-space: nowrap;
  background: var(--cb-color-coffee);
  border: 0.0625rem solid transparent;
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-sm);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard),
    border-color var(--cb-duration-fast) var(--cb-ease-standard),
    box-shadow var(--cb-duration-normal) var(--cb-ease-standard),
    transform var(--cb-duration-fast) var(--cb-ease-emphasized);
}
.base-button__dots{display:inline-flex;gap:.2rem}.base-button__dot{display:block;width:.28rem;height:.28rem;background:currentcolor;border-radius:50%;animation:cb-button-dot .65s ease-in-out infinite}.base-button__dot:nth-child(2){animation-delay:.09s}.base-button__dot:nth-child(3){animation-delay:.18s}@keyframes cb-button-dot{50%{opacity:.45;transform:translateY(-.22rem)}}

.base-button:hover:not(:disabled) {
  box-shadow: var(--cb-shadow-md);
  transform: translateY(calc(var(--cb-space-1) * -0.25));
}

.base-button:active:not(:disabled) {
  box-shadow: var(--cb-shadow-sm);
  transform: translateY(0);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-button--sm {
  min-height: 2.25rem;
  padding: var(--cb-space-2) var(--cb-space-3);
  font-size: var(--cb-font-size-sm);
}

.base-button--md {
  min-height: 2.75rem;
  padding: var(--cb-space-3) var(--cb-space-5);
  font-size: var(--cb-font-size-md);
}

.base-button--lg {
  min-height: 3.25rem;
  padding: var(--cb-space-4) var(--cb-space-6);
  font-size: var(--cb-font-size-lg);
}

.base-button--secondary {
  color: var(--cb-text-inverse);
  background: var(--cb-color-caramel);
}

.base-button--outline {
  color: var(--cb-color-coffee);
  background: transparent;
  border-color: var(--cb-border-strong);
  box-shadow: none;
}

.base-button--ghost {
  color: var(--cb-text-primary);
  background: transparent;
  box-shadow: none;
}

.base-button--outline:hover:not(:disabled),
.base-button--ghost:hover:not(:disabled) {
  background: var(--cb-bg-soft);
}

.base-button--danger {
  color: var(--cb-text-inverse);
  background: var(--cb-danger);
}

.base-button__spinner {
  width: 1em;
  height: 1em;
  border: 0.125rem solid color-mix(in srgb, currentcolor 30%, transparent);
  border-top-color: currentcolor;
  border-radius: var(--cb-radius-pill);
}

.base-button__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
}

.base-button__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
