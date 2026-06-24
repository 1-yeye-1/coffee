<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchHomeLiteSnapshot, fetchHomeSnapshot } from '@/api/home'
import { resolveUploadUrl } from '@/api/upload'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSkeleton from '@/components/base/BaseSkeleton.vue'
import BaseToast from '@/components/base/BaseToast.vue'
import ErrorPanel from '@/components/base/ErrorPanel.vue'
import { useCommunityStore } from '@/stores/community'
import { useBooksStore } from '@/stores/books'
import { useEventsStore } from '@/stores/events'
import { useProductsStore } from '@/stores/products'

const router = useRouter()
const communityStore = useCommunityStore()
const booksStore = useBooksStore()
const eventsStore = useEventsStore()
const productsStore = useProductsStore()
const HomeMotionRuntime = defineAsyncComponent(() => import('@/components/home/HomeMotionRuntime.vue'))
const HOME_CACHE_KEY = 'coffee-book-home-cache-v2'
const HOME_CACHE_TTL = 1000 * 60 * 10
const HOME_LITE_TIMEOUT_MS = 1200
const HOME_SNAPSHOT_TIMEOUT_MS = 1800
const HOME_ERROR_MESSAGE = 'Home content is temporarily unavailable. Please try again later.'
const perfEnabled = import.meta.env.DEV || import.meta.env.VITE_HOME_PERF === '1'
const homePerfStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
const databasePosts = computed(() => communityStore.posts.slice(0, 3))
const homeRef = ref(null)
const toastVisible = ref(false)
const homeLoading = ref(true)
const homeError = ref('')
const homeAnimated = ref(false)
const homeAnimationScheduled = ref(false)
const motionReady = ref(false)
const communityStats = ref({ members: 0, monthlyShares: 0, posts: 0, comments: 0 })
let liteRequest = null
let fullRequest = null
let deferredModulesLoaded = false
let homeAbortController = null
let fullHomeTimer = 0
let motionTimer = 0
let scrollDeferredBound = false
let fullHomeScrollHandler = null

const books = computed(() => booksStore.items.slice(0, 4).map((book) => ({
  ...book,
  description: book.summary || book.description,
  tone: book.coverTone || 'forest',
})))
const coffees = computed(() => productsStore.items.slice(0, 4).map((product) => ({
  ...product,
  flavor: Array.isArray(product.flavor) ? product.flavor.join('\u3001') : product.flavor,
  price: '\u00a5' + product.price,
  stock: product.stock > 0 ? '\u73b0\u8d27' : '\u552e\u7f44',
  badge: product.stock > 0 ? 'success' : 'neutral',
  tone: product.tone || 'floral',
})))
const events = computed(() => eventsStore.items.slice(0, 3).map((event) => ({
  ...event,
  date: event.date.slice(5).replace('-', '.'),
  weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(event.date + 'T00:00:00')),
  attendees: event.attendees + ' / ' + event.capacity + ' \u4eba',
  badge: event.attendees >= event.capacity ? 'warning' : 'success',
})))
const stats = computed(() => [
  { label: '\u7cbe\u9009\u56fe\u4e66', value: booksStore.meta?.total || booksStore.items.length },
  { label: '\u5496\u5561\u5546\u54c1', value: productsStore.meta?.total || productsStore.items.length },
  { label: '\u6587\u5316\u6d3b\u52a8', value: eventsStore.items.length },
  { label: '\u793e\u533a\u5e16\u5b50', value: communityStats.value.posts },
])

const communityMetrics = computed(() => [
  { label: '\u793e\u533a\u6210\u5458', value: communityStats.value.members },
  { label: '\u6bcf\u6708\u5206\u4eab', value: communityStats.value.monthlyShares },
])

const benefits = [
  { index: '01', title: '\u79ef\u5206\u8fd4\u5229', description: '\u6bcf\u4e00\u6b21\u9605\u8bfb\u3001\u6d88\u8d39\u4e0e\u6d3b\u52a8\u53c2\u4e0e\u90fd\u80fd\u79ef\u7d2f\u79ef\u5206\uff0c\u5151\u6362\u66f4\u591a\u751f\u6d3b\u7075\u611f\u3002' },
  { index: '02', title: '\u6d3b\u52a8\u4f18\u5148\u62a5\u540d', description: '\u63d0\u524d\u9501\u5b9a\u8bfb\u4e66\u4f1a\u3001\u5de5\u4f5c\u574a\u4e0e\u57ce\u5e02\u6587\u5316\u6d3b\u52a8\u4e2d\u7684\u73cd\u8d35\u5e2d\u4f4d\u3002' },
  { index: '03', title: '\u4f1a\u5458\u4e13\u5c5e\u6298\u6263', description: '\u7cbe\u9009\u56fe\u4e66\u3001\u7cbe\u54c1\u5496\u5561\u4e0e\u7a7a\u95f4\u9884\u7ea6\u5747\u53ef\u4eab\u53d7\u4f1a\u5458\u4e13\u5c5e\u4ef7\u683c\u3002' },
]

