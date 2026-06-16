<script setup>
defineProps({
  eyebrow: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  sections: {
    type: Array,
    required: true,
  },
  asideTitle: {
    type: String,
    default: '',
  },
  asideItems: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="info-page cb-fade-in">
    <section class="info-hero">
      <div class="cb-container info-hero__inner">
        <span class="section-eyebrow">{{ eyebrow }}</span>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle">{{ description }}</p>
      </div>
    </section>

    <main class="cb-container info-content">
      <article class="info-card">
        <section v-for="section in sections" :key="section.title" class="info-section">
          <h2>{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <ul v-if="section.items?.length" class="info-list">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>
      </article>

      <aside v-if="asideItems.length" class="info-aside">
        <h2>{{ asideTitle }}</h2>
        <div v-for="item in asideItems" :key="item.label" class="info-aside__item">
          <strong>{{ item.label }}</strong>
          <span>{{ item.value }}</span>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.info-page {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--cb-color-cream) 58%, transparent), transparent 28rem),
    var(--cb-bg-page);
}

.info-hero {
  padding: var(--cb-space-18) 0 var(--cb-space-10);
}

.info-hero__inner {
  display: grid;
  max-width: var(--cb-container-lg);
  gap: var(--cb-space-4);
}

.info-content {
  display: grid;
  gap: var(--cb-space-6);
  padding-bottom: var(--cb-space-18);
}

.info-card,
.info-aside {
  border: 0.0625rem solid color-mix(in srgb, var(--cb-border-soft) 82%, transparent);
  border-radius: var(--cb-radius-2xl);
  background: color-mix(in srgb, var(--cb-bg-surface) 92%, var(--cb-color-cream));
  box-shadow: var(--cb-shadow-md);
}

.info-card {
  display: grid;
  gap: var(--cb-space-7);
  padding: clamp(var(--cb-space-6), 4vw, var(--cb-space-10));
}

.info-section {
  display: grid;
  gap: var(--cb-space-3);
  padding-bottom: var(--cb-space-7);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.info-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.info-section h2,
.info-aside h2 {
  color: var(--cb-text-primary);
  font-family: var(--cb-font-display);
  font-size: var(--cb-font-size-2xl);
  line-height: var(--cb-line-tight);
}

.info-section p,
.info-list,
.info-aside__item span {
  color: var(--cb-text-secondary);
  line-height: var(--cb-line-relaxed);
}

.info-list {
  display: grid;
  gap: var(--cb-space-2);
  padding-left: var(--cb-space-5);
}

.info-list li::marker {
  color: var(--cb-color-gold);
}

.info-aside {
  display: grid;
  align-content: start;
  gap: var(--cb-space-5);
  padding: var(--cb-space-6);
}

.info-aside__item {
  display: grid;
  gap: var(--cb-space-1);
  padding: var(--cb-space-4);
  border-radius: var(--cb-radius-lg);
  background: color-mix(in srgb, var(--cb-color-cream) 54%, transparent);
}

.info-aside__item strong {
  color: var(--cb-color-coffee);
}

@media (min-width: 56rem) {
  .info-content {
    grid-template-columns: minmax(0, 1fr) 20rem;
    align-items: start;
  }
}
</style>
