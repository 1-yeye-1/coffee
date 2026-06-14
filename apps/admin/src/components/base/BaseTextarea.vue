<script setup>
import { computed, useId, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: {
    type: String,
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
  hint: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  disabled: Boolean,
  maxlength: {
    type: Number,
    default: undefined,
  },
  showCount: Boolean,
  rows: {
    type: Number,
    default: 5,
  },
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const generatedId = useId()
const textareaId = computed(() => props.id || `cb-textarea-${generatedId}`)
const messageId = computed(() => `${textareaId.value}-message`)
const currentLength = computed(() => props.modelValue.length)
</script>

<template>
  <div
    class="base-textarea"
    :class="{ 'base-textarea--error': error, 'base-textarea--disabled': disabled }"
  >
    <label v-if="label" class="base-textarea__label" :for="textareaId">{{ label }}</label>
    <textarea
      v-bind="attrs"
      :id="textareaId"
      class="base-textarea__control"
      :value="modelValue"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="hint || error || showCount ? messageId : undefined"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <div v-if="hint || error || showCount" :id="messageId" class="base-textarea__meta">
      <p :class="{ 'base-textarea__error': error }" :role="error ? 'alert' : undefined">
        {{ error || hint }}
      </p>
      <small v-if="showCount" class="base-textarea__count">
        {{ currentLength }}<template v-if="maxlength"> / {{ maxlength }}</template>
      </small>
    </div>
  </div>
</template>

<style scoped>
.base-textarea {
  display: grid;
  gap: var(--cb-space-2);
  width: 100%;
}

.base-textarea__label {
  color: var(--cb-text-primary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

.base-textarea__control {
  width: 100%;
  min-height: 7rem;
  padding: var(--cb-space-4);
  resize: vertical;
  color: var(--cb-text-primary);
  line-height: var(--cb-line-relaxed);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  outline: 0;
  transition:
    border-color var(--cb-duration-fast) var(--cb-ease-standard),
    box-shadow var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-textarea__control:focus {
  border-color: var(--cb-color-coffee);
  box-shadow: var(--cb-shadow-focus);
}

.base-textarea__meta {
  display: flex;
  min-height: 1.25rem;
  gap: var(--cb-space-3);
  justify-content: space-between;
}

.base-textarea__meta p {
  font-size: var(--cb-font-size-sm);
}

.base-textarea__count {
  margin-inline-start: auto;
  white-space: nowrap;
}

.base-textarea__error {
  color: var(--cb-danger);
}

.base-textarea--error .base-textarea__control {
  border-color: var(--cb-danger);
}

.base-textarea--disabled {
  opacity: 0.6;
}
</style>
