<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import * as authApi from '@/api/auth'
import { fetchSeatAvailability } from '@/api/booking'
import { BaseButton, BaseInput, BaseTextarea, BaseToast, EmptyState } from '@/components/base'
import BookingProgress from '@/components/booking/BookingProgress.vue'
import ReservationCard from '@/components/booking/ReservationCard.vue'
import SeatTooltip from '@/components/booking/SeatTooltip.vue'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapNumber } from '@/composables/useGsapNumber'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { useSeatMotion } from '@/composables/useSeatMotion'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import SeatMap from '../../../../../shared/components/SeatMap.vue'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = iso(new Date())
const maxDateValue = new Date()
maxDateValue.setDate(maxDateValue.getDate() + 30)
const maxDate = iso(maxDateValue)
const dateCards = Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index)
  return iso(date)
})

const selectedSeatId = ref(null)
const selectedDate = ref('')
const selectedTime = ref('')
const slotAvailability = ref({})
const slotAvailabilityLoading = ref(false)
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
const pageRef = ref(null)
const stepIndex = ref(1)
let tooltipTimer = 0

const { revealCards } = useGsapReveal(pageRef)
const { animateCounts } = useGsapNumber()
const { successCheck, shakeError, pulseBadge, floatEmpty } = useAnimeMotion()
const { revealSeatMap, revealProgress, showTooltip, hideTooltip, focusSeat, clearSeatFocus, pulseSeat, showReservationCard } = useSeatMotion(pageRef)

const fixedTimeSlots = [
  { label: '09:00 - 10:30', value: '09:00-10:30', start: '09:00', end: '10:30' },
  { label: '10:30 - 12:00', value: '10:30-12:00', start: '10:30', end: '12:00' },
  { label: '13:00 - 14:30', value: '13:00-14:30', start: '13:00', end: '14:30' },
  { label: '14:30 - 16:00', value: '14:30-16:00', start: '14:30', end: '16:00' },
  { label: '16:00 - 17:30', value: '16:00-17:30', start: '16:00', end: '17:30' },
  { label: '18:00 - 20:00', value: '18:00-20:00', start: '18:00', end: '20:00' },
]
const seats = computed(() => bookingStore.availability.length ? bookingStore.availability : bookingStore.seats.map((seat) => ({ ...seat, seatId: seat.id })))
const selectedSeat = computed(() => seats.value.find((seat) => Number(seat.seatId) === Number(selectedSeatId.value)))
const displaySeats = computed(() => seats.value.map((seat) => ({
  ...seat,
  displayStatus: Number(seat.seatId) === Number(selectedSeatId.value) ? 'selected' : seat.status,
})))
const hasAvailableSeats = computed(() => seats.value.some((seat) => seat.status === 'available'))
const currentStep = computed(() => reservation.value ? 4 : stepIndex.value)
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
const readyToConfirm = computed(() => Boolean(selectedSeatId.value && selectedDate.value && selectedTime.value))
const stepTitle = computed(() => ['选择预约对象', '选择日期和时间', '填写预约信息', '确认预约'][stepIndex.value - 1] || '空间预约')


