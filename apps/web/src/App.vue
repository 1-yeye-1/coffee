<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import BackToTop from '../../shared/components/BackToTop.vue'

const globalError = ref('')
const motionRuntimeReady = ref(false)
const GlobalMotionRuntime = defineAsyncComponent(() => import('@/components/common/GlobalMotionRuntime.vue'))

function handleGlobalError(event) {
  globalError.value = event.detail?.message || '页面遇到异常，已进入安全模式。'
}

function clearGlobalError() {
  globalError.value = ''
}

function runIdle(callback) {
  if (typeof window === 'undefined') return callback()
  if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout: 520 })
  return window.setTimeout(callback, 64)
}

function shouldEnableGlobalMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  window.addEventListener('coffee-book:global-error', handleGlobalError)
  if (shouldEnableGlobalMotion()) runIdle(() => { motionRuntimeReady.value = true })
})
onBeforeUnmount(() => window.removeEventListener('coffee-book:global-error', handleGlobalError))
</script>

<template>
  <section v-if="globalError" class="app-error-fallback" role="alert">
    <strong>页面已进入安全模式</strong>
    <p>{{ globalError }}</p>
    <button type="button" @click="clearGlobalError">继续浏览</button>
  </section>
  <RouterView />
  <BackToTop />
  <GlobalMotionRuntime v-if="motionRuntimeReady" />
</template>

<style scoped>
.app-error-fallback {
  position: fixed;
  z-index: var(--cb-z-toast, 650);
  right: var(--cb-space-5, 1.25rem);
  bottom: var(--cb-space-5, 1.25rem);
  width: min(24rem, calc(100vw - 2rem));
  padding: var(--cb-space-4, 1rem);
  color: var(--cb-text-primary, #2a1810);
  background: var(--cb-bg-elevated, #fffaf0);
  border: 1px solid color-mix(in srgb, var(--cb-danger, #b42318) 28%, var(--cb-border-soft, #eadfce));
  border-radius: var(--cb-radius-xl, 1rem);
  box-shadow: var(--cb-shadow-lg, 0 18px 45px rgb(42 24 16 / 18%));
}
.app-error-fallback p { margin: .35rem 0 .8rem; color: var(--cb-text-secondary, #735b4a); }
.app-error-fallback button {
  min-height: 2.25rem;
  padding: 0 .9rem;
  color: var(--cb-text-inverse, #fff);
  background: var(--cb-color-coffee, #6f4e37);
  border: 0;
  border-radius: var(--cb-radius-pill, 999px);
}
</style>
