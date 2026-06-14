<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard, BaseToast } from '@/components/base'

const router = useRouter()
const homeRef = ref(null)
const toastVisible = ref(false)
const animatedStats = ref([0, 0, 0, 0])
let revealObserver
let statsObserver
let animationFrame

const stats = [
  { label: '精选图书', value: 1280 },
  { label: '咖啡商品', value: 86 },
  { label: '文化活动', value: 42 },
  { label: '社区用户', value: 9800 },
]

const books = [
  { title: '小王子', author: '安托万·德·圣-埃克苏佩里', category: '文学', rating: '4.9', description: '献给每一个曾经是孩子的大人，在纯真与成长之间重新看见重要的事。', tone: 'sunset' },
  { title: '原则', author: '瑞·达利欧', category: '商业', rating: '4.7', description: '以清晰、系统的方法理解现实，在持续反思中建立自己的工作与生活原则。', tone: 'forest' },
  { title: '活着', author: '余华', category: '小说', rating: '4.8', description: '在命运的沉浮中凝视生命本身，以克制的文字书写坚韧与温度。', tone: 'earth' },
  { title: '深度工作', author: '卡尔·纽波特', category: '效率', rating: '4.6', description: '在分心时代重新获得专注力，让真正重要的创造拥有完整时间。', tone: 'night' },
]

const coffees = [
  { name: '埃塞俄比亚手冲', flavor: '茉莉、柑橘与红茶尾韵，明亮而轻盈。', price: '¥38', stock: '现货', badge: 'success', tone: 'floral' },
  { name: '哥伦比亚冷萃', flavor: '黑巧克力、焦糖与橙皮，醇厚而清爽。', price: '¥32', stock: '现货', badge: 'success', tone: 'cold' },
  { name: '焦糖拿铁', flavor: '丝滑牛奶融合温暖焦糖，柔和甜感。', price: '¥30', stock: '今日限定', badge: 'warning', tone: 'latte' },
  { name: '咖啡豆礼盒', flavor: '三款精品产区豆，适合分享与收藏。', price: '¥168', stock: '少量库存', badge: 'premium', tone: 'gift' },
]

const events = [
  { date: '06.14', weekday: '周日', title: '周末读书会', location: '二层阅读厅', attendees: '18 / 24 人', status: '报名中', badge: 'success' },
  { date: '06.20', weekday: '周六', title: '手冲咖啡体验课', location: '咖啡实验室', attendees: '10 / 12 人', status: '即将满员', badge: 'warning' },
  { date: '06.27', weekday: '周六', title: '城市夜读沙龙', location: '露台空间', attendees: '32 / 40 人', status: '报名中', badge: 'info' },
]

const posts = [
  { title: '今天读完一本改变我的书', nickname: '林间页', time: '12 分钟前', likes: 128, comments: 24, avatar: '林' },
  { title: '你最喜欢的咖啡风味是什么？', nickname: '浅烘时刻', time: '1 小时前', likes: 86, comments: 41, avatar: '浅' },
  { title: '适合独处阅读的角落推荐', nickname: '城市漫读', time: '昨天', likes: 203, comments: 37, avatar: '城' },
]

const benefits = [
  { index: '01', title: '积分返利', description: '每一次阅读、消费与活动参与都能积累积分，兑换更多生活灵感。' },
  { index: '02', title: '活动优先报名', description: '提前锁定读书会、工作坊与城市文化活动中的珍贵席位。' },
  { index: '03', title: '会员专属折扣', description: '精选图书、精品咖啡与空间预约均可享受会员专属价格。' },
]

function navigate(path) {
  router.push(path)
}

function addToCart() {
  toastVisible.value = false
  nextTick(() => {
    toastVisible.value = true
  })
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function animateStats() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedStats.value = stats.map((item) => item.value)
    return
  }
  const start = performance.now()
  const duration = 1100
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    animatedStats.value = stats.map((item) => item.value * eased)
    if (progress < 1) animationFrame = requestAnimationFrame(update)
  }
  animationFrame = requestAnimationFrame(update)
}