function getDateValidationMessage(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return '\u8bf7\u6309 YYYY-MM-DD \u683c\u5f0f\u8f93\u5165\u65e5\u671f'
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  const normalized = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`
  if (normalized !== text) return '\u9884\u7ea6\u65e5\u671f\u4e0d\u5b58\u5728\uff0c\u8bf7\u91cd\u65b0\u8f93\u5165'
  if (text < today || text > maxDate) return `\u8bf7\u9009\u62e9 ${today} \u81f3 ${maxDate} \u4e4b\u95f4\u7684\u65e5\u671f`
  return ''
}

function dateLabel(value, index) {
  const date = new Date(`${value}T12:00:00`)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const prefix = index === 0 ? '今天 ' : index === 1 ? '明天 ' : ''
  return `${prefix}${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

function selectSeat(seat, event) {
  if (seat.status !== 'available') {
    shakeError(event.currentTarget)
    return
  }
  selectedSeatId.value = seat.seatId ?? seat.id
  error.value = ''
  focusSeat(event.currentTarget, '.map-seat')
  pulseSeat(event.currentTarget)
}

function validateStep(step = stepIndex.value) {
  if (step === 1 && !selectedSeatId.value) return '请选择预约对象'
  if (step === 2) {
    if (!selectedDate.value) return '请选择预约日期'
    const dateMessage = getDateValidationMessage(selectedDate.value)
    if (dateMessage) return dateMessage
    if (!selectedTime.value) return '请选择预约时间'
  }
  if (step === 3) {
    if (!peopleCount.value) return '请选择预约人数'
    if (peopleCount.value > Number(selectedSeat.value?.capacity || 0)) return '预约人数超过座位容量'
    if (!authStore.isAuthenticated && !name.value.trim()) return '请填写联系人'
    if (!authStore.isAuthenticated && !phone.value.trim()) return '请填写手机号'
    if (!authStore.isAuthenticated && !code.value.trim()) return '请填写验证码'
  }
  return ''
}

function nextStep() {
  error.value = validateStep()
  if (error.value) {
    shakeError('.booking-step-page')
    return
  }
  stepIndex.value = Math.min(4, stepIndex.value + 1)
}

function prevStep() {
  error.value = ''
  stepIndex.value = Math.max(1, stepIndex.value - 1)
}

function selectDate(value) {
  const dateMessage = getDateValidationMessage(value)
  if (dateMessage) {
    error.value = dateMessage
    return
  }
  selectedDate.value = value
  error.value = ''
}

function normalizeManualDate() {
  const value = String(selectedDate.value || '').trim()
  if (!value) return
  const dateMessage = getDateValidationMessage(value)
  if (dateMessage) {
    error.value = dateMessage
    return
  }
  selectedDate.value = value
  error.value = ''
}

function isPastSlot(slot) {
  if (selectedDate.value !== today) return false
  return new Date(`${selectedDate.value}T${slot.start}:00`).getTime() <= Date.now()
}

function slotSeatStatus(slot) {
  return slotAvailability.value[slot.value]?.status || ''
}

function isSlotDisabled(slot) {
  const status = slotSeatStatus(slot)
  return isPastSlot(slot) || ['reserved', 'maintenance', 'disabled', 'unavailable'].includes(status)
}

function slotDisabledReason(slot) {
  if (isPastSlot(slot)) return '已过期'
  const status = slotSeatStatus(slot)
  if (status && status !== 'available' && status !== 'selected') return '该座位已被预约'
  return ''
}

function selectTimeSlot(slot) {
  if (isSlotDisabled(slot)) {
    error.value = slotDisabledReason(slot) || '该时间段不可选'
    return
  }
  selectedTime.value = slot.value
  error.value = ''
}

async function refreshSlotAvailability() {
  if (!selectedDate.value || !selectedSeatId.value) {
    slotAvailability.value = {}
    return
  }
  slotAvailabilityLoading.value = true
  try {
    const entries = await Promise.all(fixedTimeSlots.map(async (slot) => {
      const rows = (await fetchSeatAvailability({ date: selectedDate.value, timeSlot: slot.value })).data || []
      const seat = rows.find((item) => Number(item.seatId) === Number(selectedSeatId.value))
      return [slot.value, seat || null]
    }))
    slotAvailability.value = Object.fromEntries(entries)
    const active = fixedTimeSlots.find((slot) => slot.value === selectedTime.value)
    if (active && isSlotDisabled(active)) selectedTime.value = ''
  } catch {
    slotAvailability.value = {}
  } finally {
    slotAvailabilityLoading.value = false
  }
}

async function refreshAvailability() {
  if (!selectedDate.value || !selectedTime.value) return
  try {
    await bookingStore.fetchAvailability(selectedDate.value, selectedTime.value)
    const selected = seats.value.find((seat) => Number(seat.seatId) === Number(selectedSeatId.value))
    if (selectedSeatId.value && selected?.status !== 'available') {
      selectedSeatId.value = null
      clearSeatFocus('.map-seat')
      error.value = '该座位在当前时间不可预约，请重新选择座位。'
    }
  } catch (requestError) {
    error.value = requestError.message || '座位可用情况加载失败'
  }
}

function validate() {
  return validateStep(1) || validateStep(2) || validateStep(3)
}

function buildReservation(result, seatSnapshot) {
  const booking = result?.booking || result || {}
  return {
    bookingNo: booking.bookingNo,
    spaceName: booking.spaceName || 'Coffee Book 城市阅读店',
    date: booking.date || booking.bookingDate || selectedDate.value,
    timeSlot: booking.timeSlot || selectedTime.value,
    seatCode: booking.seatCode || booking.seat || seatSnapshot?.code,
    createdAt: new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.createdAt || Date.now())),
  }
}

