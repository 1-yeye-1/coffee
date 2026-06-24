<script setup>
import { onMounted, ref, watch } from 'vue'

import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useTiltCard } from '@/composables/useTiltCard'

const props = defineProps({
  statsValues: {
    type: Array,
    default: () => [],
  },
})

const homeRoot = ref(null)
const initialized = ref(false)
const { revealCards, revealOnScroll, floatVisual, bindParallax } = useGsapReveal(homeRoot)
const { animateCounts } = useGsapNumber()
const { bindTiltCards } = useTiltCard(homeRoot)
const perfEnabled = import.meta.env.DEV || import.meta.env.VITE_HOME_PERF === '1'

function runIdle(callback) {
  if (typeof window === 'undefined') return callback()
  if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout: 360 })
  return window.setTimeout(callback, 32)
}

function logHomePerf(label, startedAt) {
  if (!perfEnabled || typeof performance === 'undefined') return
  console.info(`[home-perf] ${label}: ${Math.round(performance.now() - startedAt)}ms`)
}

function animateStats() {
  animateCounts(homeRoot.value?.querySelectorAll('[data-count]') || [], props.statsValues, { suffix: '+' })
}

function initializeHomeMotion(startedAt) {
  homeRoot.value = document.querySelector('.home-view')
  if (!homeRoot.value || initialized.value) return
  initialized.value = true
  // Phase 1: critical — hero stagger and stats (blocking perception)
  revealCards('.hero__stagger', { key: 'hero', y: 18, duration: 0.48, stagger: 0.045 })
  animateStats()
  // Phase 2: visible — scroll reveals (triggers as user scrolls)
  revealOnScroll('[data-reveal]', { limit: 14, y: 16, duration: 0.24 })
  // Phase 3: deferred — decoration-only animations (no user impact on LCP)
  runIdle(() => {
    floatVisual('.hero-art__card')
    bindParallax('.hero', '.hero-art')
  })
  // Phase 4: expensive — pointer-based tilt (heavy event listeners)
  runIdle(() => bindTiltCards())
  logHomePerf('animation-init', startedAt)
}

onMounted(() => {
  const startedAt = performance.now()
  logHomePerf('motion-loaded', startedAt)
  window.requestAnimationFrame(() => initializeHomeMotion(startedAt))
})

watch(() => props.statsValues, () => {
  if (initialized.value) animateStats()
}, { deep: true })
</script>

<template></template>
