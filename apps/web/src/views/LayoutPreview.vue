<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard } from '@/components/base'

const route = useRoute()
const layoutName = computed(() => route.meta.layoutPreview || 'PublicLayout')

const layouts = [
  {
    name: 'PublicLayout',
    description: '前台公共布局，包含顶部导航、内容区和页脚。',
    to: '/layout-preview',
  },
  {
    name: 'AuthLayout',
    description: '登录与注册使用的认证布局。',
    to: '/layout-preview/auth',
  },
  {
    name: 'MemberLayout',
    description: '会员中心布局，包含会员导航和内容区。',
    to: '/account/layout-preview',
  },
]
</script>

<template>
  <section class="layout-preview cb-stack" aria-labelledby="layout-preview-title">
    <div class="cb-stack">
      <BaseBadge variant="premium">布局系统</BaseBadge>
      <h1 id="layout-preview-title" class="page-title">{{ layoutName }}</h1>
      <p class="page-subtitle">
        此页面用于验证前台、认证和会员中心布局结构。
      </p>
    </div>

    <div class="cb-grid-2">
      <BaseCard
        v-for="layout in layouts"
        :key="layout.name"
        :variant="layout.name === layoutName ? 'elevated' : 'hover'"
      >
        <div class="cb-stack">
          <BaseBadge :variant="layout.name === layoutName ? 'success' : 'neutral'">
            {{ layout.name === layoutName ? '当前布局' : '预览路由' }}
          </BaseBadge>
          <h2>{{ layout.name }}</h2>
          <p>{{ layout.description }}</p>
          <BaseButton
            :variant="layout.name === layoutName ? 'secondary' : 'outline'"
            @click="$router.push(layout.to)"
          >
            查看布局
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<style scoped>
.layout-preview {
  width: 100%;
  max-width: var(--cb-container-lg);
  margin-inline: auto;
  padding: clamp(var(--cb-space-8), 8vw, var(--cb-space-20)) var(--cb-space-4);
  gap: var(--cb-space-10);
}
</style>
