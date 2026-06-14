<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  variant: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value),
  },
  title: {
    type: String,
    default: '',
  },
  duration: {
    type: Number,
    default: 4000,
  },
  closable: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])
const visible = ref(props.modelValue)
let timer

function close() {
  clearTimeout(timer)
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

function startTimer() {
  clearTimeout(timer)
  if (visible.value && props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
}

function pauseTimer() {
  clearTimeout(timer)
}

watch(
  () => props.modelValue,
  (value) => {
    visible.value = value
    startTimer()
  },
  { immediate: true },
)
watch(() => props.duration, startTimer)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Transition name="base-toast">
    <div
      v-if="visible"
      class="base-toast"
      :class="`base-toast--${variant}`"
      :role="variant === 'error' ? 'alert' : 'status'"
      aria-live="polite"
      @mouseenter="pauseTimer"
      @mouseleave="startTimer"
    >
      <span class="base-toast__indicator" aria-hidden="true" />
      <div class="base-toast__content">
        <strong v-if="title" class="base-toast__title">{{ title }}</strong>
        <p class="base-toast__message"><slot /></p>
      </div>
      <button
        v-if="closable"
        class="base-toast__close"
        type="button"
        aria-label="关闭通知"
        @click="close"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.base-toast {
  display: grid;
  width: min(100%, 24rem);
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--cb-space-3);
  align-items: start;
  padding: var(--cb-space-4);
  color: var(--cb-text-primary);
  background: var(--cb-bg-elevated);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-lg);
}

.base-toast__indicator {
  width: var(--cb-space-2);
  height: var(--cb-space-2);
  margin-top: var(--cb-space-2);
  background: var(--cb-info);
  border-radius: var(--cb-radius-pill);
}

.base-toast--success .base-toast__indicator {
  background: var(--cb-success);
}

.base-toast--error .base-toast__indicator {
  background: var(--cb-danger);
}

.base-toast--warning .base-toast__indicator {
  background: var(--cb-warning);
}

.base-toast__content {
  min-width: 0;
}

.base-toast__title {
  display: block;
  margin-bottom: var(--cb-space-1);
  font-size: var(--cb-font-size-sm);
}

.base-toast__message {
  font-size: var(--cb-font-size-sm);
  line-height: var(--cb-line-normal);
}

.base-toast__close {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-xl);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-pill);
}

.base-toast__close:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.base-toast-enter-active,
.base-toast-leave-active {
  transition:
    opacity var(--cb-duration-normal) var(--cb-ease-standard),
    transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}

.base-toast-enter-from,
.base-toast-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--cb-space-2) * -1));
}
</style>
