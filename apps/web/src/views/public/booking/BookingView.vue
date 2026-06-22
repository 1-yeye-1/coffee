<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getCaptcha } from '@/api/auth'
import { BaseBadge, BaseButton, BaseInput, BaseTextarea, BaseToast, EmptyState } from '@/components/base'
import BookingProgress from '@/components/booking/BookingProgress.vue'
import ReservationCard from '@/components/booking/ReservationCard.vue'
import SeatTooltip from '@/components/booking/SeatTooltip.vue'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useSeatMotion } from '@/composables/useSeatMotion'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = iso(new Date())
const maxDateValue = new Date(); maxDateValue.setDate(maxDateValue.getDate() + 30)
const maxDate = iso(maxDateValue)
const dateCards = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); return iso(date) })
const timeSlots = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00']
const selectedDate = ref('')
const selectedTime = ref('')
const selectedSeatId = ref(null)
const peopleCount = ref(1)
const name = ref(authStore.user?.nickname || authStore.user?.username || '')
const phone = ref(authStore.user?.phone || '')
const code = ref('')
const captchaId = ref('')
const captchaImage = ref('')
const note = ref('')
const error = ref('')
const successMessage = ref('')
const captchaLoading = ref(false)
const submitting = ref(false)
const toastVisible = ref(false)
const reservation = ref(null)
const tooltipSeat = ref(null)
const tooltipVisible = ref(false)
const tooltipRef = ref(null)
const tooltipStyle = ref({})
const pageRef = ref(null)
let tooltipTimer = 0

const { revealCards } = useGsapReveal(pageRef)
const { animateCounts } = useGsapNumber()
const { successCheck, shakeError, pulseBadge, floatEmpty } = useAnimeMotion()
const { revealSeatMap, revealProgress, showTooltip, hideTooltip, focusSeat, clearSeatFocus, pulseSeat, showReservationCard } = useSeatMotion(pageRef)

const seats = computed(() => bookingStore.availability.length
  ? bookingStore.availability
  : bookingStore.seats.map((seat) => ({ ...seat, seatId: seat.id })))
