<script setup>
import AppCursor from '@/components/motion/AppCursor.vue'
import { useMagnetic } from '@/composables/useMagnetic'

useMagnetic()
</script>

<template>
  <AppCursor />
  <RouterView />
</template>
