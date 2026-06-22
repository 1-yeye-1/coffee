<script setup>
defineProps({
  currentStep: { type: Number, default: 1 },
})

const steps = ['选择日期', '选择时间', '选择座位', '确认预约']
</script>

<template>
  <nav class="booking-progress" aria-label="预约进度">
    <span v-for="(label, index) in steps" :key="label" :class="{ 'is-active': currentStep >= index + 1 }">
      <i>{{ index + 1 }}</i>{{ label }}
    </span>
  </nav>
</template>
