<script setup>
defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  hover: {
    type: Boolean,
    default: true,
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  emptyText: {
    type: String,
    default: '暂无数据',
  },
  caption: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="base-table-wrap">
    <table class="base-table">
      <caption v-if="caption" class="base-table__caption">
        {{ caption }}
      </caption>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="row in 3" :key="row">
            <td v-for="column in columns" :key="column.key">
              <span class="base-table__skeleton cb-skeleton" aria-hidden="true" />
            </td>
          </tr>
        </template>
        <template v-else-if="items.length">
          <tr
            v-for="(item, rowIndex) in items"
            :key="item[rowKey] ?? rowIndex"
            :class="{ 'base-table__row--hover': hover }"
          >
            <td v-for="column in columns" :key="column.key" :data-label="column.label">
              <slot :name="`cell-${column.key}`" :item="item" :value="item[column.key]">
                {{ item[column.key] }}
              </slot>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td class="base-table__empty" :colspan="Math.max(columns.length, 1)">
            <slot name="empty">{{ emptyText }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
    <span v-if="loading" class="base-table__loading-text" role="status">正在加载数据</span>
  </div>
</template>

<style scoped>
.base-table-wrap {
  position: relative;
  width: 100%;
  overflow-x: auto;
  background: var(--cb-bg-surface);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
  box-shadow: var(--cb-shadow-sm);
}

.base-table {
  min-width: 38rem;
  color: var(--cb-text-primary);
}

.base-table__caption {
  padding: var(--cb-space-4);
  color: var(--cb-text-secondary);
  text-align: start;
}

.base-table th,
.base-table td {
  padding: var(--cb-space-4);
  text-align: start;
  border-bottom: 0.0625rem solid var(--cb-border-soft);
}

.base-table th {
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  font-weight: var(--cb-font-semibold);
  background: var(--cb-bg-soft);
}

.base-table tbody tr:last-child td {
  border-bottom: 0;
}

.base-table__row--hover {
  transition: background-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.base-table__row--hover:hover {
  background: var(--cb-bg-soft);
}

.base-table__empty {
  padding-block: var(--cb-space-12) !important;
  color: var(--cb-text-muted);
  text-align: center !important;
}

.base-table__skeleton {
  display: block;
  width: 75%;
  height: 1rem;
}

.base-table__loading-text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
