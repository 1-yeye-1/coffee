<script setup>
defineProps({
  currentStep: { type: Number, default: 1 },
  step: { type: Number, default: null },
})

const steps = ['选择对象', '选择日期时间', '确认信息', '提交预约']
</script>

<template>
  <nav class="booking-progress" aria-label="预约进度">
    <span v-for="(label, index) in steps" :key="label" :class="{ 'is-active': (step || currentStep) >= index + 1 }">
      <i>{{ index + 1 }}</i>{{ label }}
    </span>
  </nav>
</template>
