<script setup>
import { nextTick, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  variant: {
    type: String,
    default: 'default',
  },
  ariaLabel: {
    type: String,
    default: '内容分组',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])
const tabRefs = ref([])

function selectTab(value) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}

async function moveFocus(currentIndex, direction) {
  const enabledTabs = props.tabs
    .map((tab, index) => ({ tab, index }))
    .filter(({ tab }) => !tab.disabled)
  const currentEnabledIndex = enabledTabs.findIndex(({ index }) => index === currentIndex)
  const nextEnabledIndex =
    (currentEnabledIndex + direction + enabledTabs.length) % enabledTabs.length
  const target = enabledTabs[nextEnabledIndex]
  selectTab(target.tab.value)
  await nextTick()
  tabRefs.value[target.index]?.focus()
}

function handleKeydown(event, index) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    moveFocus(index, 1)
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    moveFocus(index, -1)
  }
  if (event.key === 'Home') {
    event.preventDefault()
    const first = props.tabs.findIndex((tab) => !tab.disabled)
    moveFocus(first, 0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    const last = props.tabs.findLastIndex((tab) => !tab.disabled)
    moveFocus(last, 0)
  }
}
</script>

<template>
  <div class="base-tabs" :class="`base-tabs--${variant}`">
    <div class="base-tabs__list" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="(tab, index) in tabs"
        :id="`tab-${tab.value}`"
        :key="tab.value"
        :ref="(element) => (tabRefs[index] = element)"
        class="base-tabs__tab"
        :class="{ 'base-tabs__tab--active': tab.value === modelValue }"
        type="button"
        role="tab"
        :tabindex="tab.value === modelValue ? 0 : -1"
        :aria-selected="tab.value === modelValue"
        :aria-controls="`panel-${tab.value}`"
        :disabled="tab.disabled"
        @click="selectTab(tab.value)"
        @keydown="handleKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <Transition name="base-tabs" mode="out-in">
      <div
        :id="`panel-${modelValue}`"
        :key="modelValue"
        class="base-tabs__panel"
        role="tabpanel"
        :aria-labelledby="`tab-${modelValue}`"
        tabindex="0"
      >
        <slot :name="String(modelValue)">
          <slot />
        </slot>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-tabs {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  background: color-mix(in srgb, var(--cb-bg-elevated) 82%, transparent);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-pill);
}

.base-tabs__list {
  display: flex;
  max-width: 100%;
  flex-wrap: nowrap;
  gap: var(--cb-space-2);
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  border-bottom: 0;
}

.base-tabs__tab {
  position: relative;
  flex: 0 0 auto;
  min-height: 2.75rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  color: var(--cb-text-muted);
  font-weight: var(--cb-font-semibold);
  white-space: nowrap;
  background: transparent;
  border: 0;
  scroll-snap-align: start;
}

.base-tabs--books,
.base-tabs--coffee,
.base-tabs--events,
.base-tabs--community {
  width: fit-content;
  max-width: 100%;
}

.base-tabs--events .base-tabs__tab,
.base-tabs--community .base-tabs__tab {
  min-width: auto;
  padding-inline: var(--cb-space-3);
  text-align: center;
}

.base-tabs--events,
.base-tabs--community {
  margin-bottom: var(--cb-space-3);
  border-radius: var(--cb-radius-xl);
}

.base-tabs--community {
  border-radius: var(--cb-radius-xl);
}

.base-tabs--member {
  overflow: visible;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.base-tabs--member .base-tabs__list {
  gap: var(--cb-space-4);
  padding-bottom: var(--cb-space-3);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.base-tabs--member .base-tabs__tab {
  min-height: auto;
  padding: 0 0 var(--cb-space-3);
  color: var(--cb-text-secondary);
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.base-tabs--member .base-tabs__tab::after {
  right: 0;
  left: 0;
}

.base-tabs--member .base-tabs__tab--active {
  color: var(--cb-color-coffee);
  background: transparent;
  box-shadow: none;
}

.base-tabs--member .base-tabs__panel {
  padding-block: var(--cb-space-5) 0;
}

.base-tabs--community .base-tabs__tab--active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
}

.base-tabs__tab::after {
  position: absolute;
  right: var(--cb-space-4);
  bottom: 0;
  left: var(--cb-space-4);
  height: 0.125rem;
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
  content: "";
  transform: scaleX(0);
  transition: transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}

.base-tabs__tab:hover:not(:disabled) {
  color: var(--cb-text-primary);
}

.base-tabs__tab--active {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-surface);
  box-shadow: var(--cb-shadow-sm);
}

.base-tabs__tab--active::after {
  transform: scaleX(1);
}

.base-tabs__tab:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.base-tabs__panel {
  padding-block: var(--cb-space-5);
  outline: 0;
}

.base-tabs--events .base-tabs__panel,
.base-tabs--community .base-tabs__panel {
  padding-block: var(--cb-space-2);
}

:global(html[data-theme="dark"]) .base-tabs {
  background: color-mix(in srgb, var(--cb-bg-elevated) 86%, transparent);
  border-color: color-mix(in srgb, var(--cb-color-gold) 22%, var(--cb-border-soft));
}

:global(html[data-theme="dark"]) .base-tabs__tab {
  color: var(--cb-text-secondary);
}

:global(html[data-theme="dark"]) .base-tabs__tab--active {
  color: var(--cb-color-gold);
  background: color-mix(in srgb, var(--cb-color-gold) 12%, var(--cb-bg-surface));
}

.base-tabs-enter-active,
.base-tabs-leave-active {
  transition:
    opacity var(--cb-duration-fast) var(--cb-ease-standard),
    transform var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-tabs-enter-from {
  opacity: 0;
  transform: translateY(var(--cb-space-1));
}

.base-tabs-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--cb-space-1) * -1));
}
</style>
