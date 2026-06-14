<script setup>
defineProps({
  variant: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'avatar', 'card', 'table'].includes(value),
  },
  lines: {
    type: Number,
    default: 3,
  },
})
</script>

<template>
  <div class="base-skeleton" :class="`base-skeleton--${variant}`" aria-hidden="true">
    <template v-if="variant === 'text'">
      <span v-for="line in lines" :key="line" class="base-skeleton__line cb-skeleton" />
    </template>
    <span v-else-if="variant === 'avatar'" class="base-skeleton__avatar cb-skeleton" />
    <template v-else-if="variant === 'card'">
      <span class="base-skeleton__media cb-skeleton" />
      <span class="base-skeleton__line cb-skeleton" />
      <span class="base-skeleton__line base-skeleton__line--short cb-skeleton" />
    </template>
    <template v-else>
      <span v-for="row in lines" :key="row" class="base-skeleton__row">
        <span v-for="cell in 3" :key="cell" class="base-skeleton__cell cb-skeleton" />
      </span>
    </template>
  </div>
</template>

<style scoped>
.base-skeleton {
  width: 100%;
}

.base-skeleton--text,
.base-skeleton--card,
.base-skeleton--table {
  display: grid;
  gap: var(--cb-space-3);
}

.base-skeleton--card {
  padding: var(--cb-space-4);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
}

.base-skeleton__line {
  display: block;
  width: 100%;
  height: 1rem;
}

.base-skeleton__line:last-child,
.base-skeleton__line--short {
  width: 68%;
}

.base-skeleton__avatar {
  display: block;
  width: 3rem;
  height: 3rem;
  border-radius: var(--cb-radius-pill);
}

.base-skeleton__media {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--cb-radius-xl);
}

.base-skeleton__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(5rem, 1fr));
  gap: var(--cb-space-3);
  padding-block: var(--cb-space-2);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.base-skeleton__cell {
  height: 1rem;
}
</style>

