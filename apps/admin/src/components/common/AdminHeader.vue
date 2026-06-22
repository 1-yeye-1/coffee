<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import { searchAdmin } from '@/api/admin'

import ThemeToggle from './ThemeToggle.vue'

defineProps({
  collapsed: Boolean,
})

defineEmits(['toggle-sidebar', 'toggle-mobile'])

const adminMenuOpen = ref(false)
const searchOpen = ref(false)
const noticeOpen = ref(false)
const keyword = ref('')
const router = useRouter()
const adminStore = useAdminStore()
const authStore = useAuthStore()
const searchLoading = ref(false)
const searchError = ref('')
const searchResults = ref({ products: [], orders: [], users: [], posts: [], books: [], events: [], bookings: [] })
const searchGroups = [
  { key: 'products', label: '商品' }, { key: 'orders', label: '订单' }, { key: 'users', label: '用户' },
  { key: 'posts', label: '社区' }, { key: 'books', label: '图书' }, { key: 'events', label: '活动' },
  { key: 'bookings', label: '预约' },
]
const searchTotal = computed(() => searchGroups.reduce((sum, group) => sum + searchResults.value[group.key].length, 0))
let searchTimer
let searchSequence = 0
const pendingOrders = computed(() => adminStore.orders.filter((item) => item.status === 'pending_review').length)
const pendingBookings = computed(() => adminStore.bookings.filter((item) => item.status === 'pending').length)
const pendingPosts = computed(() => Number(adminStore.dashboardStats.pendingPosts || 0))
const pendingTotal = computed(() => pendingOrders.value + pendingBookings.value + pendingPosts.value)
const searchTargets = [
  { label: '商品', path: '/products' }, { label: '订单', path: '/orders' }, { label: '用户', path: '/users' },
  { label: '社区', path: '/community' }, { label: '活动', path: '/events' }, { label: '图书', path: '/books' },
]

async function openNotices() {
  noticeOpen.value = !noticeOpen.value
  searchOpen.value = false
  if (noticeOpen.value) await Promise.all([adminStore.fetchDashboard(), adminStore.fetchAdminOrders(), adminStore.fetchAdminBookings()])
}

async function go(path) {
  searchOpen.value = false
  noticeOpen.value = false
  await router.push({ path, query: keyword.value.trim() ? { keyword: keyword.value.trim() } : {} })
}

async function runSearch() {
  const value = keyword.value.trim()
  if (!value) return
  const sequence = ++searchSequence
  searchLoading.value = true
  searchError.value = ''
  try {
    const data = (await searchAdmin(value)).data
    if (sequence === searchSequence) searchResults.value = data
  } catch (error) {
    if (sequence === searchSequence) searchError.value = error.message
  } finally {
    if (sequence === searchSequence) searchLoading.value = false
  }
}

watch(keyword, (value) => {
  clearTimeout(searchTimer)
  searchError.value = ''
  if (!value.trim()) {
    searchResults.value = { products: [], orders: [], users: [], posts: [], books: [], events: [], bookings: [] }
    return
  }
  searchTimer = setTimeout(runSearch, 300)
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  searchSequence += 1
})

async function openResult(item) {
  searchOpen.value = false
  await router.push({ path: item.path, query: { keyword: item.title } })
}

async function logout() {
  adminMenuOpen.value = false
  await authStore.logout()
  await router.push('/login')
}
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__left">
      <button
        class="admin-header__mobile-menu"
        type="button"
        aria-label="打开后台菜单"
        @click="$emit('toggle-mobile')"
      >
        ☰
      </button>
      <button
        class="admin-header__collapse"
        type="button"
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="$emit('toggle-sidebar')"
      >
        {{ collapsed ? '→' : '←' }}
      </button>
      <div>
        <strong>后台管理</strong>
        <small>运营工作台</small>
      </div>
    </div>

    <div class="admin-header__actions">
      <button class="admin-header__icon-button" type="button" aria-label="后台搜索" @click="searchOpen = !searchOpen; noticeOpen = false">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
      <button class="admin-header__icon-button" type="button" aria-label="通知" @click="openNotices">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        <span v-if="pendingTotal" class="admin-header__dot" />
      </button>
      <div v-if="searchOpen" class="admin-header__popover admin-header__search">
        <label><span>后台搜索</span><input v-model="keyword" type="search" placeholder="搜索商品、订单、用户、内容或预约" /></label>
        <p v-if="searchLoading">正在搜索...</p>
        <p v-else-if="searchError" class="form-error">{{ searchError }}</p>
        <div v-else-if="searchTotal" class="admin-search-results">
          <section v-for="group in searchGroups" :key="group.key" v-show="searchResults[group.key].length">
            <strong>{{ group.label }}</strong>
            <button v-for="item in searchResults[group.key]" :key="`${group.key}-${item.id}`" type="button" @click="openResult(item)"><span>{{ item.title }}</span><small>{{ item.meta }}</small></button>
          </section>
        </div>
        <p v-else-if="keyword.trim()">暂无匹配结果</p>
        <div class="admin-search-shortcuts"><button v-for="item in searchTargets" :key="item.path" type="button" @click="go(item.path)">在{{ item.label }}中搜索</button></div>
      </div>
      <div v-if="noticeOpen" class="admin-header__popover admin-header__notices">
        <strong>待办事项</strong>
        <button v-if="pendingPosts" type="button" @click="go('/community')">待审核社区内容 <b>{{ pendingPosts }}</b></button>
        <button v-if="pendingOrders" type="button" @click="go('/orders')">待审核支付订单 <b>{{ pendingOrders }}</b></button>
        <button v-if="pendingBookings" type="button" @click="go('/bookings')">待处理预约 <b>{{ pendingBookings }}</b></button>
        <p v-if="pendingTotal === 0">暂无待处理事项</p>
      </div>
      <ThemeToggle />
      <div class="admin-header__profile">
        <button
          class="admin-header__profile-trigger"
          type="button"
          :aria-expanded="adminMenuOpen"
          aria-haspopup="menu"
          @click="adminMenuOpen = !adminMenuOpen"
        >
          <span class="admin-header__avatar">A</span>
          <span class="admin-header__profile-copy">
            <strong>管理员</strong>
            <small>后台账号</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
        <div v-if="adminMenuOpen" class="admin-header__menu" role="menu">
          <span>{{ authStore.user?.nickname || authStore.user?.username || '管理员' }}</span>
          <button type="button" role="menuitem" @click="logout">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: sticky;
  z-index: var(--cb-z-sticky);
  top: 0;
  display: flex;
  min-height: 4.75rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-4);
  background: color-mix(in srgb, var(--cb-bg-surface) 90%, transparent);
  border-bottom: 0.0625rem solid var(--cb-border-soft);
  backdrop-filter: blur(var(--cb-space-3));
}

