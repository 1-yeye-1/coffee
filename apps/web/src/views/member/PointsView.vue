<script setup>
import { computed, onMounted, ref } from 'vue'

import { getPointRecords } from '@/api/account'
import { BaseBadge, BaseTable, ErrorPanel } from '@/components/base'
import '@/assets/styles/pages/engagement.css'

const records = ref([])
const error = ref('')
const columns = [
  { key: 'description', label: '说明' },
  { key: 'source', label: '来源' },
  { key: 'points', label: '积分' },
  { key: 'createdAt', label: '时间' },
]
const total = computed(() => records.value.reduce((sum, item) => sum + Number(item.points || 0), 0))

async function load() {
  error.value = ''
  try {
    records.value = (await getPointRecords()).data
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">Points</span>
      <h2 class="page-title">积分记录</h2>
      <p class="page-subtitle">积分明细与数据库 user_points 表同步。</p>
    </header>

    <ErrorPanel v-if="error" :message="error" @retry="load" />
    <section class="member-panel">
      <BaseBadge variant="premium">累计变动 {{ total }} 积分</BaseBadge>
    </section>
    <BaseTable :columns="columns" :items="records" empty-text="暂无积分记录">
      <template #cell-points="{ value }">
        <strong>{{ Number(value) > 0 ? `+${value}` : value }}</strong>
      </template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleString('zh-CN') }}</template>
    </BaseTable>
  </div>
</template>
