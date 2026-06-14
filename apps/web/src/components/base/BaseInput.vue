<script setup>
import { computed, useId, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
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
    default: '',
  },
  hint: {
    type: String,
    default: '',
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
  type: {
    type: String,
    default: 'text',
  },
  password: Boolean,
  search: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const generatedId = useId()
const inputId = computed(() => props.id || `cb-input-${generatedId}`)
const messageId = computed(() => `${inputId.value}-message`)
const resolvedType = computed(() => {
  if (props.password) return 'password'
  if (props.search) return 'search'
  return props.type
})
const stateClass = computed(() => ({
  'base-field--error': Boolean(props.error),
  'base-field--success': Boolean(props.success) && !props.error,
  'base-field--disabled': props.disabled,
}))
</script>

<template>
  <div class="base-field" :class="stateClass">
    <label v-if="label" class="base-field__label" :for="inputId">{{ label }}</label>
    <div class="base-field__control">
      <span v-if="$slots.prefix" class="base-field__affix" aria-hidden="true">
        <slot name="prefix" />
      </span>
      <input
        v-bind="attrs"
        :id="inputId"
        class="base-field__input"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="hint || error || success ? messageId : undefined"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <span v-if="$slots.suffix" class="base-field__affix" aria-hidden="true">
        <slot name="suffix" />
      </span>
    </div>
    <p
      v-if="error || success || hint"
      :id="messageId"
      class="base-field__message"
      :role="error ? 'alert' : undefined"
    >
      {{ error || (typeof success === 'string' ? success : hint) }}
    </p>
  </div>
</template>

<style scoped>
.base-field {
  display: grid;
  gap: var(--cb-space-2);
  width: 100%;
}

.base-field__label {
  color: var(--cb-text-primary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

.base-field__control {
  display: flex;
  min-height: 3rem;
  align-items: center;
  color: var(--cb-text-primary);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  transition:
    border-color var(--cb-duration-fast) var(--cb-ease-standard),
    box-shadow var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-field__control:focus-within {
  border-color: var(--cb-color-coffee);
  box-shadow: var(--cb-shadow-focus);
}

.base-field__input {
  min-width: 0;
  flex: 1;
  padding: var(--cb-space-3) var(--cb-space-4);
  color: var(--cb-text-primary);
  background: transparent;
  border: 0;
  outline: 0;
}

.base-field__input::placeholder {
  color: var(--cb-text-muted);
}

.base-field__affix {
  display: inline-flex;
  padding-inline: var(--cb-space-4);
  align-items: center;
  color: var(--cb-text-muted);
}

.base-field__affix + .base-field__input {
  padding-inline-start: 0;
}

.base-field__input + .base-field__affix {
  padding-inline-start: 0;
}

.base-field__message {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
  line-height: var(--cb-line-normal);
}

.base-field--error .base-field__control {
  border-color: var(--cb-danger);
}

.base-field--error .base-field__message {
  color: var(--cb-danger);
}

.base-field--success .base-field__control {
  border-color: var(--cb-success);
}

.base-field--success .base-field__message {
  color: var(--cb-success);
}

.base-field--disabled {
  opacity: 0.6;
}
</style>
