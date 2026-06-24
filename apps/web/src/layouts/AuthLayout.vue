<script setup>
import ThemeToggle from '@/components/common/ThemeToggle.vue'
</script>

<template>
  <div class="auth-layout">
    <section class="auth-layout__brand">
      <div class="auth-layout__brand-content cb-stack">
        <RouterLink class="auth-layout__logo" to="/">Coffee Book</RouterLink>
        <span class="section-eyebrow">Coffee & Culture</span>
        <h1>Your Sanctuary for Coffee & Culture.</h1>
        <p>
          加入阅读者、创作者与咖啡爱好者共同构成的现代文化社区。
        </p>
      </div>
    </section>

    <section class="auth-layout__content">
      <div class="auth-layout__toolbar">
        <RouterLink to="/">返回首页</RouterLink>
        <ThemeToggle />
      </div>
      <div class="auth-layout__view">
        <RouterView v-slot="{ Component, route }">
          <Transition name="route-page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-layout {
  display: grid;
  min-height: 100vh;
  color: var(--cb-text-primary);
  background: var(--cb-bg-page);
}

.auth-layout__brand {
  display: flex;
  min-height: 18rem;
  padding: var(--cb-space-8) var(--cb-space-5);
  align-items: flex-end;
  background:
    linear-gradient(
      color-mix(in srgb, var(--cb-bg-dark) 42%, transparent),
      color-mix(in srgb, var(--cb-bg-dark) 72%, transparent)
    ),
    var(--cb-color-coffee);
}

.auth-layout__brand-content {
  max-width: 38rem;
}

.auth-layout__brand h1,
.auth-layout__brand p,
.auth-layout__logo {
  color: var(--cb-color-ivory);
}

.auth-layout__brand h1 {
  font-size: clamp(var(--cb-font-size-4xl), 6vw, var(--cb-font-size-display));
}

.auth-layout__logo {
  width: fit-content;
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-2xl);
  font-weight: var(--cb-font-bold);
}

.auth-layout__content {
  display: flex;
  min-width: 0;
  min-height: 32rem;
  flex-direction: column;
  overflow-y: auto;
}

.auth-layout__toolbar {
  display: flex;
  min-height: 4.5rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
}

.auth-layout__toolbar a {
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
}

.auth-layout__view {
  display: grid;
  width: 100%;
  max-width: var(--cb-container-sm);
  margin: 0 auto auto;
  padding: var(--cb-space-4);
}

@media (min-width: 64rem) {
  .auth-layout {
    grid-template-columns: minmax(24rem, 1fr) minmax(28rem, 0.9fr);
  }

  .auth-layout__brand {
    min-height: 100vh;
    padding: var(--cb-space-16);
  }

  .auth-layout__toolbar {
    flex: 0 0 auto;
    padding-inline: var(--cb-space-8);
  }

  .auth-layout__view {
    align-content: start;
    padding: var(--cb-space-4) var(--cb-space-8) var(--cb-space-8);
  }
}
</style>