async function submitBooking() {
  error.value = validate()
  if (error.value) {
    shakeError('.booking-confirm')
    return
  }

  submitting.value = true
  const seatSnapshot = { ...selectedSeat.value }
  const payload = {
    spaceSlug: 'city-reading-room',
    date: selectedDate.value,
    timeSlot: selectedTime.value,
    seatId: selectedSeatId.value,
    peopleCount: peopleCount.value,
    contactName: name.value || authStore.user?.nickname,
    name: name.value,
    phone: phone.value || authStore.user?.phone,
    captchaId: captchaId.value,
    captchaCode: code.value,
    note: note.value.trim(),
  }

  try {
    const response = authStore.isAuthenticated ? await bookingStore.createBooking(payload) : await bookingStore.createGuestBooking(payload)
    reservation.value = buildReservation(response.data || response, seatSnapshot)
    successMessage.value = '预约已提交，请在会员中心查看记录。'
    toastVisible.value = true
    showReservationCard('.reservation-card')
    successCheck('.booking-confirm .base-button')
    await refreshAvailability()
  } catch (requestError) {
    error.value = requestError.message || '预约提交失败'
    shakeError('.booking-confirm')
  } finally {
    submitting.value = false
  }
}

function hoverSeat(seat, event) {
  tooltipSeat.value = seat
  window.clearTimeout(tooltipTimer)
  tooltipTimer = window.setTimeout(() => {
    tooltipVisible.value = true
    nextTick(() => showTooltip(tooltipRef.value?.$el || tooltipRef.value, event))
  }, 70)
}

function leaveSeat() {
  window.clearTimeout(tooltipTimer)
  hideTooltip(tooltipRef.value?.$el || tooltipRef.value)
  tooltipVisible.value = false
}

async function refreshCaptcha() {
  captchaLoading.value = true
  try {
    const response = await authApi.getCaptcha()
    captchaId.value = response.data.captchaId
    captchaImage.value = response.data.image
    code.value = ''
  } finally {
    captchaLoading.value = false
  }
}

watch([selectedDate, selectedTime], refreshAvailability)
watch([selectedDate, selectedSeatId], refreshSlotAvailability)
watch(occupancyStats, (values) => nextTick(() => animateCounts('.occupancy-grid strong', values)), { immediate: true })
watch(currentStep, (step) => {
  revealProgress('.booking-progress span')
  if (step >= 2) revealProgress('.booking-time-panel')
  if (step >= 3) revealProgress('.booking-confirm')
  pulseBadge(pageRef.value?.querySelector('.booking-progress .is-active:last-child'))
})
watch(() => bookingStore.availability, () => {
  revealSeatMap('.map-seat')
  if (!hasAvailableSeats.value && selectedDate.value && selectedTime.value) floatEmpty('.booking-map-panel .empty-state')
})

onMounted(async () => {
  const results = await Promise.allSettled([
    bookingStore.fetchSpaces(),
    bookingStore.fetchSeats(),
    authStore.isAuthenticated ? Promise.resolve() : refreshCaptcha(),
  ])
  const failed = results.find((item) => item.status === 'rejected')
  if (failed) error.value = failed.reason?.message || '预约数据加载失败'
  await nextTick()
  revealCards('.booking-panel, .booking-map-panel', { key: 'booking-sections', limit: 6, stagger: 0.04 })
  revealSeatMap('.map-seat')
})
</script>