const selectedSeat = computed(() => seats.value.find((seat) => Number(seat.seatId) === Number(selectedSeatId.value)))
const displaySeats = computed(() => seats.value.map((seat) => ({
  ...seat,
  displayStatus: Number(seat.seatId) === Number(selectedSeatId.value) ? 'selected' : seat.status,
})))
const hasAvailableSeats = computed(() => seats.value.some((seat) => seat.status === 'available'))
const currentStep = computed(() => selectedSeatId.value ? 4 : selectedTime.value ? 3 : selectedDate.value ? 2 : 1)
const availableCount = computed(() => seats.value.filter((seat) => seat.status === 'available').length)
const reservedCount = computed(() => seats.value.filter((seat) => seat.status === 'reserved').length)
const usageRate = computed(() => seats.value.length ? Math.round((reservedCount.value / seats.value.length) * 100) : 0)
const popularArea = computed(() => {
  const counts = seats.value.reduce((result, seat) => {
    const area = seat.area || '阅读区'
    result[area] = (result[area] || 0) + (seat.status === 'reserved' ? 2 : 1)
    return result
  }, {})
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '阅读区'
})
const occupancyStats = computed(() => [usageRate.value, availableCount.value, reservedCount.value])
const dateLabel = (value, index) => `${index === 0 ? '今天 · ' : index === 1 ? '明天 · ' : ''}${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T12:00:00`))}`

function selectDate(value) {
  selectedDate.value = value
  selectedTime.value = ''
  selectedSeatId.value = null
  bookingStore.availability = []
  clearSeatFocus('.map-seat')
}

function selectTime(value) {
  selectedTime.value = value
  selectedSeatId.value = null
  clearSeatFocus('.map-seat')
}

async function refreshAvailability() {
  selectedSeatId.value = null
  if (!selectedDate.value || !selectedTime.value) return
  try { await bookingStore.fetchAvailability(selectedDate.value, selectedTime.value) }
  catch (requestError) { error.value = requestError.message }
}

watch([selectedDate, selectedTime], refreshAvailability)

async function refreshCaptcha() {
  error.value = ''
  captchaLoading.value = true
  try {
    const response = await getCaptcha()
    captchaId.value = response.data.captchaId
    captchaImage.value = response.data.image
    code.value = ''
  } catch (requestError) { error.value = requestError.message }
  finally { captchaLoading.value = false }
}

function validate() {
  if (!selectedDate.value) return '请选择日期'
  if (!selectedTime.value) return '请选择时间段'
  if (!selectedSeatId.value) return '请选择座位'
  if (!peopleCount.value) return '请选择人数'
  if (peopleCount.value > Number(selectedSeat.value?.capacity || 0)) return '预约人数超过座位容量'
  if (!authStore.isAuthenticated && (!name.value.trim() || !/^1\d{10}$/.test(phone.value) || !code.value.trim())) return '请填写姓名、手机号和验证码'
  return ''
}

function formatReservation(result, seatSnapshot) {
  const booking = result?.booking || result || {}
  return {
    bookingNo: booking.bookingNo,
    nickname: result?.user?.nickname || authStore.user?.nickname || authStore.user?.username || name.value,
    date: booking.date || booking.bookingDate || selectedDate.value,
    timeSlot: booking.timeSlot || selectedTime.value,
    seatCode: booking.seatCode || booking.seat || seatSnapshot?.code,
    createdAt: new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.createdAt || Date.now())),
  }
}

async function submit() {
  error.value = validate()
  if (error.value) {
    await nextTick()
    shakeError(pageRef.value?.querySelector('.is-error'))
    return
  }
  submitting.value = true
  const seatSnapshot = { ...selectedSeat.value }
  const payload = { spaceSlug: 'city-reading-room', date: selectedDate.value, timeSlot: selectedTime.value, seatId: selectedSeatId.value, peopleCount: peopleCount.value, contactName: name.value || authStore.user?.nickname, name: name.value, phone: phone.value || authStore.user?.phone, captchaId: captchaId.value, captchaCode: code.value, note: note.value.trim() }
  try {
    let result
    if (authStore.isAuthenticated) {
      result = await bookingStore.createBooking(payload)
      successMessage.value = '预约成功，可在会员中心查看。'
    } else {
      result = await bookingStore.createGuestBooking(payload)
      successMessage.value = result.message
    }
    reservation.value = formatReservation(result, seatSnapshot)
    await refreshAvailability()
    toastVisible.value = false
    await nextTick()
    toastVisible.value = true
    showReservationCard('.reservation-card')
    successCheck(pageRef.value?.querySelector('.reservation-card__check'))
  } catch (requestError) {
    error.value = requestError.message
    if (!authStore.isAuthenticated) await refreshCaptcha()
  } finally { submitting.value = false }
}

function chooseSeat(seat, event) {
  if (!selectedTime.value || seat.status !== 'available') {
    shakeError(event?.currentTarget)
    return
  }
  selectedSeatId.value = seat.seatId
  pulseSeat(event?.currentTarget)
  focusSeat(event?.currentTarget, '.map-seat')
}

async function hoverSeat(seat) {
  window.clearTimeout(tooltipTimer)
  tooltipSeat.value = seat
  tooltipStyle.value = { left: `${seat.x}%`, top: `${seat.y}%` }
  tooltipVisible.value = true
  await nextTick()
  showTooltip(tooltipRef.value?.$el || tooltipRef.value)
}

function leaveSeat() {
  hideTooltip(tooltipRef.value?.$el || tooltipRef.value)
  tooltipTimer = window.setTimeout(() => {
    tooltipVisible.value = false
    tooltipSeat.value = null
  }, 180)
}

watch(currentStep, async (step) => {
  await nextTick()
  if (step === 2) revealProgress('[data-step="2"]')
  if (step === 3) {
    revealProgress('.booking-map-panel')
    revealSeatMap('.map-seat')
  }
  if (step === 4) revealProgress('.booking-confirm')
  pulseBadge(pageRef.value?.querySelector('.booking-progress .is-active:last-child'))
})

watch(() => seats.value.map((seat) => `${seat.seatId}:${seat.status}`).join(','), async () => {
  await nextTick()
  if (selectedTime.value) revealSeatMap('.map-seat')
  floatEmpty(pageRef.value?.querySelector('.empty-state'))
  animateCounts(pageRef.value?.querySelectorAll('[data-occupancy-count]') || [], occupancyStats.value)
}, { flush: 'post' })

onMounted(async () => {
  const results = await Promise.allSettled([bookingStore.fetchSpaces(), bookingStore.fetchSeats(), authStore.isAuthenticated ? Promise.resolve() : refreshCaptcha()])
  const failed = results.find((result) => result.status === 'rejected')
  if (failed && !error.value) error.value = failed.reason?.message || '预约数据加载失败，请稍后重试。'
  await nextTick()
  revealCards('.date-strip button', { key: 'booking-dates', limit: 7, stagger: 0.045 })
  animateCounts(pageRef.value?.querySelectorAll('[data-occupancy-count]') || [], occupancyStats.value)
})

onBeforeUnmount(() => window.clearTimeout(tooltipTimer))
</script>

<template>
  <div ref="pageRef" class="engagement-page cb-fade-in">
    <section class="engagement-hero"><div class="cb-container engagement-hero__grid"><div class="engagement-hero__copy"><span class="section-eyebrow">Space Booking</span><h1 class="page-title">预约中心</h1><p class="page-subtitle">选择日期、时间与座位，为阅读和相聚留下一段安静时光。</p></div><div class="engagement-hero__art"><strong>A quiet seat is waiting.</strong></div></div></section>

    <section class="cb-container occupancy-grid" aria-label="空间使用概览">
      <article><span>今日使用率</span><strong><b data-occupancy-count>{{ usageRate }}</b>%</strong></article>
      <article><span>当前空闲座位</span><strong data-occupancy-count>{{ availableCount }}</strong></article>
      <article><span>今日预约数</span><strong data-occupancy-count>{{ reservedCount }}</strong></article>
      <article><span>热门区域</span><strong>{{ popularArea }}</strong></article>
    </section>

    <main class="cb-container engagement-content booking-layout booking-layout--map">
      <section class="booking-panel booking-form">
        <div><BaseBadge :variant="authStore.isAuthenticated ? 'success' : 'neutral'">{{ authStore.isAuthenticated ? '已登录预约' : '游客验证码预约' }}</BaseBadge><h2 class="section-title">选择预约信息</h2></div>
        <BookingProgress :current-step="currentStep" />
        <div class="booking-step" data-step="1"><strong>Step 1 · 选择日期</strong><div class="date-strip"><button v-for="(date,index) in dateCards" :key="date" type="button" :class="{ 'is-active': selectedDate===date }" @click="selectDate(date)">{{ dateLabel(date,index) }}</button></div><BaseInput v-model="selectedDate" type="date" label="其他日期" :min="today" :max="maxDate" /></div>
        <div v-if="selectedDate" class="booking-step" data-step="2"><strong>Step 2 · 选择时间段</strong><div class="time-grid"><button v-for="slot in timeSlots" :key="slot" type="button" :class="{ 'is-active': selectedTime===slot }" @click="selectTime(slot)">{{ slot }}</button></div></div>

        <div v-if="selectedSeatId" class="booking-confirm">
          <strong>Step 4 · 确认预约</strong>
          <div class="people-picker"><button v-for="count in 4" :key="count" type="button" :class="{ 'is-active': peopleCount===count }" @click="peopleCount=count">{{ count }} 人</button></div>
          <div v-if="!authStore.isAuthenticated" class="guest-fields"><BaseInput v-model="name" label="姓名" /><BaseInput v-model="phone" label="手机号" /><div class="code-row"><BaseInput v-model="code" label="图片验证码" :maxlength="5" /><button class="captcha-image" type="button" :disabled="captchaLoading" aria-label="刷新图片验证码" @click="refreshCaptcha"><img v-if="captchaImage" :src="captchaImage" alt="图片验证码" /><span v-else>刷新验证码</span></button></div><p class="text-muted">点击图片可刷新验证码。预约成功后，未注册手机号会自动创建账号。</p></div>
          <div v-else class="member-identity"><strong>{{ authStore.user?.nickname || authStore.user?.username }}</strong><span>{{ authStore.user?.phone }}</span></div>
          <BaseTextarea v-model="note" label="备注" placeholder="选填，例如需要插座等。" :maxlength="120" show-count />
          <p v-if="error" class="is-error" role="alert">{{ error }}</p>
          <BaseButton size="lg" :loading="submitting" @click="submit">确认预约</BaseButton>
        </div>
        <p v-else-if="error" class="is-error" role="alert">{{ error }}</p>
        <BaseButton v-if="authStore.isAuthenticated" variant="ghost" @click="router.push('/account/bookings')">查看我的预约</BaseButton>
      </section>

      <aside v-if="selectedTime" class="booking-map-panel">
        <div><span class="section-eyebrow">Step 3</span><h2 class="section-title">选择座位</h2><p class="text-muted">{{ selectedDate }} · {{ selectedTime }}</p></div>
        <div class="seat-legend"><span><i class="available" />可选</span><span><i class="reserved" />已预约</span><span><i class="selected" />已选</span><span><i class="maintenance" />维护中</span></div>
        <div class="floor-scroll"><div class="floor-map" :class="{ 'has-focus': selectedSeatId }"><div class="floor-zone floor-zone--window">落地窗</div><div class="floor-zone floor-zone--shelf">书架区</div><div class="floor-zone floor-zone--bar">咖啡吧台</div><button v-for="seat in displaySeats" :key="seat.seatId" class="map-seat" data-cursor="BOOK" :class="[`is-${seat.displayStatus}`, { 'is-selected': selectedSeatId===seat.seatId }]" :style="{ left:`${seat.x}%`, top:`${seat.y}%` }" type="button" :aria-disabled="seat.status!=='available'" :tabindex="seat.status==='available' ? 0 : -1" :title="`${seat.name} · ${seat.area} · ${seat.capacity}人 · ${seat.status}`" @pointerenter="hoverSeat(seat)" @pointerleave="leaveSeat" @click="chooseSeat(seat, $event)"><span class="map-seat__content"><span v-if="seat.status==='reserved'" class="map-seat__lock" aria-hidden="true" /><strong>{{ seat.code }}</strong><small>{{ seat.capacity }}人</small></span></button><SeatTooltip v-show="tooltipVisible" ref="tooltipRef" :seat="tooltipSeat" :style="tooltipStyle" /></div></div>
        <EmptyState v-if="!hasAvailableSeats" title="当前时段暂无可用座位" description="请选择其他时间段。" />
        <section v-if="selectedSeat" class="booking-summary"><h3>预约摘要</h3><div><span>日期</span><strong>{{ selectedDate }}</strong></div><div><span>时间</span><strong>{{ selectedTime }}</strong></div><div><span>座位</span><strong>{{ selectedSeat.name }}</strong></div><div><span>人数</span><strong>{{ peopleCount }} 人</strong></div></section>
      </aside>
    </main>

    <section v-if="reservation" class="cb-container reservation-section"><ReservationCard :reservation="reservation" /></section>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="预约成功">{{ successMessage }}</BaseToast></div>
  </div>
</template>

<style scoped>
.occupancy-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--cb-space-3);padding-top:var(--cb-space-6)}.occupancy-grid article{display:grid;padding:var(--cb-space-4);gap:var(--cb-space-2);background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-lg);box-shadow:var(--cb-shadow-sm)}.occupancy-grid span{color:var(--cb-text-muted);font-size:var(--cb-font-size-sm)}.occupancy-grid strong{font-size:var(--cb-font-size-2xl)}.occupancy-grid b{font:inherit}.booking-layout--map{grid-template-columns:minmax(0,.85fr) minmax(34rem,1.15fr);align-items:start}.booking-form,.booking-step,.booking-confirm,.guest-fields,.booking-map-panel,.booking-summary{display:grid;gap:var(--cb-space-4)}.booking-confirm{padding-top:var(--cb-space-4);border-top:.0625rem dashed var(--cb-border-strong)}.date-strip{display:flex;gap:var(--cb-space-2);overflow-x:auto;padding-bottom:var(--cb-space-2)}.date-strip button,.time-grid button,.people-picker button{min-height:2.75rem;padding:var(--cb-space-2) var(--cb-space-4);color:var(--cb-text-secondary);white-space:nowrap;background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-lg)}.date-strip button:hover,.time-grid button:hover,.people-picker button:hover{border-color:var(--cb-color-gold);transform:translateY(-1px)}.date-strip .is-active,.time-grid .is-active,.people-picker .is-active{color:var(--cb-text-inverse);background:var(--cb-color-coffee);border-color:var(--cb-color-coffee)}.time-grid,.people-picker{display:flex;flex-wrap:wrap;gap:var(--cb-space-2)}.code-row{display:grid;grid-template-columns:1fr auto;gap:var(--cb-space-3);align-items:end}.member-identity{display:flex;padding:var(--cb-space-4);justify-content:space-between;color:var(--cb-text-primary);background:var(--cb-bg-soft);border-radius:var(--cb-radius-lg)}.booking-map-panel{padding:var(--cb-space-5);background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-xl)}.seat-legend{display:flex;flex-wrap:wrap;gap:var(--cb-space-4);font-size:var(--cb-font-size-sm)}.seat-legend span{display:flex;align-items:center;gap:var(--cb-space-2)}.seat-legend i{width:.8rem;height:.8rem;border-radius:var(--cb-radius-sm)}.available{background:var(--cb-success)}.reserved{background:var(--cb-text-muted)}.selected{background:var(--cb-color-gold)}.maintenance{background:var(--cb-warning)}.floor-scroll{overflow-x:auto}.floor-map{position:relative;min-width:36rem;height:30rem;overflow:hidden;background:linear-gradient(135deg,var(--cb-bg-soft),var(--cb-bg-page));border:.125rem solid var(--cb-border-strong);border-radius:var(--cb-radius-xl)}.floor-zone{position:absolute;padding:var(--cb-space-2);color:var(--cb-text-muted);font-size:var(--cb-font-size-xs);letter-spacing:.12em;border:.0625rem dashed var(--cb-border-strong)}.floor-zone--window{inset:0 0 auto 0;text-align:center}.floor-zone--shelf{top:24%;right:2%;height:42%;writing-mode:vertical-rl}.floor-zone--bar{right:8%;bottom:5%;left:48%;text-align:center}.map-seat{position:absolute;display:grid;width:4.25rem;height:3.5rem;place-content:center;color:var(--cb-text-primary);background:color-mix(in srgb,var(--cb-success) 18%,var(--cb-bg-surface));border:.125rem solid var(--cb-success);border-radius:var(--cb-radius-lg);transform:translate(-50%,-50%);transition:opacity var(--cb-duration-normal),box-shadow var(--cb-duration-normal),border-color var(--cb-duration-fast),background var(--cb-duration-fast)}.map-seat:hover:not([aria-disabled="true"]){box-shadow:var(--cb-shadow-md)}.map-seat__content{position:relative;display:grid;place-items:center}.map-seat small{font-size:var(--cb-font-size-xs)}.map-seat.is-reserved{color:var(--cb-text-muted);background:repeating-linear-gradient(135deg,var(--cb-bg-soft) 0,var(--cb-bg-soft) .35rem,color-mix(in srgb,var(--cb-border-strong) 28%,var(--cb-bg-soft)) .35rem,color-mix(in srgb,var(--cb-border-strong) 28%,var(--cb-bg-soft)) .7rem);border-color:var(--cb-border-strong);cursor:not-allowed}.map-seat__lock{position:absolute;top:-1rem;right:-.9rem;font-size:.7rem}.map-seat.is-maintenance{color:var(--cb-text-muted);background:repeating-linear-gradient(45deg,var(--cb-bg-soft) 0,var(--cb-bg-soft) .3rem,color-mix(in srgb,var(--cb-warning) 16%,var(--cb-bg-soft)) .3rem,color-mix(in srgb,var(--cb-warning) 16%,var(--cb-bg-soft)) .6rem);border-color:var(--cb-warning);cursor:not-allowed}.map-seat.is-selected{z-index:3;color:var(--cb-color-espresso);background:var(--cb-color-gold);border-color:var(--cb-color-caramel);box-shadow:0 0 0 .25rem color-mix(in srgb,var(--cb-color-gold) 28%,transparent),var(--cb-shadow-md)}.seat-motion-ring{position:absolute;inset:-.3rem;border:.12rem solid var(--cb-color-gold);border-radius:inherit;pointer-events:none}.booking-summary{padding:var(--cb-space-4);background:var(--cb-bg-soft);border-radius:var(--cb-radius-lg)}.booking-summary div{display:flex;justify-content:space-between;gap:var(--cb-space-4)}.booking-summary span{color:var(--cb-text-muted)}.captcha-image{width:9.375rem;height:3rem;padding:0;overflow:hidden;background:var(--cb-bg-soft);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-md)}.captcha-image img{display:block;width:100%;height:100%;object-fit:cover}.reservation-section{padding-bottom:var(--cb-space-12)}
.map-seat__lock{top:-.85rem;right:-.6rem;width:.7rem;height:.55rem;font-size:0;border:.1rem solid currentcolor;border-radius:.12rem}.map-seat__lock::before{position:absolute;bottom:100%;left:.08rem;width:.34rem;height:.3rem;border:.1rem solid currentcolor;border-bottom:0;border-radius:.3rem .3rem 0 0;content:""}:deep(.seat-motion-ring){position:absolute;inset:-.3rem;border:.12rem solid var(--cb-color-gold);border-radius:inherit;pointer-events:none}
@media(max-width:64rem){.booking-layout--map{grid-template-columns:1fr}.booking-map-panel{min-width:0}}@media(max-width:50rem){.occupancy-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:36rem){.code-row{grid-template-columns:1fr}}
</style>
