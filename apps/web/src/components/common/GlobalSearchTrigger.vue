<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { searchAll } from '@/api/search'
import { BaseButton, BaseInput, BaseModal, EmptyState } from '@/components/base'

const router = useRouter()
const open = ref(false)
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const results = ref({ products: [], books: [], events: [], posts: [] })
const groups = computed(() => [
  { key: 'products', label: '商品', path: (item) => `/coffee/${item.slug}` },
  { key: 'books', label: '图书', path: (item) => `/books/${item.slug}` },
  { key: 'events', label: '活动', path: (item) => `/events/${item.slug}` },
  { key: 'posts', label: '社区', path: (item) => `/community/${item.slug}` },
])
const total = computed(() => groups.value.reduce((sum, group) => sum + results.value[group.key].length, 0))
let searchTimer
let searchSequence = 0

async function submit({ allowSingleNavigate = false } = {}) {
  error.value = ''
  if (!keyword.value.trim()) {
    error.value = '请输入关键词'
    return
  }
  loading.value = true
  searched.value = true
  const sequence = ++searchSequence
  try {
    const data = (await searchAll(keyword.value.trim())).data
    if (sequence !== searchSequence) return
    results.value = data
    if (allowSingleNavigate && total.value === 1) {
      const group = groups.value.find((item) => results.value[item.key].length)
      await visit(group, results.value[group.key][0])
    }
  } catch (requestError) {
    error.value = requestError.message || '搜索失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(keyword, (value) => {
  clearTimeout(searchTimer)
  error.value = ''
  if (!value.trim()) {
    searched.value = false
    results.value = { products: [], books: [], events: [], posts: [] }
    return
  }
  searchTimer = setTimeout(() => submit(), 300)
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  searchSequence += 1
})

async function visit(group, item) {
  open.value = false
  await router.push(group.path(item))
}
</script>

<template>
  <button class="search-trigger" type="button" aria-label="打开全站搜索" title="全站搜索" @click="open = true">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  </button>

  <BaseModal v-model="open" title="搜索 Coffee Book">
    <div class="search-panel">
      <form class="search-panel__form" @submit.prevent="submit({ allowSingleNavigate: true })">
        <BaseInput v-model="keyword" label="搜索" placeholder="搜索商品、图书、活动或社区内容" search autofocus />
        <BaseButton type="submit" :loading="loading">搜索</BaseButton>
      </form>
      <p v-if="error" class="search-panel__error">{{ error }}</p>
      <p v-if="loading" class="text-muted">正在搜索...</p>
      <EmptyState v-else-if="searched && total === 0 && !error" title="没有找到结果" description="换一个关键词试试。" />
      <div v-else-if="total" class="search-results">
        <section v-for="group in groups" :key="group.key" v-show="results[group.key].length" class="search-group">
          <h3>{{ group.label }}</h3>
          <button v-for="item in results[group.key]" :key="item.id" type="button" @click="visit(group, item)">
            <strong>{{ item.title }}</strong><small>{{ item.summary || '查看详情' }}</small>
          </button>
        </section>
      </div>
      <p v-else class="text-muted">输入关键词后将自动搜索。</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.search-trigger { display:inline-grid; width:2.75rem; height:2.75rem; padding:0; place-items:center; color:var(--cb-text-secondary); background:transparent; border:0; border-radius:var(--cb-radius-pill); }
.search-trigger:hover { color:var(--cb-text-primary); background:var(--cb-bg-soft); }
.search-trigger svg { width:1.25rem; fill:none; stroke:currentcolor; stroke-linecap:round; stroke-width:1.75; }
.search-panel,.search-results,.search-group { display:grid; gap:var(--cb-space-4); }
.search-panel__form { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--cb-space-3); align-items:end; }
.search-panel__error { padding:var(--cb-space-3); color:var(--cb-danger); background:color-mix(in srgb,var(--cb-danger) 10%,transparent); border-radius:var(--cb-radius-lg); }
.search-group h3 { font-size:var(--cb-font-size-lg); }
.search-group button { display:grid; gap:var(--cb-space-1); padding:var(--cb-space-3); color:var(--cb-text-primary); text-align:left; background:var(--cb-bg-soft); border:0.0625rem solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); }
.search-group button:hover { border-color:var(--cb-border-strong); transform:translateY(-1px); }
.search-group small { overflow:hidden; color:var(--cb-text-muted); text-overflow:ellipsis; white-space:nowrap; }
@media(max-width:35rem){.search-panel__form{grid-template-columns:1fr;}}
</style>