<template>
  <div ref="pageRef" class="engagement-page booking-page">
    <section class="cb-container engagement-hero">
      <div>
        <span class="section-eyebrow">空间预约</span>
        <h1>预约咖啡书屋座位</h1>
        <p class="page-subtitle">先选择想坐的位置，再选择日期和时间，最后确认联系人信息。</p>
      </div>
      <div class="occupancy-grid">
        <article><span>占用率</span><strong>{{ usageRate }}%</strong></article>
        <article><span>可预约</span><strong>{{ availableCount }}</strong></article>
        <article><span>已预约</span><strong>{{ reservedCount }}</strong></article>
        <article><span>热门区域</span><strong>{{ popularArea }}</strong></article>
      </div>
    </section>

    <main class="cb-container engagement-content booking-flow-shell">
      <BookingProgress :step="currentStep" />
      <Transition name="booking-step-slide" mode="out-in">
        <section v-if="stepIndex === 1" key="seat" class="booking-step-page booking-map-panel">
          <div class="booking-step-page__header">
            <div>
              <span class="section-eyebrow">第 1 步</span>
              <h2 class="section-title">选择预约对象</h2>
              <p class="text-muted">点击地图上的座位。已预约或不可用的位置不能选择。</p>
            </div>
          </div>
          <div class="seat-legend">
            <span><i class="available" />可预约</span>
            <span><i class="reserved" />已预约</span>
            <span><i class="selected" />已选择</span>
            <span><i class="maintenance" />不可用</span>
          </div>
          <SeatMap
            :seats="displaySeats"
            :selected-seat-id="selectedSeatId"
            mode="select"
            @seat-click="selectSeat"
            @seat-pointerenter="hoverSeat"
            @seat-pointerleave="leaveSeat"
          >
            <SeatTooltip v-show="tooltipVisible" ref="tooltipRef" :seat="tooltipSeat" />
          </SeatMap>
          <EmptyState v-if="!hasAvailableSeats" title="当前没有可预约座位" description="请换一个日期或时间再试。" />
          <section v-if="selectedSeat" class="booking-summary">
            <h3>已选择</h3>
            <div><span>座位</span><strong>{{ selectedSeat.name || selectedSeat.code }}</strong></div>
            <div><span>区域</span><strong>{{ selectedSeat.area || '阅读区' }}</strong></div>
            <div><span>容量</span><strong>{{ selectedSeat.capacity || 1 }} 人</strong></div>
          </section>
          <p v-if="error" class="form-error">{{ error }}</p>
          <div class="booking-step-actions">
            <BaseButton :disabled="!selectedSeatId" @click="nextStep">确定座位</BaseButton>
          </div>
        </section>

        <section v-else-if="stepIndex === 2" key="time" class="booking-step-page booking-time-panel">
          <div class="booking-step-page__header">
            <div>
              <span class="section-eyebrow">第 2 步</span>
              <h2 class="section-title">选择日期和时间</h2>
              <p class="text-muted">选择预约日期后，从固定时间段中挑选一个可预约时段；也可以手动输入其他日期。</p>
            </div>
          </div>
          <div class="ios-picker ios-picker--date" aria-label="日期选择">
            <button v-for="(date, index) in dateCards" :key="date" type="button" class="ios-picker__item" :class="{ 'is-active': selectedDate === date }" @click="selectDate(date)">
              {{ dateLabel(date, index) }}
            </button>
          </div>
          <BaseInput
            v-model="selectedDate"
            type="text"
            inputmode="numeric"
            label="选择其他日期"
            placeholder="YYYY-MM-DD，可直接输入"
            :maxlength="10"
            @blur="normalizeManualDate"
            @keydown.enter.prevent="normalizeManualDate"
          />

          <div class="time-slot-grid" aria-label="固定预约时间段">
            <button
              v-for="slot in fixedTimeSlots"
              :key="slot.value"
              type="button"
              class="time-slot-option"
              :class="{ 'is-active': selectedTime === slot.value, 'is-disabled': isSlotDisabled(slot) }"
              :disabled="isSlotDisabled(slot) || slotAvailabilityLoading"
              @click="selectTimeSlot(slot)"
            >
              <strong>{{ slot.label }}</strong>
              <span>{{ slotDisabledReason(slot) || '可预约' }}</span>
            </button>
          </div>
          <p class="text-muted">当前时间段：{{ selectedTime || '请选择时间段' }}</p>
          <p v-if="error" class="form-error">{{ error }}</p>
          <div class="booking-step-actions">
            <BaseButton variant="ghost" type="button" @click="prevStep">返回</BaseButton>
            <BaseButton :disabled="!selectedDate || !selectedTime" @click="nextStep">确定时间</BaseButton>
          </div>
        </section>

        <section v-else-if="stepIndex === 3" key="info" class="booking-step-page booking-confirm">
          <div class="booking-step-page__header">
            <div>
              <span class="section-eyebrow">第 3 步</span>
              <h2 class="section-title">填写预约信息</h2>
              <p class="text-muted">联系人、手机号、备注和人数会在最后一步统一确认。</p>
            </div>
          </div>
          <section class="booking-summary">
            <div><span>日期</span><strong>{{ selectedDate }}</strong></div>
            <div><span>时间</span><strong>{{ selectedTime }}</strong></div>
            <div><span>座位</span><strong>{{ selectedSeat?.name || selectedSeat?.code }}</strong></div>
          </section>

          <div class="people-picker" aria-label="预约人数">
            <button v-for="count in [1, 2, 3, 4]" :key="count" type="button" :class="{ 'is-active': peopleCount === count }" @click="peopleCount = count">{{ count }} 人</button>
          </div>

          <div v-if="!authStore.isAuthenticated" class="guest-fields">
            <BaseInput v-model="name" label="联系人" placeholder="请输入联系人姓名" />
            <BaseInput v-model="phone" label="手机号" type="tel" placeholder="请输入手机号" />
            <div class="code-row">
              <BaseInput v-model="code" label="验证码" placeholder="请输入图形验证码" />
              <button class="captcha-image" type="button" :disabled="captchaLoading" @click="refreshCaptcha">
                <img v-if="captchaImage" :src="captchaImage" alt="图形验证码" />
                <span v-else>刷新验证码</span>
              </button>
            </div>
          </div>
          <div v-else class="member-identity">
            <span>会员账号</span>
            <strong>{{ authStore.user?.nickname || authStore.user?.phone }}</strong>
          </div>
          <BaseTextarea v-model="note" label="备注" placeholder="如需安静阅读、靠近插座等，可在这里说明" :maxlength="120" />
          <p v-if="error" class="form-error">{{ error }}</p>
          <div class="booking-step-actions">
            <BaseButton variant="ghost" type="button" @click="prevStep">返回</BaseButton>
            <BaseButton @click="nextStep">确定信息</BaseButton>
          </div>
        </section>

        <section v-else key="confirm" class="booking-step-page booking-confirm">
          <div class="booking-step-page__header">
            <div>
              <span class="section-eyebrow">第 4 步</span>
              <h2 class="section-title">确认并提交</h2>
              <p class="text-muted">请核对预约信息，确认无误后提交。</p>
            </div>
          </div>
          <section class="booking-summary booking-summary--final">
            <div><span>预约对象</span><strong>{{ selectedSeat?.name || selectedSeat?.code || '-' }}</strong></div>
            <div><span>日期时间</span><strong>{{ selectedDate }} {{ selectedTime }}</strong></div>
            <div><span>联系人</span><strong>{{ name || authStore.user?.nickname || authStore.user?.username || '-' }}</strong></div>
            <div><span>手机号</span><strong>{{ phone || authStore.user?.phone || '-' }}</strong></div>
            <div><span>预计人数</span><strong>{{ peopleCount }} 人</strong></div>
            <div><span>备注</span><strong>{{ note || '无' }}</strong></div>
          </section>
          <p v-if="error" class="form-error">{{ error }}</p>
          <div class="booking-step-actions">
            <BaseButton variant="ghost" type="button" @click="prevStep">返回</BaseButton>
            <BaseButton :loading="submitting" :disabled="submitting" @click="submitBooking">提交预约</BaseButton>
            <BaseButton v-if="authStore.isAuthenticated" variant="ghost" @click="router.push('/account/bookings')">查看我的预约</BaseButton>
          </div>
        </section>
      </Transition>
    </main>

    <section v-if="reservation" class="cb-container reservation-section">
      <ReservationCard :reservation="reservation" />
    </section>
    <div class="page-toast">
      <BaseToast v-model="toastVisible" variant="success" title="预约成功">{{ successMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.occupancy-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--cb-space-3); padding-top: var(--cb-space-6); }
