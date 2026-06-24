<script setup>
import CustomCursor from '@/components/common/CustomCursor.vue'
import { useMagnetic } from '@/composables/useMagnetic'

useMagnetic()
</script>

<template>
  <CustomCursor />
</template>
