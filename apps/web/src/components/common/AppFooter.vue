<script setup>
import { BaseButton, BaseInput } from '@/components/base'

import LayoutShell from './LayoutShell.vue'
</script>

<template>
  <footer class="app-footer">
    <LayoutShell class="app-footer__grid">
      <section class="app-footer__brand">
        <RouterLink class="app-footer__logo" to="/">Coffee Book</RouterLink>
        <p>一个融合精品咖啡、精选阅读与创作者社区的现代文化空间。</p>
      </section>

      <nav aria-label="内容探索">
        <h2>内容探索</h2>
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/coffee">咖啡</RouterLink>
        <RouterLink to="/books">图书</RouterLink>
        <RouterLink to="/events">活动</RouterLink>
        <RouterLink to="/community">社区</RouterLink>
      </nav>

      <nav aria-label="服务支持">
        <h2>服务支持</h2>
        <RouterLink to="/booking">空间预约</RouterLink>
        <RouterLink to="/help">帮助中心</RouterLink>
        <RouterLink to="/about">关于我们</RouterLink>
        <RouterLink to="/contact">联系我们</RouterLink>
        <RouterLink to="/privacy">隐私政策</RouterLink>
        <RouterLink to="/terms">服务条款</RouterLink>
      </nav>

      <section class="app-footer__newsletter">
        <h2>Newsletter</h2>
        <p>订阅每周精选图书、咖啡与活动灵感。</p>
        <form class="app-footer__form" @submit.prevent>
          <BaseInput type="email" aria-label="Newsletter 邮箱" placeholder="Email address" />
          <BaseButton type="submit">订阅</BaseButton>
        </form>
      </section>
    </LayoutShell>

    <LayoutShell class="app-footer__bottom">
      <small>© 2026 Coffee Book. All rights reserved.</small>
      <small>hello@coffeebook.example · Shanghai</small>
    </LayoutShell>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: auto;
  color: var(--cb-text-secondary);
  background: var(--cb-bg-surface);
  border-top: 0.0625rem solid var(--cb-border-soft);
}

.app-footer__grid {
  display: grid;
  gap: var(--cb-space-10);
  padding-block: var(--cb-space-16);
}

.app-footer__brand,
.app-footer__newsletter,
.app-footer nav {
  display: flex;
  flex-direction: column;
  gap: var(--cb-space-3);
}

.app-footer__logo {
  color: var(--cb-text-primary);
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-2xl);
  font-weight: var(--cb-font-bold);
}

.app-footer h2 {
  font-family: var(--cb-font-body);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-footer nav a {
  width: fit-content;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
}

.app-footer nav a:hover {
  color: var(--cb-color-coffee);
}

.app-footer__form {
  display: grid;
  gap: var(--cb-space-2);
}

.app-footer__bottom {
  display: flex;
  padding-block: var(--cb-space-5);
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  justify-content: space-between;
  border-top: 0.0625rem solid var(--cb-border-soft);
}

@media (min-width: 40rem) {
  .app-footer__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .app-footer__form {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (min-width: 64rem) {
  .app-footer__grid {
    grid-template-columns: 1.35fr 0.75fr 0.75fr 1.25fr;
  }
}
</style>
