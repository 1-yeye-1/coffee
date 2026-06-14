<script setup>
import { computed, useId, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请选择',
  },
  error: {
    type: String,
    default: '',
  },
  success: {
    type: [String, Boolean],
    default: false,
  },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const generatedId = useId()
const selectId = computed(() => props.id || `cb-select-${generatedId}`)
const messageId = computed(() => `${selectId.value}-message`)
</script>

<template>
  <div
    class="base-select"
    :class="{
      'base-select--error': error,
      'base-select--success': success && !error,
      'base-select--disabled': disabled,
    }"
  >
    <label v-if="label" class="base-select__label" :for="selectId">{{ label }}</label>
    <div class="base-select__wrap">
      <select
        v-bind="attrs"
        :id="selectId"
        class="base-select__control"
        :value="modelValue"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error || success ? messageId : undefined"
        @change="emit('update:modelValue', $event.target.value)"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <span class="base-select__chevron" aria-hidden="true">⌄</span>
    </div>
    <p
      v-if="error || success"
      :id="messageId"
      class="base-select__message"
      :role="error ? 'alert' : undefined"
    >
      {{ error || (typeof success === 'string' ? success : '') }}
    </p>
  </div>
</template>

<style scoped>
.base-select {
  display: grid;
  gap: var(--cb-space-2);
  width: 100%;
}

.base-select__label {
  color: var(--cb-text-primary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

.base-select__wrap {
  position: relative;
}

.base-select__control {
  width: 100%;
  min-height: 3rem;
  padding: var(--cb-space-3) calc(var(--cb-space-10) + var(--cb-space-2)) var(--cb-space-3)
    var(--cb-space-4);
  appearance: none;
  color: var(--cb-text-primary);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  outline: 0;
  transition:
    border-color var(--cb-duration-fast) var(--cb-ease-standard),
    box-shadow var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-select__control:focus {
  border-color: var(--cb-color-coffee);
  box-shadow: var(--cb-shadow-focus);
}

.base-select__chevron {
  position: absolute;
  top: 50%;
  right: var(--cb-space-4);
  color: var(--cb-text-muted);
  pointer-events: none;
  transform: translateY(-55%);
  transition: transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}

.base-select__wrap:focus-within .base-select__chevron {
  transform: translateY(-45%) rotate(180deg);
}

.base-select__message {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}

.base-select--error .base-select__control {
  border-color: var(--cb-danger);
}

.base-select--error .base-select__message {
  color: var(--cb-danger);
}

.base-select--success .base-select__control {
  border-color: var(--cb-success);
}

.base-select--success .base-select__message {
  color: var(--cb-success);
}

.base-select--disabled {
  opacity: 0.6;
}
</style>
