<script setup>
import { nextTick, ref, watch } from 'vue'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()
const triggerRef = ref(null)
watch(() => cartStore.itemCount, async (value, previous) => {
  if (value === previous) return
  await nextTick()
  const element = triggerRef.value?.$el || triggerRef.value
  element?.animate?.([
    { transform: 'scale(1)' },
    { transform: 'scale(1.08)' },
    { transform: 'scale(1)' },
  ], { duration: 180, easing: 'ease-out' })
})
</script>

<template>
  <RouterLink ref="triggerRef" class="cart-trigger" to="/cart" aria-label="购物车">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" />
      <circle cx="9.5" cy="20" r="1" />
      <circle cx="17.5" cy="20" r="1" />
    </svg>
    <span v-if="cartStore.itemCount > 0" class="cart-trigger__count">{{ cartStore.itemCount }}</span>
  </RouterLink>
</template>

<style scoped>
.cart-trigger {
  position: relative;
  display: inline-grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  color: var(--cb-text-secondary);
  border-radius: var(--cb-radius-pill);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.cart-trigger:hover,
.cart-trigger.router-link-active {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.cart-trigger svg {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.cart-trigger__count {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-grid;
  min-width: 1.125rem;
  height: 1.125rem;
  padding-inline: var(--cb-space-1);
  place-items: center;
  color: var(--cb-text-inverse);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  line-height: 1;
  background: var(--cb-color-caramel);
  border-radius: var(--cb-radius-pill);
}
</style>
