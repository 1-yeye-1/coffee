<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { searchAll } from '@/api/search'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const router = useRouter()
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
const resultState = computed(() => {
  if (error.value) return 'error'
  if (loading.value) return 'loading'
  if (searched.value && total.value === 0) return 'empty'
  if (total.value) return 'results'
  return 'hint'
})
let searchTimer
let searchSequence = 0

function close() {
  emit('update:modelValue', false)
}

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
  close()
  await router.push(group.path(item))
}
</script>

<template>
  <BaseModal :model-value="props.modelValue" title="搜索 Coffee Book" @update:model-value="emit('update:modelValue', $event)">
    <div class="search-panel">
      <form class="search-panel__form" @submit.prevent="submit({ allowSingleNavigate: true })">
        <BaseInput v-model="keyword" label="搜索" placeholder="搜索商品、图书、活动或社区内容" search autofocus />
        <BaseButton type="submit" :loading="loading">搜索</BaseButton>
      </form>
      <Transition name="search-results" mode="out-in">
        <div :key="resultState" class="search-panel__feedback" role="status" aria-live="polite">
          <p v-if="error" class="search-panel__error">{{ error }}</p>
          <div v-else-if="loading" class="search-panel__loading">
            <span class="cb-spin" aria-hidden="true" />
            <span>正在搜索...</span>
          </div>
          <EmptyState v-else-if="searched && total === 0" title="没有找到结果" description="换一个关键词试试。" />
          <div v-else-if="total" class="search-results">
            <section v-for="group in groups" :key="group.key" v-show="results[group.key].length" class="search-group">
              <h3>{{ group.label }}</h3>
              <button v-for="item in results[group.key]" :key="item.id" type="button" @click="visit(group, item)">
                <strong>{{ item.title }}</strong>
                <small>{{ item.summary || '查看详情' }}</small>
              </button>
            </section>
          </div>
          <p v-else class="text-muted">输入关键词后将自动搜索。</p>
        </div>
      </Transition>
    </div>
  </BaseModal>
</template>

<style scoped>
.search-panel,.search-results,.search-group,.search-panel__feedback { display:grid; gap:var(--cb-space-4); }
.search-panel__form { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--cb-space-3); align-items:end; }
.search-panel__error { padding:var(--cb-space-3); color:var(--cb-danger); background:color-mix(in srgb,var(--cb-danger) 10%,transparent); border-radius:var(--cb-radius-lg); }
.search-panel__loading { display:flex; min-height:3rem; gap:var(--cb-space-3); align-items:center; color:var(--cb-text-muted); }
.search-panel__loading .cb-spin { width:1rem; height:1rem; border:.125rem solid var(--cb-border-strong); border-top-color:var(--cb-color-coffee); border-radius:50%; }
.search-group h3 { font-size:var(--cb-font-size-lg); }
.search-group button { display:grid; gap:var(--cb-space-1); padding:var(--cb-space-3); color:var(--cb-text-primary); text-align:left; background:var(--cb-bg-soft); border:0.0625rem solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); transition:border-color var(--cb-motion-quick) var(--cb-ease-standard),box-shadow var(--cb-motion-quick) var(--cb-ease-standard),transform var(--cb-motion-quick) var(--cb-motion-enter); }
.search-group button:hover { border-color:var(--cb-border-strong); transform:translateY(-1px); }
.search-group small { overflow:hidden; color:var(--cb-text-muted); text-overflow:ellipsis; white-space:nowrap; }
.search-results-enter-active,.search-results-leave-active { transition:opacity var(--cb-motion-quick) var(--cb-ease-standard),transform var(--cb-motion-base) var(--cb-motion-enter),clip-path var(--cb-motion-base) var(--cb-motion-enter); }
.search-results-enter-from,.search-results-leave-to { opacity:0; clip-path:inset(0 0 100%); transform:translateY(-.4rem); }
.search-results-enter-to,.search-results-leave-from { opacity:1; clip-path:inset(0); transform:translateY(0); }
@media(max-width:35rem){.search-panel__form{grid-template-columns:1fr;}}
@media(prefers-reduced-motion:reduce){.search-results-enter-active,.search-results-leave-active,.search-group button{transition-duration:.01ms!important}.search-results-enter-from,.search-results-leave-to{transform:none}.search-group button:hover{transform:none}}
</style>