function navigate(path) {
  router.push(path)
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function handleHomeImageError(event) {
  event.currentTarget.hidden = true
}

function logHomePerf(label, startedAt = homePerfStart) {
  if (!perfEnabled || typeof performance === 'undefined') return
  console.info(`[home-perf] ${label}: ${Math.round(performance.now() - startedAt)}ms`)
}

function versionedUploadUrl(url, version) {
  const resolved = resolveUploadUrl(url)
  if (!resolved || !version) return resolved
  return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`
}

function isAvatarImage(value) {
  return /^(https?:\/\/|data:|blob:|\/uploads\/)/.test(String(value || ''))
}

function runIdle(callback) {
  if (typeof window === 'undefined') return callback()
  if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout: 300 })
  return window.setTimeout(callback, 24)
}

function runAfterPaint(callback) {
  if (typeof window === 'undefined') return callback()
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback))
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readHomeCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || 'null')
    if (!cache || Date.now() - Number(cache.savedAt || 0) > HOME_CACHE_TTL) return null
    return cache
  } catch {
    return null
  }
}

function writeHomeCache() {
  runIdle(() => {
    try {
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        books: booksStore.items.slice(0, 4),
        booksMeta: booksStore.meta,
        products: productsStore.items.slice(0, 4),
        productsMeta: productsStore.meta,
        events: eventsStore.items.slice(0, 3),
        posts: communityStore.posts.slice(0, 3),
        communityStats: communityStats.value,
      }))
    } catch {}
  })
}

function hydrateHomeCache() {
  const cache = readHomeCache()
  if (!cache) return false
  if (!booksStore.items.length && Array.isArray(cache.books)) booksStore.$patch({ items: cache.books, meta: cache.booksMeta || null })
  if (!productsStore.items.length && Array.isArray(cache.products)) productsStore.$patch({ items: cache.products, meta: cache.productsMeta || null })
  if (!eventsStore.items.length && Array.isArray(cache.events)) eventsStore.$patch({ items: cache.events })
  if (!communityStore.posts.length && Array.isArray(cache.posts)) communityStore.$patch({ posts: cache.posts })
  if (cache.communityStats) communityStats.value = cache.communityStats
  logHomePerf('cache-hit')
  return true
}

function applyHomeSnapshot(snapshot) {
  if (!snapshot) return false
  booksStore.$patch({
    items: Array.isArray(snapshot.books?.items) ? snapshot.books.items : [],
    meta: snapshot.books?.meta || null,
    loading: false,
    error: '',
  })
  productsStore.$patch({
    items: Array.isArray(snapshot.products?.items) ? snapshot.products.items : [],
    meta: snapshot.products?.meta || null,
    loading: false,
    error: '',
  })
  eventsStore.$patch({
    items: Array.isArray(snapshot.events?.items) ? snapshot.events.items : [],
    loading: false,
    apiError: '',
  })
  communityStore.$patch({
    posts: Array.isArray(snapshot.posts?.items) ? snapshot.posts.items : [],
    loading: false,
    apiError: '',
  })
  communityStats.value = snapshot.communityStats || { members: 0, monthlyShares: 0, posts: 0, comments: 0 }
  return true
}

const hasHomeData = computed(() => books.value.length || coffees.value.length || events.value.length || databasePosts.value.length)

function wiggleIcon(element) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  element.animate?.([
    { transform: 'rotate(0deg) scale(1)' },
    { transform: 'rotate(-8deg) scale(1.08)' },
    { transform: 'rotate(6deg) scale(1)' },
  ], { duration: 180, easing: 'ease-out' })
}

async function waitForHeroImages() {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  await nextTick()
  const images = Array.from(homeRef.value?.querySelectorAll('.hero img, .hero-art img') || [])
  if (!images.length) {
    logHomePerf('hero-ready', startedAt)
    return
  }
  await Promise.race([
    Promise.all(images.map((image) => {
    if (image.complete) return image.decode?.().catch(() => {}) || Promise.resolve()
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
      window.setTimeout(resolve, 320)
    })
    })),
    new Promise((resolve) => window.setTimeout(resolve, 360)),
  ])
  logHomePerf('hero-ready', startedAt)
}

function scheduleHomeAnimation() {
  if (!hasHomeData.value || homeLoading.value || homeAnimated.value || homeAnimationScheduled.value) return
  if (reducedMotion()) {
    homeAnimated.value = true
    return
  }
  homeAnimationScheduled.value = true
  runIdle(async () => {
    try {
      await waitForHeroImages()
      window.clearTimeout(motionTimer)
      motionTimer = window.setTimeout(() => {
        runIdle(() => {
          motionReady.value = true
          homeAnimated.value = true
          logHomePerf('motion-runtime-ready')
        })
      }, 800)
    } finally {
      homeAnimationScheduled.value = false
    }
  })
}

function bindDeferredHomeTriggers() {
  if (scrollDeferredBound || typeof window === 'undefined') return
  scrollDeferredBound = true
  fullHomeScrollHandler = () => {
    window.removeEventListener('scroll', fullHomeScrollHandler)
    fullHomeScrollHandler = null
    window.clearTimeout(fullHomeTimer)
    logHomePerf('full-home-deferred')
    runIdle(loadDeferredHomeData)
  }
  window.addEventListener('scroll', fullHomeScrollHandler, { passive: true, once: true })
  fullHomeTimer = window.setTimeout(() => {
    if (fullHomeScrollHandler) {
      window.removeEventListener('scroll', fullHomeScrollHandler)
      fullHomeScrollHandler = null
    }
    logHomePerf('full-home-deferred')
    runIdle(loadDeferredHomeData)
  }, 1800)
}

async function loadFallbackHomeModules() {
  if (deferredModulesLoaded) return
  deferredModulesLoaded = true
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  logHomePerf('fallback-modules-delayed')
  const results = await Promise.allSettled([
    booksStore.fetchBooks({ page: 1, pageSize: 4 }),
    productsStore.fetchProducts({ page: 1, pageSize: 4 }),
    eventsStore.fetchEvents({ page: 1, pageSize: 3 }),
    communityStore.fetchPosts({ status: 'published', page: 1, pageSize: 3, sort: 'hot' }),
    communityStore.fetchStats().then((stats) => { communityStats.value = stats }),
  ])
  logHomePerf('deferred-modules', startedAt)
  if (results.every((result) => result.status === 'rejected') && !hasHomeData.value) {
    homeError.value = HOME_ERROR_MESSAGE
  }
  writeHomeCache()
  scheduleHomeAnimation()
}

async function refreshHomeData() {
  if (liteRequest) return liteRequest
  homeLoading.value = !hasHomeData.value
  homeError.value = ''
  homeAbortController?.abort()
  homeAbortController = new AbortController()
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const loadingCap = window.setTimeout(() => {
    if (!hasHomeData.value) homeLoading.value = false
  }, 900)
  liteRequest = fetchHomeLiteSnapshot({ timeoutMs: HOME_LITE_TIMEOUT_MS, signal: homeAbortController.signal })
    .then((response) => {
      applyHomeSnapshot(response.data)
      logHomePerf('lite-data', startedAt)
      writeHomeCache()
      scheduleHomeAnimation()
      bindDeferredHomeTriggers()
    })
    .catch((error) => {
      logHomePerf('lite-data-failed', startedAt)
      if (!hasHomeData.value) homeError.value = error?.message || HOME_ERROR_MESSAGE
      runIdle(loadFallbackHomeModules)
    })
    .finally(() => {
      window.clearTimeout(loadingCap)
      homeLoading.value = false
      logHomePerf('first-data', startedAt)
      liteRequest = null
    })
  return liteRequest
}

async function loadDeferredHomeData() {
  if (fullRequest || deferredModulesLoaded) return fullRequest
  deferredModulesLoaded = true
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  logHomePerf('full-home-start', startedAt)
  fullRequest = fetchHomeSnapshot({ timeoutMs: HOME_SNAPSHOT_TIMEOUT_MS, signal: homeAbortController?.signal })
    .then((response) => {
      applyHomeSnapshot(response.data)
      logHomePerf('deferred-modules', startedAt)
      logHomePerf('full-home-done', startedAt)
      writeHomeCache()
      scheduleHomeAnimation()
    })
    .catch(() => loadFallbackHomeModules())
    .finally(() => { fullRequest = null })
  return fullRequest
}

onMounted(() => {
  logHomePerf('mounted')
  const hadCache = hydrateHomeCache()
  if (hadCache) homeLoading.value = false
  scheduleHomeAnimation()
  runAfterPaint(refreshHomeData)
})

onBeforeUnmount(() => {
  homeAbortController?.abort()
  window.clearTimeout(fullHomeTimer)
  window.clearTimeout(motionTimer)
  if (fullHomeScrollHandler) window.removeEventListener('scroll', fullHomeScrollHandler)
})
</script>

<template>
  <div ref="homeRef" class="home-view">
    <section class="hero">
      <div class="hero__glow hero__glow--one" aria-hidden="true" />
      <div class="hero__glow hero__glow--two" aria-hidden="true" />
      <div class="cb-container hero__grid">
        <div class="hero__copy">
          <BaseBadge class="hero__stagger" variant="premium">Coffee Book</BaseBadge>
          <h1 class="hero__title hero__stagger">
            数字咖啡馆
            <span>让阅读与咖啡成为一种生活方式</span>
          </h1>
          <p class="hero__description hero__stagger">
            在这里发现精选图书、精品咖啡、文化活动与城市阅读空间。
          </p>
          <div class="hero__actions hero__stagger" data-magnetic-group>
            <BaseButton size="lg" @click="navigate('/books')">进入图书中心</BaseButton>
            <BaseButton size="lg" variant="outline" @click="navigate('/coffee')">探索咖啡商城</BaseButton>
          </div>
          <div class="hero__note hero__stagger">
            <span aria-hidden="true" @pointerenter="wiggleIcon($event.currentTarget)">✓</span>
            <span>Curated for slow mornings and thoughtful evenings.</span>
          </div>
        </div>

        <div class="hero-art hero__stagger" aria-label="咖啡杯与书本艺术插画">
          <div class="hero-art__halo" />
          <div class="hero-art__card">
            <span class="hero-art__label">COFFEE · BOOK · LIFE</span>
            <div class="hero-art__book hero-art__book--back"><span>Selected</span><strong>READS</strong></div>
            <div class="hero-art__book hero-art__book--front"><span>Volume 01</span><strong>THE SLOW<br />MORNING</strong></div>
            <div class="hero-art__cup">
              <span class="hero-art__coffee" />
              <span class="hero-art__steam hero-art__steam--one" />
              <span class="hero-art__steam hero-art__steam--two" />
            </div>
            <div class="hero-art__saucer" />
            <span class="hero-art__caption">A quiet place for curious minds.</span>
          </div>
        </div>
      </div>
    </section>

    <section class="stats-section" data-stats>
      <div class="cb-container stats-grid">
        <article v-for="item in stats" :key="item.label" class="stat-item">
          <strong data-count>{{ formatNumber(item.value) }}+</strong>
          <span>{{ item.label }}</span>
        </article>
      </div>
    </section>

    <section class="home-section cb-section">
      <div class="cb-container">
        <header class="section-heading" data-reveal>
          <div><span class="section-eyebrow">Curated Library</span><h2 class="section-title">精选图书</h2></div>
          <p>从文学经典到现代思考，为每一种好奇心挑选值得停留的文字。</p>
        </header>
        <ErrorPanel v-if="homeError && !books.length" :message="homeError" @retry="refreshHomeData" />
        <div class="book-grid">
          <BaseSkeleton v-if="homeLoading && !books.length" v-for="index in 4" :key="`home-book-loading-${index}`" variant="card" />
          <BaseCard v-for="book in books" :key="book.id || book.slug" class="book-card" variant="interactive" data-cursor="READ" data-tilt-card @click="navigate(`/books/${book.slug}`)">
            <div class="book-card__cover" :class="`book-card__cover--${book.tone}`" data-tilt-layer="1.4">
              <img v-if="book.coverUrl" class="book-card__image" :src="versionedUploadUrl(book.coverUrl, book.updatedAt)" :alt="book.title" loading="lazy" decoding="async" @error="handleHomeImageError" />
              <span>{{ book.category }}</span><strong>{{ book.title }}</strong><small>COFFEE BOOK EDITION</small>
            </div>
            <div class="book-card__content" data-tilt-layer="0.7">
              <div class="card-topline"><BaseBadge variant="neutral">{{ book.category }}</BaseBadge><span>★ {{ book.rating }}</span></div>
              <h3>{{ book.title }}</h3><small>{{ book.author }}</small><p>{{ book.description }}</p>
              <BaseButton variant="ghost" size="sm" @click.stop="navigate(`/books/${book.slug}`)">查看详情 →</BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>

    <section class="home-section home-section--soft cb-section">
      <div class="cb-container">
        <header class="section-heading" data-reveal>
          <div><span class="section-eyebrow">Specialty Coffee</span><h2 class="section-title">精品咖啡</h2></div>
          <p>从产地风味到杯中香气，每一款咖啡都有清晰而独特的表达。</p>
        </header>
        <ErrorPanel v-if="homeError && !coffees.length" :message="homeError" @retry="refreshHomeData" />
        <div class="coffee-grid">
          <BaseSkeleton v-if="homeLoading && !coffees.length" v-for="index in 4" :key="`home-coffee-loading-${index}`" variant="card" />
          <BaseCard v-for="coffee in coffees" :key="coffee.id || coffee.slug" class="coffee-card" variant="interactive" data-cursor="BUY" data-tilt-card @click="navigate(`/coffee/${coffee.slug}`)">
            <div class="coffee-card__visual" :class="`coffee-card__visual--${coffee.tone}`" data-tilt-layer="1.4">
              <img v-if="coffee.imageUrl" class="coffee-card__image" :src="versionedUploadUrl(coffee.imageUrl, coffee.updatedAt)" :alt="coffee.name" loading="lazy" decoding="async" @error="handleHomeImageError" />
              <div class="coffee-card__cup"><span /></div>
              <span class="coffee-card__bean coffee-card__bean--one" />
              <span class="coffee-card__bean coffee-card__bean--two" />
            </div>
            <div class="coffee-card__content" data-tilt-layer="0.7">
              <div class="card-topline"><BaseBadge :variant="coffee.badge">{{ coffee.stock }}</BaseBadge><strong>{{ coffee.price }}</strong></div>
              <h3>{{ coffee.name }}</h3><p>{{ coffee.flavor }}</p>
              <BaseButton size="sm" variant="outline" @click.stop="navigate(`/coffee/${coffee.slug}`)">查看详情</BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>

    <section class="home-section cb-section">
      <div class="cb-container">
        <header class="section-heading" data-reveal>
          <div><span class="section-eyebrow">近期活动</span><h2 class="section-title">文化活动</h2></div>
          <p>让阅读从书页延伸到人与人的相遇，在城市里共享真实的灵感。</p>
        </header>
        <ErrorPanel v-if="homeError && !events.length" :message="homeError" @retry="refreshHomeData" />
        <div class="event-grid">
          <BaseSkeleton v-if="homeLoading && !events.length" v-for="index in 3" :key="`home-event-loading-${index}`" variant="card" />
          <BaseCard v-for="event in events" :key="event.id || event.slug" class="event-card" variant="interactive" data-cursor="JOIN" data-tilt-card @click="navigate(`/events/${event.slug}`)">
            <div class="event-card__date" data-tilt-layer="1.2"><strong>{{ event.date }}</strong><span>{{ event.weekday }}</span></div>
            <div class="event-card__body" data-tilt-layer="0.6">
              <BaseBadge :variant="event.badge">{{ event.status }}</BaseBadge><h3>{{ event.title }}</h3>
              <dl><div><dt>地点</dt><dd>{{ event.location }}</dd></div><div><dt>报名</dt><dd>{{ event.attendees }}</dd></div></dl>
              <BaseButton variant="outline" size="sm" @click.stop="navigate(`/events/${event.slug}`)">查看活动</BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>

    <section class="home-section home-section--dark cb-section">
      <div class="cb-container community-grid">
        <BaseCard class="community-intro" variant="elevated" data-reveal>
          <BaseBadge variant="premium">Coffee Book 社区</BaseBadge>
          <h2>与同样热爱阅读和咖啡的人相遇</h2>
          <p>分享正在阅读的书、今天喝到的风味，以及城市里适合独处和交流的角落。</p>
          <div class="community-intro__metrics">
            <div v-for="item in communityMetrics" :key="item.label">
              <strong>{{ formatNumber(item.value) }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>
          <BaseButton @click="navigate('/community')">进入社区</BaseButton>
        </BaseCard>
        <div class="post-list" data-reveal>
          <BaseSkeleton v-if="homeLoading && !databasePosts.length" v-for="index in 3" :key="`home-post-loading-${index}`" variant="text" :lines="2" />
          <article v-for="post in databasePosts" :key="post.id" class="post-item" role="link" tabindex="0" data-cursor="VIEW" @click="navigate(`/community/${post.slug || post.id}`)" @keydown.enter="navigate(`/community/${post.slug || post.id}`)" @keydown.space.prevent="navigate(`/community/${post.slug || post.id}`)">
            <span class="post-item__avatar"><img v-if="isAvatarImage(post.avatar)" :src="resolveUploadUrl(post.avatar)" alt="" loading="lazy" decoding="async" @error="handleHomeImageError" /><template v-else>{{ post.avatar }}</template></span>
            <div><h3>{{ post.title }}</h3><div class="post-item__meta"><span>{{ post.author }} · {{ new Date(post.createdAt).toLocaleDateString('zh-CN') }}</span><span>♥ {{ post.likes }}　☕ {{ post.commentsCount }}</span></div></div>
            <span class="post-item__arrow" aria-hidden="true">→</span>
          </article>
        </div>
      </div>
    </section>

    <section class="home-section cb-section">
      <div class="cb-container booking-panel" data-reveal>
        <div class="booking-panel__copy">
          <span class="section-eyebrow">Space Booking</span><h2 class="section-title">为专注留一张座位</h2>
          <p>安静阅读、自由创作或小型会面，都可以在 Coffee Book 找到合适的空间。</p>
          <BaseButton size="lg" @click="navigate('/booking')">立即预约</BaseButton>
        </div>
        <div class="booking-panel__availability">
          <BaseBadge variant="success">今日可预约</BaseBadge>
          <div class="booking-panel__time">14:00 – 18:00</div>
          <div class="booking-panel__seats"><span>剩余座位</span><strong>12</strong></div>
          <div class="booking-panel__slots"><span>14:00</span><span>15:30</span><span>17:00</span></div>
        </div>
      </div>
    </section>

    <section class="home-section home-section--soft cb-section">
      <div class="cb-container">
        <header class="section-heading section-heading--center" data-reveal>
          <div><span class="section-eyebrow">Membership</span><h2 class="section-title">让每一次相遇更有价值</h2></div>
          <p>会员权益围绕阅读、咖啡和文化体验展开，简单、真诚且持续。</p>
        </header>
        <div class="benefit-grid">
          <BaseCard v-for="benefit in benefits" :key="benefit.title" class="benefit-card" variant="hover" data-reveal>
            <span class="benefit-card__index">{{ benefit.index }}</span><h3>{{ benefit.title }}</h3><p>{{ benefit.description }}</p>
          </BaseCard>
        </div>
      </div>
    </section>

    <section class="cta-section cb-section">
      <div class="cb-container cta-panel" data-reveal>
        <span class="section-eyebrow">Begin Your Story</span><h2>从一杯咖啡和一本书开始</h2>
        <p>加入 Coffee Book，找到属于自己的阅读节奏与城市生活方式。</p>
        <BaseButton size="lg" variant="secondary" @click="navigate('/register')">立即加入</BaseButton>
      </div>
    </section>

    <div class="home-toast">
      <BaseToast v-model="toastVisible" variant="success" title="已加入购物车">
        商品已加入购物车，本阶段仅展示交互反馈。
      </BaseToast>
    </div>
    <HomeMotionRuntime v-if="motionReady" :stats-values="stats.map((item) => item.value)" />
  </div>
</template>

<style scoped>
.home-view { overflow: hidden; }
.hero { position: relative; min-height: calc(100vh - 4.5rem); overflow: hidden; background: radial-gradient(circle at 78% 32%, color-mix(in srgb, var(--cb-color-gold) 20%, transparent), transparent 32%), linear-gradient(145deg, var(--cb-bg-page), color-mix(in srgb, var(--cb-color-cream) 45%, var(--cb-bg-page))); }
.hero__grid { position: relative; z-index: 1; display: grid; min-height: calc(100vh - 4.5rem); padding-block: var(--cb-space-12); gap: var(--cb-space-10); align-items: center; }
.hero__copy { display: flex; max-width: 42rem; flex-direction: column; align-items: flex-start; gap: var(--cb-space-6); }
.hero__title { display: grid; gap: var(--cb-space-3); font-size: clamp(var(--cb-font-size-5xl), 8vw, var(--cb-font-size-display)); letter-spacing: -0.035em; }
.hero__title span { max-width: 18ch; color: var(--cb-color-coffee); font-size: clamp(var(--cb-font-size-2xl), 4vw, var(--cb-font-size-4xl)); }
.hero__description { max-width: 37rem; font-size: clamp(var(--cb-font-size-md), 2vw, var(--cb-font-size-xl)); }
.hero__actions { display: flex; flex-wrap: wrap; gap: var(--cb-space-3); }
.hero__note { display: flex; gap: var(--cb-space-2); align-items: center; color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.hero__stagger { will-change: opacity, transform; }
.hero__glow { position: absolute; border-radius: var(--cb-radius-pill); filter: blur(var(--cb-space-10)); opacity: .45; }
.hero__glow--one { top: 12%; right: -8rem; width: 22rem; height: 22rem; background: color-mix(in srgb, var(--cb-color-gold) 45%, transparent); }
.hero__glow--two { bottom: -8rem; left: -6rem; width: 18rem; height: 18rem; background: color-mix(in srgb, var(--cb-color-caramel) 22%, transparent); }
.hero-art { position: relative; width: min(100%, 34rem); margin-inline: auto; transform-origin: center; will-change: transform; }
.hero-art__halo { position: absolute; inset: 12%; background: color-mix(in srgb, var(--cb-color-gold) 38%, transparent); border-radius: var(--cb-radius-pill); filter: blur(var(--cb-space-10)); }
.hero-art__card { position: relative; min-height: 31rem; padding: var(--cb-space-8); overflow: hidden; background: linear-gradient(145deg, color-mix(in srgb, var(--cb-color-coffee) 94%, var(--cb-bg-dark)), var(--cb-bg-dark)); border: .0625rem solid color-mix(in srgb, var(--cb-color-gold) 36%, transparent); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-xl); transform-origin: center; will-change: transform; }
.hero-art__card::before { position: absolute; inset: var(--cb-space-5); border: .0625rem solid color-mix(in srgb, var(--cb-color-cream) 18%, transparent); border-radius: var(--cb-radius-xl); content: ""; }
.hero-art__label,.hero-art__caption { position: absolute; z-index: 4; color: var(--cb-color-cream); font-size: var(--cb-font-size-xs); letter-spacing: .18em; }
.hero-art__label { top: var(--cb-space-8); left: var(--cb-space-8); }.hero-art__caption { right: var(--cb-space-8); bottom: var(--cb-space-8); max-width: 14rem; text-align: right; }
.hero-art__book { position: absolute; display: flex; padding: var(--cb-space-5); flex-direction: column; justify-content: space-between; color: var(--cb-color-espresso); border-radius: var(--cb-radius-sm); box-shadow: var(--cb-shadow-lg); }
.hero-art__book span { font-size: var(--cb-font-size-xs); letter-spacing: .1em; }.hero-art__book strong { font-family: var(--cb-font-display); line-height: var(--cb-line-tight); }
.hero-art__book--back { top: 23%; left: 16%; width: 44%; height: 54%; background: var(--cb-color-caramel); transform: rotate(-8deg); }
.hero-art__book--front { top: 28%; left: 29%; width: 42%; height: 53%; background: var(--cb-color-cream); transform: rotate(5deg); }
.hero-art__cup { position: absolute; z-index: 3; right: 12%; bottom: 16%; width: 8.5rem; height: 7rem; background: var(--cb-color-ivory); border-radius: var(--cb-radius-md) var(--cb-radius-md) var(--cb-radius-2xl) var(--cb-radius-2xl); box-shadow: var(--cb-shadow-lg); }
.hero-art__cup::after { position: absolute; top: 18%; right: -2.6rem; width: 3.4rem; height: 3.8rem; border: .75rem solid var(--cb-color-ivory); border-left: 0; border-radius: 0 var(--cb-radius-pill) var(--cb-radius-pill) 0; content: ""; }
.hero-art__coffee { position: absolute; top: var(--cb-space-2); left: 8%; width: 84%; height: 1.25rem; background: var(--cb-color-espresso); border-radius: var(--cb-radius-pill); }
.hero-art__steam { position: absolute; top: -3.5rem; width: 1.5rem; height: 3rem; border-left: .125rem solid var(--cb-color-cream); border-radius: var(--cb-radius-pill); opacity: .6; }
.hero-art__steam--one { left: 35%; transform: rotate(12deg); }.hero-art__steam--two { left: 60%; transform: rotate(-12deg); }
.hero-art__saucer { position: absolute; z-index: 2; right: 7%; bottom: 12%; width: 12rem; height: 2rem; background: var(--cb-color-cream); border-radius: var(--cb-radius-pill); box-shadow: var(--cb-shadow-md); }
.stats-section { background: var(--cb-bg-surface); border-block: .0625rem solid var(--cb-border-soft); }.stats-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
.stat-item { display: grid; padding: var(--cb-space-6) var(--cb-space-3); gap: var(--cb-space-1); text-align: center; }.stat-item strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: clamp(var(--cb-font-size-2xl),4vw,var(--cb-font-size-4xl)); }.stat-item span { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.home-section { content-visibility: auto; contain-intrinsic-size: 42rem; }
.home-section--soft { background: var(--cb-bg-soft); }.home-section--dark { background: var(--cb-bg-dark); }
.section-heading { display: grid; margin-bottom: var(--cb-space-10); gap: var(--cb-space-4); }.section-heading>div { display: grid; gap: var(--cb-space-2); }.section-heading>p { max-width: 34rem; }.section-heading--center { justify-items: center; text-align: center; }
.book-grid,.coffee-grid,.event-grid,.benefit-grid { display: grid; gap: var(--cb-space-6); }.book-card,.coffee-card,.event-card,.benefit-card { overflow: hidden; }
.book-card,.coffee-card { display: grid; padding: 0; }.book-card__cover { position: relative; display: flex; min-height: 21rem; padding: var(--cb-space-6); flex-direction: column; justify-content: space-between; color: var(--cb-color-ivory); }
.book-card__cover::after { position: absolute; inset: var(--cb-space-4); border: .0625rem solid color-mix(in srgb,var(--cb-color-cream) 28%,transparent); border-radius: var(--cb-radius-md); content: ""; }
.book-card__cover>* { position: relative; z-index: 1; }.book-card__image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;}.book-card__image:not([hidden])~span,.book-card__image:not([hidden])~strong,.book-card__image:not([hidden])~small{text-shadow:0 .125rem .75rem rgb(0 0 0 / .45);}.book-card__image:not([hidden])+span{width:max-content;padding:.2rem .55rem;background:rgb(0 0 0 / .32);border-radius:var(--cb-radius-pill);} .book-card__cover span,.book-card__cover small { font-size: var(--cb-font-size-xs); letter-spacing: .12em; }.book-card__cover strong { max-width: 8ch; font-family: var(--cb-font-display); font-size: var(--cb-font-size-3xl); }
.book-card__cover--sunset { background: linear-gradient(145deg,var(--cb-color-caramel),var(--cb-color-coffee)); }.book-card__cover--forest { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-success) 70%,var(--cb-bg-dark)),var(--cb-bg-dark)); }.book-card__cover--earth { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-color-gold) 58%,var(--cb-color-coffee)),var(--cb-color-espresso)); }.book-card__cover--night { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-info) 50%,var(--cb-bg-dark)),var(--cb-bg-dark)); }
.book-card__content,.coffee-card__content { display: flex; padding: var(--cb-space-5); flex-direction: column; gap: var(--cb-space-3); }.card-topline { display: flex; align-items: center; justify-content: space-between; gap: var(--cb-space-3); }.card-topline>span { color: var(--cb-color-caramel); font-size: var(--cb-font-size-sm); font-weight: var(--cb-font-semibold); }.card-topline>strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-xl); }
.book-card__content h3,.coffee-card__content h3,.event-card h3,.benefit-card h3,.post-item h3 { font-size: var(--cb-font-size-xl); }.book-card__content small { color: var(--cb-text-muted); }.book-card__content :deep(.base-button) { width: fit-content; margin-top: auto; padding-inline: 0; }.coffee-card__content :deep(.base-button) { width: 100%; margin-top: auto; }
.coffee-card__visual { position: relative; display: grid; min-height: 15rem; place-items: center; overflow: hidden; } .coffee-card__image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:2; opacity:1; transition:opacity var(--cb-duration-normal) var(--cb-ease-standard); } .coffee-card__image[hidden] { display:none; } .coffee-card__image:not([hidden]) ~ .coffee-card__cup, .coffee-card__image:not([hidden]) ~ .coffee-card__bean { opacity:0; }.coffee-card__visual--floral { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-color-gold) 38%,var(--cb-bg-soft)),var(--cb-color-cream)); }.coffee-card__visual--cold { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-info) 28%,var(--cb-bg-soft)),color-mix(in srgb,var(--cb-color-coffee) 35%,var(--cb-bg-soft))); }.coffee-card__visual--latte { background: linear-gradient(145deg,var(--cb-color-cream),color-mix(in srgb,var(--cb-color-caramel) 42%,var(--cb-bg-soft))); }.coffee-card__visual--gift { background: linear-gradient(145deg,var(--cb-color-coffee),var(--cb-bg-dark)); }
.coffee-card__cup { position: relative; z-index: 1; width: 7rem; height: 6rem; background: var(--cb-bg-surface); border-radius: var(--cb-radius-md) var(--cb-radius-md) var(--cb-radius-2xl) var(--cb-radius-2xl); box-shadow: var(--cb-shadow-lg); }.coffee-card__cup::after { position: absolute; top: 18%; right: -2.25rem; width: 3rem; height: 3.25rem; border: .65rem solid var(--cb-bg-surface); border-left: 0; border-radius: 0 var(--cb-radius-pill) var(--cb-radius-pill) 0; content: ""; }.coffee-card__cup span { position: absolute; top: var(--cb-space-2); left: 9%; width: 82%; height: 1rem; background: var(--cb-color-espresso); border-radius: var(--cb-radius-pill); }
.coffee-card__bean { position: absolute; width: 2rem; height: 1.15rem; background: var(--cb-color-coffee); border-radius: var(--cb-radius-pill); transform: rotate(32deg); }.coffee-card__bean::after { position: absolute; top: 12%; left: 50%; width: .0625rem; height: 76%; background: var(--cb-color-cream); content: ""; }.coffee-card__bean--one { top: 18%; left: 18%; }.coffee-card__bean--two { right: 15%; bottom: 20%; transform: rotate(-20deg); }
.event-grid { gap: var(--cb-space-5); }.event-card { display: grid; grid-template-columns: 5.25rem minmax(0,1fr); padding: 0; }.event-card__date { display: flex; padding: var(--cb-space-4); flex-direction: column; align-items: center; justify-content: center; color: var(--cb-text-inverse); text-align: center; background: var(--cb-color-coffee); }.event-card__date strong { font-family: var(--cb-font-display); font-size: var(--cb-font-size-2xl); }.event-card__body { display: flex; padding: var(--cb-space-5); flex-direction: column; align-items: flex-start; gap: var(--cb-space-3); }.event-card dl { display: grid; width: 100%; margin: 0; gap: var(--cb-space-2); }.event-card dl div { display: flex; justify-content: space-between; gap: var(--cb-space-3); font-size: var(--cb-font-size-sm); }.event-card dt { color: var(--cb-text-muted); }.event-card dd { margin: 0; color: var(--cb-text-secondary); }
.community-grid { display: grid; gap: var(--cb-space-8); }.community-intro { display: flex; padding: clamp(var(--cb-space-6),5vw,var(--cb-space-10)); flex-direction: column; align-items: flex-start; justify-content: center; gap: var(--cb-space-5); }.community-intro h2 { max-width: 16ch; font-size: clamp(var(--cb-font-size-3xl),5vw,var(--cb-font-size-5xl)); }.community-intro__metrics { display: flex; gap: var(--cb-space-8); }.community-intro__metrics div { display: grid; }.community-intro__metrics strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-3xl); }.community-intro__metrics span { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.post-list { display: grid; align-content: center; gap: var(--cb-space-3); }.post-item { display: grid; padding: var(--cb-space-5); grid-template-columns: auto minmax(0,1fr) auto; gap: var(--cb-space-4); align-items: center; background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); transition: box-shadow var(--cb-duration-normal) var(--cb-ease-standard),transform var(--cb-duration-normal) var(--cb-ease-emphasized); }.post-item:hover { box-shadow: var(--cb-shadow-hover); transform: translateX(var(--cb-space-1)); }.post-item__avatar { display: inline-grid; width: 2.75rem; height: 2.75rem; place-items: center; overflow:hidden; color: var(--cb-text-inverse); font-weight: var(--cb-font-bold); background: var(--cb-color-coffee); border-radius: var(--cb-radius-pill); }.post-item__avatar img{width:100%;height:100%;object-fit:cover;border-radius:inherit;}.post-item__meta { display: flex; margin-top: var(--cb-space-2); flex-wrap: wrap; gap: var(--cb-space-2) var(--cb-space-4); justify-content: space-between; color: var(--cb-text-muted); font-size: var(--cb-font-size-xs); }.post-item__arrow { color: var(--cb-color-caramel); }
.booking-panel { display: grid; padding: clamp(var(--cb-space-6),6vw,var(--cb-space-12)); gap: var(--cb-space-8); background: linear-gradient(135deg,var(--cb-bg-surface),color-mix(in srgb,var(--cb-color-cream) 62%,var(--cb-bg-surface))); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-lg); }.booking-panel__copy { display: flex; flex-direction: column; align-items: flex-start; gap: var(--cb-space-4); }.booking-panel__copy p { max-width: 34rem; }.booking-panel__availability { display: flex; padding: var(--cb-space-6); flex-direction: column; gap: var(--cb-space-4); background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); box-shadow: var(--cb-shadow-sm); }.booking-panel__time { font-family: var(--cb-font-display); font-size: clamp(var(--cb-font-size-2xl),4vw,var(--cb-font-size-4xl)); }.booking-panel__seats { display: flex; align-items: end; justify-content: space-between; color: var(--cb-text-muted); }.booking-panel__seats strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-4xl); }.booking-panel__slots { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }.booking-panel__slots span { padding: var(--cb-space-2) var(--cb-space-3); background: var(--cb-bg-soft); border-radius: var(--cb-radius-pill); }
.benefit-card { position: relative; display: flex; min-height: 15rem; padding: var(--cb-space-7); flex-direction: column; justify-content: flex-end; gap: var(--cb-space-3); }.benefit-card__index { position: absolute; top: var(--cb-space-5); right: var(--cb-space-5); color: color-mix(in srgb,var(--cb-color-coffee) 25%,transparent); font-family: var(--cb-font-display); font-size: var(--cb-font-size-5xl); font-weight: var(--cb-font-bold); }
.cta-section { padding-top: 0; }.cta-panel { display: flex; padding: clamp(var(--cb-space-8),8vw,var(--cb-space-20)); flex-direction: column; align-items: center; gap: var(--cb-space-5); color: var(--cb-color-ivory); text-align: center; background: radial-gradient(circle at 20% 10%,color-mix(in srgb,var(--cb-color-gold) 28%,transparent),transparent 35%),linear-gradient(135deg,var(--cb-color-coffee),var(--cb-bg-dark)); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-xl); }.cta-panel h2 { max-width: 18ch; color: var(--cb-color-ivory); font-size: clamp(var(--cb-font-size-3xl),6vw,var(--cb-font-size-5xl)); }.cta-panel p { max-width: 38rem; color: var(--cb-color-cream); }
.home-toast { position: fixed; z-index: var(--cb-z-toast); right: var(--cb-space-4); bottom: var(--cb-space-4); width: min(calc(100% - (var(--cb-space-4)*2)),24rem); }
@media (min-width:40rem) { .book-grid,.coffee-grid,.benefit-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.event-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.section-heading { grid-template-columns: minmax(0,1fr) minmax(16rem,.8fr); align-items: end; }.section-heading--center { grid-template-columns: 1fr; } }
@media (min-width:64rem) { .hero__grid { grid-template-columns: minmax(0,1.05fr) minmax(25rem,.95fr); padding-block: var(--cb-space-16); }.stats-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }.stat-item+.stat-item { border-left: .0625rem solid var(--cb-border-soft); }.community-grid,.booking-panel { grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr); }.booking-panel { align-items: center; } }
@media (min-width:80rem) { .book-grid,.coffee-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }.event-grid,.benefit-grid { grid-template-columns: repeat(3,minmax(0,1fr)); } }
.coffee-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); }
@media (max-width:39.999rem) { .hero__grid { min-height: auto; padding-block: var(--cb-space-10) var(--cb-space-16); }.hero__actions,.hero__actions :deep(.base-button) { width: 100%; }.hero-art__card { min-height: 25rem; padding: var(--cb-space-5); }.hero-art__book--back { left: 10%; }.hero-art__book--front { left: 24%; }.hero-art__cup { right: 8%; width: 6.5rem; height: 5.5rem; }.hero-art__saucer { right: 3%; width: 9.5rem; }.event-card { grid-template-columns: 4.5rem minmax(0,1fr); }.post-item { grid-template-columns: auto minmax(0,1fr); }.post-item__arrow { display: none; }.community-intro__metrics { gap: var(--cb-space-5); }.cta-panel { width: calc(100% - (var(--cb-space-4)*2)); } }
@media (prefers-reduced-motion:reduce) { .hero__stagger { opacity: 1; will-change:auto; } }
</style>
