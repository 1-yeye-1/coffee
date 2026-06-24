<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const visible = ref(false)
let ticking = false

function updateVisibility() {
  visible.value = window.scrollY > 420
  ticking = false
}

function handleScroll() {
  if (ticking) return
  ticking = true
  window.requestAnimationFrame(updateVisibility)
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

watch(() => route.fullPath, () => {
  window.requestAnimationFrame(updateVisibility)
})
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-show="visible"
      class="back-to-top"
      type="button"
      aria-label="返回顶部"
      @click="scrollToTop"
    >
      ↑
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  z-index: calc(var(--cb-z-toast, 650) - 5);
  right: max(var(--cb-space-5, 1.25rem), env(safe-area-inset-right));
  bottom: calc(var(--cb-space-5, 1.25rem) + 4.75rem + env(safe-area-inset-bottom));
  display: inline-grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-inverse, #fff);
  font-size: 1.25rem;
  font-weight: 800;
  background:
    linear-gradient(145deg, var(--cb-color-coffee, #6f4e37), color-mix(in srgb, var(--cb-color-coffee, #6f4e37) 72%, #000));
  border: 0.0625rem solid color-mix(in srgb, var(--cb-color-gold, #d6aa5b) 46%, transparent);
  border-radius: var(--cb-radius-pill, 999px);
  box-shadow: var(--cb-shadow-lg, 0 18px 45px rgb(42 24 16 / 18%));
}

.back-to-top:focus-visible {
  outline: 0.1875rem solid color-mix(in srgb, var(--cb-color-gold, #d6aa5b) 72%, white);
  outline-offset: 0.1875rem;
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity var(--cb-duration-normal, 180ms) var(--cb-ease-standard, ease), transform var(--cb-duration-normal, 180ms) var(--cb-ease-standard, ease);
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (max-width: 40rem) {
  .back-to-top {
    right: max(var(--cb-space-4, 1rem), env(safe-area-inset-right));
    bottom: calc(var(--cb-space-4, 1rem) + 4rem + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition: none;
  }
}
</style>
