<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title ?? 'Coffee Book')
</script>

<template>
  <section class="placeholder-view cb-stack cb-fade-in" aria-labelledby="page-title">
    <div class="placeholder-view__intro cb-stack">
      <span class="section-eyebrow">Coffee Book Design System</span>
      <h1 id="page-title" class="page-title">{{ title }}</h1>
      <p class="page-subtitle">
        当前为项目结构占位视图，用于验证全局字体、颜色、间距、主题和基础视觉规范。
      </p>
    </div>

    <article class="placeholder-view__card cb-card-surface cb-stack cb-hover-lift">
      <span class="cb-badge">Design System Ready</span>
      <h2 class="section-title">统一而克制的视觉基础</h2>
      <p>
        后续页面与组件将使用同一套 Coffee Book Token 构建，确保前台与后台拥有一致的体验。
      </p>
      <div class="cb-cluster">
        <button class="cb-button" type="button">Primary Action</button>
        <small>Phase 2 visual verification</small>
      </div>
    </article>
  </section>
</template>
