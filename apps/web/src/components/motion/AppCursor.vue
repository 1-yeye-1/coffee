<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useCursorSystem } from '@/composables/useCursorSystem'

const route = useRoute()
const rootRef = ref(null)
const dotRef = ref(null)
const ringRef = ref(null)
const labelRef = ref(null)
const { reset } = useCursorSystem({ root: rootRef, dot: dotRef, ring: ringRef, label: labelRef })

watch(() => route.fullPath, reset)
</script>

<template>
  <div ref="rootRef" class="app-cursor" aria-hidden="true">
    <span ref="dotRef" class="app-cursor__dot" />
    <span ref="ringRef" class="app-cursor__ring"><span ref="labelRef" class="app-cursor__label" /></span>
  </div>
</template>

<style scoped>
.app-cursor {
  position: fixed;
  z-index: var(--cb-z-cursor, 700);
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--cb-duration-fast) var(--cb-ease-standard);
}

.app-cursor.is-visible { opacity: 1; }
.app-cursor.is-native-area { opacity: 0; }

.app-cursor__dot,
.app-cursor__ring {
  position: fixed;
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  translate: -50% -50%;
  border-radius: var(--cb-radius-pill);
  will-change: transform;
}

.app-cursor__dot {
  width: .38rem;
  height: .38rem;
  background: var(--cb-cursor-dot, var(--cb-color-coffee));
  box-shadow: 0 0 .75rem color-mix(in srgb, var(--cb-cursor-dot, var(--cb-color-coffee)) 45%, transparent);
}

.app-cursor__ring {
  width: 2rem;
  height: 2rem;
  color: var(--cb-cursor-text, var(--cb-text-primary));
  background: color-mix(in srgb, var(--cb-bg-surface) 72%, transparent);
  border: .0625rem solid var(--cb-cursor-ring, var(--cb-color-gold));
  box-shadow: 0 0 1.4rem color-mix(in srgb, var(--cb-cursor-ring, var(--cb-color-gold)) 28%, transparent);
  backdrop-filter: blur(.35rem);
  transition: width var(--cb-duration-normal) var(--cb-ease-emphasized), height var(--cb-duration-normal) var(--cb-ease-emphasized), border-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.app-cursor__ring.is-labelled { width: 3.75rem; height: 3.75rem; }
.app-cursor__ring.is-warning { border-color: var(--cb-danger); }
.app-cursor__label { font-size: .58rem; font-weight: var(--cb-font-bold); letter-spacing: .12em; }

:global(html.has-app-cursor body),
:global(html.has-app-cursor a),
:global(html.has-app-cursor [data-cursor]) { cursor: none; }

:global(html.has-app-cursor input),
:global(html.has-app-cursor textarea),
:global(html.has-app-cursor [contenteditable="true"]) { cursor: text; }

:global(html.has-app-cursor select),
:global(html.has-app-cursor option) { cursor: default; }

@media (max-width: 63.999rem), (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  .app-cursor { display: none; }
}
</style>
