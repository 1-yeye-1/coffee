<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useGsapReveal } from '@/composables/useGsapReveal'

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: '',
  },
  side: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value),
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])
const drawerRef = ref(null)
const titleId = `cb-drawer-title-${useId()}`
let previousActiveElement = null
const { revealDrawer } = useGsapReveal()
const enter = (element, done) => revealDrawer(element, done, false, props.side)
const leave = (element, done) => revealDrawer(element, done, true, props.side)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlay(event) {
  if (props.closeOnOverlay && event.target === event.currentTarget) close()
}

function handleKeydown(event) {
  if (event.key === 'Escape') close()
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
      drawerRef.value?.focus()
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
        class="base-drawer"
        :class="`base-drawer--${side}`"
        role="presentation"
        @click="handleOverlay"
        @keydown="handleKeydown"
      >
        <aside
          ref="drawerRef"
          class="base-drawer__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
        >
          <header class="base-drawer__header">
            <h2 v-if="title" :id="titleId" class="base-drawer__title">{{ title }}</h2>
            <button class="base-drawer__close" type="button" aria-label="关闭抽屉" @click="close">
              ×
            </button>
          </header>
          <div class="base-drawer__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="base-drawer__footer">
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-drawer {
  position: fixed;
  z-index: var(--cb-z-modal);
  inset: 0;
  display: flex;
  background: color-mix(in srgb, var(--cb-bg-dark) 72%, transparent);
}

.base-drawer--right {
  justify-content: flex-end;
}

.base-drawer__panel {
  display: flex;
  width: clamp(24rem, 72vw, 72rem);
  max-width: 100vw;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  color: var(--cb-text-primary);
  background: var(--cb-bg-elevated);
  box-shadow: var(--cb-shadow-xl);
  outline: 0;
}

.base-drawer__header,
.base-drawer__footer {
  display: flex;
  gap: var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
  padding: var(--cb-space-5);
}

.base-drawer__header {
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.base-drawer__footer {
  margin-top: auto;
  border-top: 0.0625rem solid var(--cb-border-soft);
}

.base-drawer__title {
  font-size: var(--cb-font-size-2xl);
}

.base-drawer__close {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-2xl);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-pill);
}

.base-drawer__close:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.base-drawer__body {
  min-width: 0;
  padding: var(--cb-space-5);
  overflow-x: hidden;
  overflow-y: auto;
}

.base-drawer__body > :deep(*) {
  max-width: 100%;
}

@media (max-width: 48rem) {
  .base-drawer__panel {
    width: 100vw;
  }

  .base-drawer__header,
  .base-drawer__footer,
  .base-drawer__body {
    padding: var(--cb-space-4);
  }
}

.base-drawer-left-enter-active,
.base-drawer-left-leave-active,
.base-drawer-right-enter-active,
.base-drawer-right-leave-active {
  transition: opacity var(--cb-duration-normal) var(--cb-ease-standard);
}

.base-drawer-left-enter-active .base-drawer__panel,
.base-drawer-left-leave-active .base-drawer__panel,
.base-drawer-right-enter-active .base-drawer__panel,
.base-drawer-right-leave-active .base-drawer__panel {
  transition: transform var(--cb-duration-slow) var(--cb-ease-emphasized);
}

.base-drawer-left-enter-from,
.base-drawer-left-leave-to,
.base-drawer-right-enter-from,
.base-drawer-right-leave-to {
  opacity: 0;
}

.base-drawer-left-enter-from .base-drawer__panel,
.base-drawer-left-leave-to .base-drawer__panel {
  transform: translateX(-100%);
}

.base-drawer-right-enter-from .base-drawer__panel,
.base-drawer-right-leave-to .base-drawer__panel {
  transform: translateX(100%);
}
</style>