.occupancy-grid article { display: grid; gap: var(--cb-space-2); padding: var(--cb-space-4); background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-lg); box-shadow: var(--cb-shadow-sm); }
.occupancy-grid span { color: var(--cb-text-muted); font-size: var(--cb-font-size-sm); }
.occupancy-grid strong { font-size: var(--cb-font-size-2xl); }
.booking-flow-shell {
  display: grid;
  gap: var(--cb-space-5);
}
.booking-form, .booking-step, .booking-confirm, .guest-fields, .booking-map-panel, .booking-summary { display: grid; gap: var(--cb-space-4); }
.booking-step-page,
.booking-map-panel, .booking-panel {
  padding: clamp(var(--cb-space-5), 3vw, var(--cb-space-7));
  background: var(--cb-bg-surface);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-2xl);
}
.booking-step-page {
  min-height: min(72rem, calc(100vh - 13rem));
  align-content: start;
  box-shadow: var(--cb-shadow-sm);
}
.booking-step-page__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-4);
  align-items: flex-start;
  justify-content: space-between;
}
.booking-step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-3);
  align-items: center;
  justify-content: flex-end;
}
.booking-form {
  position: sticky;
  top: 6rem;
  align-self: start;
}
.booking-step,
.booking-confirm {
  padding: var(--cb-space-5) !important;
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-xl);
  background: color-mix(in srgb, var(--cb-bg-elevated) 82%, transparent);
}
.booking-step::before {
  display: none !important;
  content: none !important;
}
.booking-confirm { padding-top: var(--cb-space-4); border-top: .0625rem dashed var(--cb-border-strong); }
.seat-legend { display: flex; flex-wrap: wrap; gap: var(--cb-space-4); font-size: var(--cb-font-size-sm); }
.seat-legend span { display: flex; align-items: center; gap: var(--cb-space-2); }
.seat-legend i { width: .8rem; height: .8rem; border-radius: var(--cb-radius-sm); }
.available { background: var(--cb-success); }
.reserved { background: var(--cb-text-muted); }
.selected { background: var(--cb-color-gold); }
.maintenance { background: var(--cb-warning); }
.booking-summary { padding: var(--cb-space-4); background: var(--cb-bg-soft); border-radius: var(--cb-radius-lg); }
.booking-summary div { display: flex; justify-content: space-between; gap: var(--cb-space-4); }
.booking-summary span { color: var(--cb-text-muted); }
.booking-summary--final div {
  padding-block: var(--cb-space-2);
  border-bottom: .0625rem solid var(--cb-border-soft);
}
.booking-summary--final div:last-child { border-bottom: 0; }
.people-picker { display: flex; flex-wrap: wrap; gap: var(--cb-space-2); }
.people-picker button { min-height: 2.75rem; padding: var(--cb-space-2) var(--cb-space-4); color: var(--cb-text-secondary); background: var(--cb-bg-surface); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-lg); }
.people-picker button:hover { border-color: var(--cb-color-gold); transform: translateY(-1px); }
.people-picker .is-active { color: var(--cb-text-inverse); background: var(--cb-color-coffee); border-color: var(--cb-color-coffee); }
.code-row { display: grid; grid-template-columns: 1fr auto; gap: var(--cb-space-3); align-items: end; }
.member-identity { display: flex; justify-content: space-between; padding: var(--cb-space-4); color: var(--cb-text-primary); background: var(--cb-bg-soft); border-radius: var(--cb-radius-lg); }
.captcha-image { width: 9.375rem; height: 3rem; padding: 0; overflow: hidden; background: var(--cb-bg-soft); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-md); }
.captcha-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.reservation-section { padding-bottom: var(--cb-space-12); }
:deep(.seat-motion-ring) { position: absolute; inset: -.3rem; border: .12rem solid var(--cb-color-gold); border-radius: inherit; pointer-events: none; }
.ios-picker { position: relative; display: grid; max-height: 9rem; overflow-y: auto; gap: var(--cb-space-2); padding-block: 3rem; scroll-snap-type: y mandatory; scroll-behavior: smooth; background: linear-gradient(180deg, color-mix(in srgb, var(--cb-bg-surface) 92%, transparent), var(--cb-bg-surface) 35%, var(--cb-bg-surface) 65%, color-mix(in srgb, var(--cb-bg-surface) 92%, transparent)); border: .0625rem solid var(--cb-border-soft); border-radius: var(--cb-radius-xl); -webkit-overflow-scrolling: touch; }
.ios-picker::before { position: sticky; z-index: 0; top: calc(50% - 1.375rem); height: 2.75rem; margin-block: -2.75rem; background: color-mix(in srgb, var(--cb-color-gold) 10%, transparent); border-block: .0625rem solid color-mix(in srgb, var(--cb-color-gold) 45%, var(--cb-border-soft)); content: ""; pointer-events: none; }
.ios-picker__item { position: relative; z-index: 1; min-height: 2.75rem; padding: 0 var(--cb-space-4); color: var(--cb-text-secondary); white-space: nowrap; background: transparent; border: 0; border-radius: var(--cb-radius-lg); scroll-snap-align: center; }
.ios-picker__item.is-active { color: var(--cb-color-coffee); font-weight: var(--cb-font-bold); background: color-mix(in srgb, var(--cb-color-gold) 18%, transparent); }
.ios-time-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cb-space-3); }
.ios-picker--date { max-height: 10rem; }
.time-slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: var(--cb-space-3);
}
.time-slot-option {
  display: grid;
  min-height: 5rem;
  padding: var(--cb-space-3) var(--cb-space-4);
  gap: var(--cb-space-1);
  align-content: center;
  color: var(--cb-text-secondary);
  text-align: left;
  background: var(--cb-bg-surface);
  border: .0625rem solid var(--cb-border-soft);
  border-radius: var(--cb-radius-lg);
  box-shadow: var(--cb-shadow-sm);
}
.time-slot-option strong {
  color: var(--cb-text-primary);
}
.time-slot-option span {
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
}
.time-slot-option:not(:disabled):hover {
  border-color: var(--cb-color-gold);
  transform: translateY(-0.0625rem);
}
.time-slot-option.is-active {
  color: var(--cb-text-inverse);
  background: var(--cb-color-coffee);
  border-color: var(--cb-color-coffee);
}
.time-slot-option.is-active strong,
.time-slot-option.is-active span {
  color: var(--cb-text-inverse);
}
.time-slot-option.is-disabled {
  cursor: not-allowed;
  opacity: .55;
}
.booking-step-slide-enter-active,
.booking-step-slide-leave-active {
  transition: opacity var(--cb-duration-normal) var(--cb-ease-standard), transform var(--cb-duration-normal) var(--cb-ease-emphasized);
}
.booking-step-slide-enter-from {
  opacity: 0;
  transform: translateX(1.25rem);
}
.booking-step-slide-leave-to {
  opacity: 0;
  transform: translateX(-1.25rem);
}
@media (max-width: 72rem) {
  .booking-layout--map { grid-template-columns: 1fr !important; }
  .booking-form { position: static; }
}
@media (max-width: 50rem) { .occupancy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 36rem) { .code-row { grid-template-columns: 1fr; } .ios-picker { max-height: 8.5rem; } .booking-step-actions,.booking-step-actions :deep(.base-button){width:100%;} }
@media (prefers-reduced-motion: reduce) {
  .booking-step-slide-enter-active,
  .booking-step-slide-leave-active {
    transition: none;
  }
}
</style>