onMounted(() => {
  const revealElements = homeRef.value?.querySelectorAll('[data-reveal]') ?? []
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'))
  } else {
    revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver.unobserve(entry.target)
        }
      }),
      { threshold: 0.12 },
    )
    revealElements.forEach((element) => revealObserver.observe(element))
  }

  const statsElement = homeRef.value?.querySelector('[data-stats]')
  if (!statsElement || !('IntersectionObserver' in window)) animateStats()
  else {
    statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateStats()
          statsObserver.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    statsObserver.observe(statsElement)
  }
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  statsObserver?.disconnect()
  cancelAnimationFrame(animationFrame)
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
          <div class="hero__actions hero__stagger">
            <BaseButton size="lg" @click="navigate('/books')">进入图书中心</BaseButton>
            <BaseButton size="lg" variant="outline" @click="navigate('/coffee')">探索咖啡商城</BaseButton>
          </div>
          <div class="hero__note hero__stagger">
            <span aria-hidden="true">✦</span>
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
        <article v-for="(item, index) in stats" :key="item.label" class="stat-item">
          <strong>{{ formatNumber(animatedStats[index]) }}+</strong>
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
        <div class="book-grid">
          <BaseCard v-for="book in books" :key="book.title" class="book-card" variant="hover" data-reveal>
            <div class="book-card__cover" :class="`book-card__cover--${book.tone}`">
              <span>{{ book.category }}</span><strong>{{ book.title }}</strong><small>COFFEE BOOK EDITION</small>
            </div>
            <div class="book-card__content">
              <div class="card-topline"><BaseBadge variant="neutral">{{ book.category }}</BaseBadge><span>★ {{ book.rating }}</span></div>
              <h3>{{ book.title }}</h3><small>{{ book.author }}</small><p>{{ book.description }}</p>
              <BaseButton variant="ghost" size="sm" @click="navigate('/books')">查看详情　→</BaseButton>
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
        <div class="coffee-grid">
          <BaseCard v-for="coffee in coffees" :key="coffee.name" class="coffee-card" variant="hover" data-reveal>
            <div class="coffee-card__visual" :class="`coffee-card__visual--${coffee.tone}`">
              <div class="coffee-card__cup"><span /></div>
              <span class="coffee-card__bean coffee-card__bean--one" />
              <span class="coffee-card__bean coffee-card__bean--two" />
            </div>
            <div class="coffee-card__content">
              <div class="card-topline"><BaseBadge :variant="coffee.badge">{{ coffee.stock }}</BaseBadge><strong>{{ coffee.price }}</strong></div>
              <h3>{{ coffee.name }}</h3><p>{{ coffee.flavor }}</p>
              <BaseButton size="sm" @click="addToCart">加入购物车</BaseButton>
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
        <div class="event-grid">
          <BaseCard v-for="event in events" :key="event.title" class="event-card" variant="hover" data-reveal>
            <div class="event-card__date"><strong>{{ event.date }}</strong><span>{{ event.weekday }}</span></div>
            <div class="event-card__body">
              <BaseBadge :variant="event.badge">{{ event.status }}</BaseBadge><h3>{{ event.title }}</h3>
              <dl><div><dt>地点</dt><dd>{{ event.location }}</dd></div><div><dt>报名</dt><dd>{{ event.attendees }}</dd></div></dl>
              <BaseButton variant="outline" size="sm" @click="navigate('/events')">查看活动</BaseButton>
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
          <div class="community-intro__metrics"><div><strong>9.8K</strong><span>社区成员</span></div><div><strong>2.4K</strong><span>每月分享</span></div></div>
          <BaseButton @click="navigate('/community')">进入社区</BaseButton>
        </BaseCard>
        <div class="post-list" data-reveal>
          <article v-for="post in posts" :key="post.title" class="post-item">
            <span class="post-item__avatar">{{ post.avatar }}</span>
            <div><h3>{{ post.title }}</h3><div class="post-item__meta"><span>{{ post.nickname }} · {{ post.time }}</span><span>♡ {{ post.likes }}　☵ {{ post.comments }}</span></div></div>
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
          <div class="booking-panel__time">14:00 — 18:00</div>
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
.hero__stagger { opacity: 0; animation: hero-enter var(--cb-duration-slow) var(--cb-ease-emphasized) forwards; }
.hero__stagger:nth-child(1) { animation-delay: 80ms; }.hero__stagger:nth-child(2) { animation-delay: 160ms; }.hero__stagger:nth-child(3) { animation-delay: 240ms; }.hero__stagger:nth-child(4) { animation-delay: 320ms; }.hero__stagger:nth-child(5) { animation-delay: 400ms; }
.hero__glow { position: absolute; border-radius: var(--cb-radius-pill); filter: blur(var(--cb-space-10)); opacity: .45; }
.hero__glow--one { top: 12%; right: -8rem; width: 22rem; height: 22rem; background: color-mix(in srgb, var(--cb-color-gold) 45%, transparent); }
.hero__glow--two { bottom: -8rem; left: -6rem; width: 18rem; height: 18rem; background: color-mix(in srgb, var(--cb-color-caramel) 22%, transparent); }
.hero-art { position: relative; width: min(100%, 34rem); margin-inline: auto; animation: hero-enter var(--cb-duration-slow) var(--cb-ease-emphasized) 360ms forwards, gentle-float 6s var(--cb-ease-standard) 900ms infinite alternate; }
.hero-art__halo { position: absolute; inset: 12%; background: color-mix(in srgb, var(--cb-color-gold) 38%, transparent); border-radius: var(--cb-radius-pill); filter: blur(var(--cb-space-10)); }
.hero-art__card { position: relative; min-height: 31rem; padding: var(--cb-space-8); overflow: hidden; background: linear-gradient(145deg, color-mix(in srgb, var(--cb-color-coffee) 94%, var(--cb-bg-dark)), var(--cb-bg-dark)); border: .0625rem solid color-mix(in srgb, var(--cb-color-gold) 36%, transparent); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-xl); }
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
.home-section--soft { background: var(--cb-bg-soft); }.home-section--dark { background: var(--cb-bg-dark); }
.section-heading { display: grid; margin-bottom: var(--cb-space-10); gap: var(--cb-space-4); }.section-heading>div { display: grid; gap: var(--cb-space-2); }.section-heading>p { max-width: 34rem; }.section-heading--center { justify-items: center; text-align: center; }
.book-grid,.coffee-grid,.event-grid,.benefit-grid { display: grid; gap: var(--cb-space-6); }.book-card,.coffee-card,.event-card,.benefit-card { overflow: hidden; }
.book-card,.coffee-card { display: grid; padding: 0; }.book-card__cover { position: relative; display: flex; min-height: 21rem; padding: var(--cb-space-6); flex-direction: column; justify-content: space-between; color: var(--cb-color-ivory); }
.book-card__cover::after { position: absolute; inset: var(--cb-space-4); border: .0625rem solid color-mix(in srgb,var(--cb-color-cream) 28%,transparent); border-radius: var(--cb-radius-md); content: ""; }
.book-card__cover>* { position: relative; z-index: 1; }.book-card__cover span,.book-card__cover small { font-size: var(--cb-font-size-xs); letter-spacing: .12em; }.book-card__cover strong { max-width: 8ch; font-family: var(--cb-font-display); font-size: var(--cb-font-size-3xl); }
.book-card__cover--sunset { background: linear-gradient(145deg,var(--cb-color-caramel),var(--cb-color-coffee)); }.book-card__cover--forest { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-success) 70%,var(--cb-bg-dark)),var(--cb-bg-dark)); }.book-card__cover--earth { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-color-gold) 58%,var(--cb-color-coffee)),var(--cb-color-espresso)); }.book-card__cover--night { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-info) 50%,var(--cb-bg-dark)),var(--cb-bg-dark)); }
.book-card__content,.coffee-card__content { display: flex; padding: var(--cb-space-5); flex-direction: column; gap: var(--cb-space-3); }.card-topline { display: flex; align-items: center; justify-content: space-between; gap: var(--cb-space-3); }.card-topline>span { color: var(--cb-color-caramel); font-size: var(--cb-font-size-sm); font-weight: var(--cb-font-semibold); }.card-topline>strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-xl); }
.book-card__content h3,.coffee-card__content h3,.event-card h3,.benefit-card h3,.post-item h3 { font-size: var(--cb-font-size-xl); }.book-card__content small { color: var(--cb-text-muted); }.book-card__content :deep(.base-button) { width: fit-content; margin-top: auto; padding-inline: 0; }.coffee-card__content :deep(.base-button) { width: 100%; margin-top: auto; }
.coffee-card__visual { position: relative; display: grid; min-height: 15rem; place-items: center; overflow: hidden; }.coffee-card__visual--floral { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-color-gold) 38%,var(--cb-bg-soft)),var(--cb-color-cream)); }.coffee-card__visual--cold { background: linear-gradient(145deg,color-mix(in srgb,var(--cb-info) 28%,var(--cb-bg-soft)),color-mix(in srgb,var(--cb-color-coffee) 35%,var(--cb-bg-soft))); }.coffee-card__visual--latte { background: linear-gradient(145deg,var(--cb-color-cream),color-mix(in srgb,var(--cb-color-caramel) 42%,var(--cb-bg-soft))); }.coffee-card__visual--gift { background: linear-gradient(145deg,var(--cb-color-coffee),var(--cb-bg-dark)); }
.coffee-card__cup { position: relative; z-index: 1; width: 7rem; height: 6rem; background: var(--cb-bg-surface); border-radius: var(--cb-radius-md) var(--cb-radius-md) var(--cb-radius-2xl) var(--cb-radius-2xl); box-shadow: var(--cb-shadow-lg); }.coffee-card__cup::after { position: absolute; top: 18%; right: -2.25rem; width: 3rem; height: 3.25rem; border: .65rem solid var(--cb-bg-surface); border-left: 0; border-radius: 0 var(--cb-radius-pill) var(--cb-radius-pill) 0; content: ""; }.coffee-card__cup span { position: absolute; top: var(--cb-space-2); left: 9%; width: 82%; height: 1rem; background: var(--cb-color-espresso); border-radius: var(--cb-radius-pill); }
.coffee-card__bean { position: absolute; width: 2rem; height: 1.15rem; background: var(--cb-color-coffee); border-radius: var(--cb-radius-pill); transform: rotate(32deg); }.coffee-card__bean::after { position: absolute; top: 12%; left: 50%; width: .0625rem; height: 76%; background: var(--cb-color-cream); content: ""; }.coffee-card__bean--one { top: 18%; left: 18%; }.coffee-card__bean--two { right: 15%; bottom: 20%; transform: rotate(-20deg); }
.event-grid { gap: var(--cb-space-5); }.event-card { display: grid; grid-template-columns: 5.25rem minmax(0,1fr); padding: 0; }.event-card__date { display: flex; padding: var(--cb-space-4); flex-direction: column; align-items: center; justify-content: center; color: var(--cb-text-inverse); text-align: center; background: var(--cb-color-coffee); }.event-card__date strong { font-family: var(--cb-font-display); font-size: var(--cb-font-size-2xl); }.event-card__body { display: flex; padding: var(--cb-space-5); flex-direction: column; align-items: flex-start; gap: var(--cb-space-3); }.event-card dl { display: grid; width: 100%; margin: 0; gap: var(--cb-space-2); }.event-card dl div { display: flex; justify-content: space-between; gap: var(--cb-space-3); font-size: var(--cb-font-size-sm); }.event-card dt { color: var(--cb-text-muted); }.event-card dd { margin: 0; color: var(--cb-text-secondary); }
.community-grid { display: grid; gap: var(--cb-space-8); }.community-intro { display: flex; padding: clamp(var(--cb-space-6),5vw,var(--cb-space-10)); flex-direction: column; align-items: flex-start; justify-content: center; gap: var(--cb-space-5); }.community-intro h2 { max-width: 16ch; font-size: clamp(var(--cb-font-size-3xl),5vw,var(--cb-font-size-5xl)); }.community-intro__metrics { display: flex; gap: var(--cb-space-8); }.community-intro__metrics div { display: grid; }.community-intro__metrics strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-3xl); }.community-intro__metrics span { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.post-list { display: grid; align-content: center; gap: var(--cb-space-3); }.post-item { display: grid; padding: var(--cb-space-5); grid-template-columns: auto minmax(0,1fr) auto; gap: var(--cb-space-4); align-items: center; background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); transition: box-shadow var(--cb-duration-normal) var(--cb-ease-standard),transform var(--cb-duration-normal) var(--cb-ease-emphasized); }.post-item:hover { box-shadow: var(--cb-shadow-hover); transform: translateX(var(--cb-space-1)); }.post-item__avatar { display: inline-grid; width: 2.75rem; height: 2.75rem; place-items: center; color: var(--cb-text-inverse); font-weight: var(--cb-font-bold); background: var(--cb-color-coffee); border-radius: var(--cb-radius-pill); }.post-item__meta { display: flex; margin-top: var(--cb-space-2); flex-wrap: wrap; gap: var(--cb-space-2) var(--cb-space-4); justify-content: space-between; color: var(--cb-text-muted); font-size: var(--cb-font-size-xs); }.post-item__arrow { color: var(--cb-color-caramel); }
.booking-panel { display: grid; padding: clamp(var(--cb-space-6),6vw,var(--cb-space-12)); gap: var(--cb-space-8); background: linear-gradient(135deg,var(--cb-bg-surface),color-mix(in srgb,var(--cb-color-cream) 62%,var(--cb-bg-surface))); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-lg); }.booking-panel__copy { display: flex; flex-direction: column; align-items: flex-start; gap: var(--cb-space-4); }.booking-panel__copy p { max-width: 34rem; }.booking-panel__availability { display: flex; padding: var(--cb-space-6); flex-direction: column; gap: var(--cb-space-4); background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); box-shadow: var(--cb-shadow-sm); }.booking-panel__time { font-family: var(--cb-font-display); font-size: clamp(var(--cb-font-size-2xl),4vw,var(--cb-font-size-4xl)); }.booking-panel__seats { display: flex; align-items: end; justify-content: space-between; color: var(--cb-text-muted); }.booking-panel__seats strong { color: var(--cb-color-coffee); font-family: var(--cb-font-display); font-size: var(--cb-font-size-4xl); }.booking-panel__slots { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }.booking-panel__slots span { padding: var(--cb-space-2) var(--cb-space-3); background: var(--cb-bg-soft); border-radius: var(--cb-radius-pill); }
.benefit-card { position: relative; display: flex; min-height: 15rem; padding: var(--cb-space-7); flex-direction: column; justify-content: flex-end; gap: var(--cb-space-3); }.benefit-card__index { position: absolute; top: var(--cb-space-5); right: var(--cb-space-5); color: color-mix(in srgb,var(--cb-color-coffee) 25%,transparent); font-family: var(--cb-font-display); font-size: var(--cb-font-size-5xl); font-weight: var(--cb-font-bold); }
.cta-section { padding-top: 0; }.cta-panel { display: flex; padding: clamp(var(--cb-space-8),8vw,var(--cb-space-20)); flex-direction: column; align-items: center; gap: var(--cb-space-5); color: var(--cb-color-ivory); text-align: center; background: radial-gradient(circle at 20% 10%,color-mix(in srgb,var(--cb-color-gold) 28%,transparent),transparent 35%),linear-gradient(135deg,var(--cb-color-coffee),var(--cb-bg-dark)); border-radius: var(--cb-radius-2xl); box-shadow: var(--cb-shadow-xl); }.cta-panel h2 { max-width: 18ch; color: var(--cb-color-ivory); font-size: clamp(var(--cb-font-size-3xl),6vw,var(--cb-font-size-5xl)); }.cta-panel p { max-width: 38rem; color: var(--cb-color-cream); }
.home-toast { position: fixed; z-index: var(--cb-z-toast); right: var(--cb-space-4); bottom: var(--cb-space-4); width: min(calc(100% - (var(--cb-space-4)*2)),24rem); }
[data-reveal] { opacity: 0; transform: translateY(var(--cb-space-5)); transition: opacity var(--cb-duration-slow) var(--cb-ease-standard),transform var(--cb-duration-slow) var(--cb-ease-emphasized); }[data-reveal].is-visible { opacity: 1; transform: translateY(0); }
@keyframes hero-enter { from { opacity: 0; transform: translateY(var(--cb-space-5)); } to { opacity: 1; transform: translateY(0); } }@keyframes gentle-float { from { transform: translateY(0) rotate(-.4deg); } to { transform: translateY(calc(var(--cb-space-3)*-1)) rotate(.4deg); } }
@media (min-width:40rem) { .book-grid,.coffee-grid,.benefit-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.event-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.section-heading { grid-template-columns: minmax(0,1fr) minmax(16rem,.8fr); align-items: end; }.section-heading--center { grid-template-columns: 1fr; } }
@media (min-width:64rem) { .hero__grid { grid-template-columns: minmax(0,1.05fr) minmax(25rem,.95fr); padding-block: var(--cb-space-16); }.stats-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }.stat-item+.stat-item { border-left: .0625rem solid var(--cb-border-soft); }.community-grid,.booking-panel { grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr); }.booking-panel { align-items: center; } }
@media (min-width:80rem) { .book-grid,.coffee-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }.event-grid,.benefit-grid { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media (max-width:39.999rem) { .hero__grid { min-height: auto; padding-block: var(--cb-space-10) var(--cb-space-16); }.hero__actions,.hero__actions :deep(.base-button) { width: 100%; }.hero-art__card { min-height: 25rem; padding: var(--cb-space-5); }.hero-art__book--back { left: 10%; }.hero-art__book--front { left: 24%; }.hero-art__cup { right: 8%; width: 6.5rem; height: 5.5rem; }.hero-art__saucer { right: 3%; width: 9.5rem; }.event-card { grid-template-columns: 4.5rem minmax(0,1fr); }.post-item { grid-template-columns: auto minmax(0,1fr); }.post-item__arrow { display: none; }.community-intro__metrics { gap: var(--cb-space-5); }.cta-panel { width: calc(100% - (var(--cb-space-4)*2)); } }
@media (prefers-reduced-motion:reduce) { .hero__stagger,.hero-art { opacity: 1; animation: none; }[data-reveal] { opacity: 1; transform: none; transition: none; } }
</style>
