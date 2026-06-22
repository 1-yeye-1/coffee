<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useGsapReveal } from '@/composables/useGsapReveal'

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: '',
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])
const dialogRef = ref(null)
const titleId = `cb-modal-title-${useId()}`
let previousActiveElement = null
const { revealModal } = useGsapReveal()
const enter = (element, done) => revealModal(element, done)
const leave = (element, done) => revealModal(element, done, true)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlay(event) {
  if (props.closeOnOverlay && event.target === event.currentTarget) close()
}

function handleKeydown(event) {
  if (props.closeOnEsc && event.key === 'Escape') close()
}

function restorePage() {
  document.body.style.overflow = ''
  previousActiveElement?.focus?.()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      previousActiveElement = document.activeElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      dialogRef.value?.focus()
    } else {
      restorePage()
    }
  },
  { immediate: true },
)

onBeforeUnmount(restorePage)
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="enter" @leave="leave">
      <div
        v-if="modelValue"
        class="base-modal"
        role="presentation"
        @click="handleOverlay"
        @keydown="handleKeydown"
      >
        <section
          ref="dialogRef"
          class="base-modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
        >
          <header class="base-modal__header">
            <h2 v-if="title" :id="titleId" class="base-modal__title">{{ title }}</h2>
            <button class="base-modal__close" type="button" data-cursor="close" aria-label="关闭弹窗" @click="close">
              ×
            </button>
          </header>
          <div class="base-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal {
  position: fixed;
  z-index: var(--cb-z-modal);
  inset: 0;
  display: grid;
  padding: var(--cb-space-4);
  place-items: center;
  overflow-y: auto;
  background: color-mix(in srgb, var(--cb-bg-dark) 72%, transparent);
}

.base-modal__dialog {
  width: min(100%, var(--cb-container-sm));
  max-height: min(90vh, 48rem);
  overflow: auto;
  color: var(--cb-text-primary);
  background: var(--cb-bg-elevated);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-xl);
  outline: 0;
}

.base-modal__header,
.base-modal__footer {
  display: flex;
  gap: var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
  padding: var(--cb-space-5) var(--cb-space-6);
}

.base-modal__header {
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.base-modal__footer {
  justify-content: flex-end;
  border-top: 0.0625rem solid var(--cb-border-soft);
}

.base-modal__title {
  font-size: var(--cb-font-size-2xl);
}

.base-modal__close {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-2xl);
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-pill);
}

.base-modal__close:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.base-modal__body {
  padding: var(--cb-space-6);
}

.base-modal-enter-active,
.base-modal-leave-active {
  transition: opacity var(--cb-duration-normal) var(--cb-ease-standard);
}

.base-modal-enter-active .base-modal__dialog,
.base-modal-leave-active .base-modal__dialog {
  transition:
    opacity var(--cb-duration-normal) var(--cb-ease-standard),
    transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}

.base-modal-enter-from,
.base-modal-leave-to,
.base-modal-enter-from .base-modal__dialog,
.base-modal-leave-to .base-modal__dialog {
  opacity: 0;
}

.base-modal-enter-from .base-modal__dialog,
.base-modal-leave-to .base-modal__dialog {
  transform: scale(0.98);
}
</style>
