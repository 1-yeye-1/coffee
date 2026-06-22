<script setup>
import { useMagnetic } from '@/composables/useMagnetic'
import CustomCursor from '@/components/common/CustomCursor.vue'

useMagnetic()
</script>

<template>
  <RouterView />
  <CustomCursor />
</template>
