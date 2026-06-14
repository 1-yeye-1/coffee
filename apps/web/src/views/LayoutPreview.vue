<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard } from '@/components/base'

const route = useRoute()
const layoutName = computed(() => route.meta.layoutPreview || 'PublicLayout')

const layouts = [
  {
    name: 'PublicLayout',
    description: 'Public storefront layout with header, content, and footer.',
    to: '/layout-preview',
  },
  {
    name: 'AuthLayout',
    description: 'Authentication layout for login and registration.',
    to: '/layout-preview/auth',
  },
  {
    name: 'MemberLayout',
    description: 'Account layout with member navigation and content.',
    to: '/account/layout-preview',
  },
]
</script>

<template>
  <section class="layout-preview cb-stack" aria-labelledby="layout-preview-title">
    <div class="cb-stack">
      <BaseBadge variant="premium">Layout System</BaseBadge>
      <h1 id="layout-preview-title" class="page-title">{{ layoutName }}</h1>
      <p class="page-subtitle">
        This page verifies public, auth, and member layout structure for the web app.
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
            {{ layout.name === layoutName ? 'Current Layout' : 'Preview Route' }}
          </BaseBadge>
          <h2>{{ layout.name }}</h2>
          <p>{{ layout.description }}</p>
          <BaseButton
            :variant="layout.name === layoutName ? 'secondary' : 'outline'"
            @click="$router.push(layout.to)"
          >
            View layout
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
