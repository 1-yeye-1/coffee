<script setup>
import { ref } from 'vue'
import { useCursorMotion } from '../../../../shared/motion/useCursorMotion.js'

const root = ref(null)
const dot = ref(null)
const ring = ref(null)
const label = ref(null)
const trail = ref([])
useCursorMotion({ root, dot, ring, label, trail })
</script>

<template>
  <div ref="root" class="custom-cursor" data-theme="system" aria-hidden="true">
    <i v-for="index in 6" :key="index" ref="trail" class="cursor-trail" :style="{ '--trail-index': index }" />
    <span ref="dot" class="cursor-dot" />
    <span ref="ring" class="cursor-ring"><span ref="label" class="cursor-label" /></span>
  </div>
</template>