.admin-header__left,
.admin-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--cb-space-2);
}

.admin-header__left > div {
  display: none;
}

.admin-header__left strong,
.admin-header__left small,
.admin-header__profile-copy {
  display: block;
}

.admin-header__left small,
.admin-header__profile-copy small {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-xs);
}

.admin-header__collapse,
.admin-header__mobile-menu,
.admin-header__icon-button {
  position: relative;
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  background: transparent;
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
}

.admin-header__collapse:hover,
.admin-header__mobile-menu:hover,
.admin-header__icon-button:hover {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}

.admin-header__mobile-menu {
  display: inline-grid;
}

.admin-header__icon-button svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.admin-header__dot {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 0.45rem;
  height: 0.45rem;
  background: var(--cb-danger);
  border-radius: var(--cb-radius-pill);
}

.admin-header__profile {
  position: relative;
}
.admin-header__actions { position:relative; }
.admin-header__popover { position:absolute; z-index:var(--cb-z-dropdown); top:calc(100% + var(--cb-space-3)); right:0; display:grid; width:min(22rem,calc(100vw - 2rem)); padding:var(--cb-space-4); gap:var(--cb-space-3); color:var(--cb-text-primary); background:var(--cb-bg-elevated); border:0.0625rem solid var(--cb-border-soft); border-radius:var(--cb-radius-lg); box-shadow:var(--cb-shadow-lg); }
.admin-header__popover label,.admin-header__popover label span { display:grid; gap:var(--cb-space-2); }
.admin-header__popover input { min-height:2.5rem; padding:0 var(--cb-space-3); color:var(--cb-text-primary); background:var(--cb-bg-surface); border:0.0625rem solid var(--cb-border-strong); border-radius:var(--cb-radius-lg); }
.admin-header__search>div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--cb-space-2); }
.admin-header__search .admin-search-results { display:grid; max-height:24rem; grid-template-columns:1fr; overflow:auto; }
.admin-search-results section { display:grid; gap:var(--cb-space-1); }
.admin-search-results button { display:grid; }
.admin-search-results small { color:var(--cb-text-muted); }
.admin-search-shortcuts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--cb-space-2); padding-top:var(--cb-space-2); border-top:0.0625rem solid var(--cb-border-soft); }
.admin-header__popover button { padding:var(--cb-space-2) var(--cb-space-3); color:var(--cb-text-primary); text-align:left; background:var(--cb-bg-soft); border:0; border-radius:var(--cb-radius-md); }
.admin-header__notices b { float:right; color:var(--cb-danger); }
.admin-header__notices p { color:var(--cb-text-muted); }

.admin-header__profile-trigger {
  display: flex;
  min-height: 2.5rem;
  padding: var(--cb-space-1) var(--cb-space-2);
  align-items: center;
  gap: var(--cb-space-2);
  color: var(--cb-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-lg);
}

.admin-header__profile-trigger:hover {
  background: var(--cb-bg-soft);
}

.admin-header__avatar {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  color: var(--cb-text-inverse);
  font-weight: var(--cb-font-bold);
  background: var(--cb-color-coffee);
  border-radius: var(--cb-radius-pill);
}

.admin-header__profile-copy {
  display: none;
  text-align: left;
}

.admin-header__menu {
  position: absolute;
  top: calc(100% + var(--cb-space-2));
  right: 0;
  display: grid;
  min-width: 10rem;
  padding: var(--cb-space-2);
  background: var(--cb-bg-elevated);
  border: 0.0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-lg);
}

.admin-header__menu a,
.admin-header__menu button {
  padding: var(--cb-space-2) var(--cb-space-3);
  color: var(--cb-text-secondary);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--cb-radius-md);
}
.admin-header__menu > span { padding:var(--cb-space-2) var(--cb-space-3); color:var(--cb-text-muted); font-size:var(--cb-font-size-sm); border-bottom:0.0625rem solid var(--cb-border-soft); }

.admin-header__menu a:hover,
.admin-header__menu button:hover {
  color: var(--cb-color-coffee);
  background: var(--cb-bg-soft);
}

@media (min-width: 48rem) {
  .admin-header__left > div,
  .admin-header__profile-copy {
    display: block;
  }

  .admin-header__mobile-menu {
    display: none;
  }
}
</style>
