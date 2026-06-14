<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  siblingCount: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const pages = computed(() => {
  const total = Math.max(1, props.totalPages)
  const start = Math.max(1, props.modelValue - props.siblingCount)
  const end = Math.min(total, props.modelValue + props.siblingCount)
  const result = []

  if (start > 1) result.push(1)
  if (start > 2) result.push('start-ellipsis')
  for (let page = start; page <= end; page += 1) result.push(page)
  if (end < total - 1) result.push('end-ellipsis')
  if (end < total) result.push(total)

  return result
})

function selectPage(page) {
  const nextPage = Math.min(Math.max(page, 1), Math.max(props.totalPages, 1))
  if (nextPage === props.modelValue) return
  emit('update:modelValue', nextPage)
  emit('change', nextPage)
}
</script>

<template>
  <nav class="base-pagination" aria-label="分页导航">
    <button
      class="base-pagination__button base-pagination__control"
      type="button"
      :disabled="modelValue <= 1"
      aria-label="上一页"
      @click="selectPage(modelValue - 1)"
    >
      上一页
    </button>
    <template v-for="page in pages" :key="page">
      <span v-if="typeof page === 'string'" class="base-pagination__ellipsis" aria-hidden="true">
        …
      </span>
      <button
        v-else
        class="base-pagination__button"
        :class="{ 'base-pagination__button--active': page === modelValue }"
        type="button"
        :aria-label="`第 ${page} 页`"
        :aria-current="page === modelValue ? 'page' : undefined"
        @click="selectPage(page)"
      >
        {{ page }}
      </button>
    </template>
    <button
      class="base-pagination__button base-pagination__control"
      type="button"
      :disabled="modelValue >= totalPages"
      aria-label="下一页"
      @click="selectPage(modelValue + 1)"
    >
      下一页
    </button>
  </nav>
</template>

<style scoped>
.base-pagination {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: center;
}

.base-pagination__button {
  display: inline-grid;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: var(--cb-space-2);
  place-items: center;
  color: var(--cb-text-secondary);
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-md);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard),
    border-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-pagination__button:hover:not(:disabled) {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
  border-color: var(--cb-border-strong);
}

.base-pagination__button--active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
  border-color: var(--cb-color-coffee);
}

.base-pagination__button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.base-pagination__control {
  padding-inline: var(--cb-space-4);
}

.base-pagination__ellipsis {
  min-width: 1.5rem;
  color: var(--cb-text-muted);
  text-align: center;
}

@media (max-width: 39.999rem) {
  .base-pagination__control {
    font-size: 0;
  }

  .base-pagination__control::before {
    font-size: var(--cb-font-size-md);
    content: "‹";
  }

  .base-pagination__control:last-child::before {
    content: "›";
  }
}
</style>

