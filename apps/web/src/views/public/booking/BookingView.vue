<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { sendCode } from '@/api/auth'
import { BaseBadge, BaseButton, BaseInput, BaseTextarea, BaseToast, EmptyState } from '@/components/base'
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
const selectedDate = ref(today)
const selectedTime = ref('')
const selectedSeatId = ref(null)
const peopleCount = ref(1)
const name = ref(authStore.user?.nickname || authStore.user?.username || '')
const phone = ref(authStore.user?.phone || '')
const code = ref('')
const note = ref('')
const error = ref('')
const successMessage = ref('')
const sendingCode = ref(false)
const submitting = ref(false)
const toastVisible = ref(false)

const seats = computed(() => bookingStore.availability.length ? bookingStore.availability : bookingStore.seats.map((seat) => ({ ...seat, seatId: seat.id })))
const selectedSeat = computed(() => seats.value.find((seat) => Number(seat.seatId) === Number(selectedSeatId.value)))
const dateLabel = (value, index) => `${index === 0 ? '今天 · ' : index === 1 ? '明天 · ' : ''}${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T12:00:00`))}`
const hasAvailableSeats = computed(() => seats.value.some((seat) => seat.status === 'available'))

async function refreshAvailability() {
  selectedSeatId.value = null
  if (!selectedDate.value || !selectedTime.value) return
  try { await bookingStore.fetchAvailability(selectedDate.value, selectedTime.value) }
  catch (requestError) { error.value = requestError.message }
}

watch([selectedDate, selectedTime], refreshAvailability)

async function requestCode() {
  error.value = ''
  if (!/^1\d{10}$/.test(phone.value)) { error.value = '请输入正确的 11 位手机号'; return }
  sendingCode.value = true
  try { await sendCode({ phone: phone.value, scene: 'booking_guest' }) }
  catch (requestError) { error.value = requestError.message }
  finally { sendingCode.value = false }
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

async function submit() {
  error.value = validate()
  if (error.value) return
  submitting.value = true
  const payload = { spaceSlug: 'city-reading-room', date: selectedDate.value, timeSlot: selectedTime.value, seatId: selectedSeatId.value, peopleCount: peopleCount.value, contactName: name.value || authStore.user?.nickname, name: name.value, phone: phone.value || authStore.user?.phone, code: code.value, note: note.value.trim() }
  try {
    if (authStore.isAuthenticated) {
      await bookingStore.createBooking(payload)
      successMessage.value = '预约成功，可在会员中心查看。'
    } else {
      const result = await bookingStore.createGuestBooking(payload)
      successMessage.value = result.message
    }
    await refreshAvailability()
    toastVisible.value = false
    nextTick(() => { toastVisible.value = true })
  } catch (requestError) { error.value = requestError.message }
  finally { submitting.value = false }
}

onMounted(async () => {
  await Promise.all([bookingStore.fetchSpaces(), bookingStore.fetchSeats()])
})
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <section class="engagement-hero"><div class="cb-container engagement-hero__grid"><div class="engagement-hero__copy"><span class="section-eyebrow">Space Booking</span><h1 class="page-title">预约中心</h1><p class="page-subtitle">选择日期、时间与座位，为阅读和相聚留下一段安静时光。</p></div><div class="engagement-hero__art"><strong>A quiet seat is waiting.</strong></div></div></section>
    <main class="cb-container engagement-content booking-layout booking-layout--map">
      <section class="booking-panel booking-form">
        <div><BaseBadge :variant="authStore.isAuthenticated ? 'success' : 'neutral'">{{ authStore.isAuthenticated ? '已登录预约' : '游客验证码预约' }}</BaseBadge><h2 class="section-title">选择预约信息</h2></div>
        <div class="booking-step"><strong>1. 选择日期</strong><div class="date-strip"><button v-for="(date,index) in dateCards" :key="date" type="button" :class="{ 'is-active': selectedDate===date }" @click="selectedDate=date">{{ dateLabel(date,index) }}</button></div><BaseInput v-model="selectedDate" type="date" label="其他日期" :min="today" :max="maxDate" /></div>
        <div class="booking-step"><strong>2. 选择时间段</strong><div class="time-grid"><button v-for="slot in timeSlots" :key="slot" type="button" :class="{ 'is-active': selectedTime===slot }" @click="selectedTime=slot">{{ slot }}</button></div></div>
        <div class="booking-step"><strong>3. 选择人数</strong><div class="people-picker"><button v-for="count in 4" :key="count" type="button" :class="{ 'is-active': peopleCount===count }" @click="peopleCount=count">{{ count }} 人</button></div></div>
        <div v-if="!authStore.isAuthenticated" class="guest-fields"><BaseInput v-model="name" label="姓名" /><BaseInput v-model="phone" label="手机号" /><div class="code-row"><BaseInput v-model="code" label="验证码" /><BaseButton variant="outline" :loading="sendingCode" @click="requestCode">获取验证码</BaseButton></div><p class="text-muted">预约成功后，未注册手机号会自动创建账号，以后可用验证码登录。</p></div>
        <div v-else class="member-identity"><strong>{{ authStore.user?.nickname || authStore.user?.username }}</strong><span>{{ authStore.user?.phone }}</span></div>
        <BaseTextarea v-model="note" label="备注" placeholder="选填，例如需要插座等。" :maxlength="120" show-count />
        <p v-if="error" class="is-error" role="alert">{{ error }}</p>
        <BaseButton size="lg" :loading="submitting" @click="submit">确认预约</BaseButton>
        <BaseButton v-if="authStore.isAuthenticated" variant="ghost" @click="router.push('/account/bookings')">查看我的预约</BaseButton>
      </section>

      <aside class="booking-map-panel">
        <div><h2 class="section-title">咖啡书屋地图</h2><p class="text-muted">{{ selectedTime ? `${selectedDate} · ${selectedTime}` : '请先选择时间段' }}</p></div>
        <div class="seat-legend"><span><i class="available" />可选</span><span><i class="reserved" />已预约</span><span><i class="selected" />已选</span><span><i class="disabled" />停用</span></div>
        <div class="floor-scroll"><div class="floor-map"><div class="floor-zone floor-zone--window">落地窗</div><div class="floor-zone floor-zone--shelf">书架区</div><div class="floor-zone floor-zone--bar">咖啡吧台</div><button v-for="seat in seats" :key="seat.seatId" class="map-seat" :class="[`is-${seat.status}`, { 'is-selected': selectedSeatId===seat.seatId }]" :style="{ left:`${seat.x}%`, top:`${seat.y}%` }" type="button" :disabled="!selectedTime || seat.status!=='available'" :title="`${seat.name} · ${seat.area} · ${seat.capacity}人 · ${seat.status}`" @click="selectedSeatId=seat.seatId"><strong>{{ seat.code }}</strong><small>{{ seat.capacity }}人</small></button></div></div>
        <EmptyState v-if="selectedTime && !hasAvailableSeats" title="当前时段暂无可用座位" description="请选择其他时间段。" />
        <section class="booking-summary"><h3>预约摘要</h3><div><span>日期</span><strong>{{ selectedDate || '未选择' }}</strong></div><div><span>时间</span><strong>{{ selectedTime || '未选择' }}</strong></div><div><span>座位</span><strong>{{ selectedSeat?.name || '未选择' }}</strong></div><div><span>人数</span><strong>{{ peopleCount }} 人</strong></div></section>
      </aside>
    </main>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="预约成功">{{ successMessage }}</BaseToast></div>
  </div>
</template>

<style scoped>
.booking-layout--map{grid-template-columns:minmax(0,.85fr) minmax(34rem,1.15fr);align-items:start}.booking-form,.booking-step,.guest-fields,.booking-map-panel,.booking-summary{display:grid;gap:var(--cb-space-4)}.date-strip{display:flex;gap:var(--cb-space-2);overflow-x:auto;padding-bottom:var(--cb-space-2)}.date-strip button,.time-grid button,.people-picker button{min-height:2.75rem;padding:var(--cb-space-2) var(--cb-space-4);color:var(--cb-text-secondary);white-space:nowrap;background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-lg)}.date-strip button:hover,.time-grid button:hover,.people-picker button:hover{border-color:var(--cb-color-gold);transform:translateY(-1px)}.date-strip .is-active,.time-grid .is-active,.people-picker .is-active{color:var(--cb-text-inverse);background:var(--cb-color-coffee);border-color:var(--cb-color-coffee)}.time-grid,.people-picker{display:flex;flex-wrap:wrap;gap:var(--cb-space-2)}.code-row{display:grid;grid-template-columns:1fr auto;gap:var(--cb-space-3);align-items:end}.member-identity{display:flex;padding:var(--cb-space-4);justify-content:space-between;color:var(--cb-text-primary);background:var(--cb-bg-soft);border-radius:var(--cb-radius-lg)}.booking-map-panel{padding:var(--cb-space-5);background:var(--cb-bg-surface);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-xl)}.seat-legend{display:flex;flex-wrap:wrap;gap:var(--cb-space-4);font-size:var(--cb-font-size-sm)}.seat-legend span{display:flex;align-items:center;gap:var(--cb-space-2)}.seat-legend i{width:.8rem;height:.8rem;border-radius:var(--cb-radius-sm)}.available{background:var(--cb-success)}.reserved{background:var(--cb-text-muted)}.selected{background:var(--cb-color-gold)}.disabled{background:var(--cb-bg-dark)}.floor-scroll{overflow-x:auto}.floor-map{position:relative;min-width:36rem;height:30rem;overflow:hidden;background:linear-gradient(135deg,var(--cb-bg-soft),var(--cb-bg-page));border:.125rem solid var(--cb-border-strong);border-radius:var(--cb-radius-xl)}.floor-zone{position:absolute;padding:var(--cb-space-2);color:var(--cb-text-muted);font-size:var(--cb-font-size-xs);letter-spacing:.12em;border:.0625rem dashed var(--cb-border-strong)}.floor-zone--window{inset:0 0 auto 0;text-align:center}.floor-zone--shelf{top:24%;right:2%;height:42%;writing-mode:vertical-rl}.floor-zone--bar{right:8%;bottom:5%;left:48%;text-align:center}.map-seat{position:absolute;display:grid;width:4.25rem;height:3.5rem;place-content:center;color:var(--cb-text-primary);background:color-mix(in srgb,var(--cb-success) 18%,var(--cb-bg-surface));border:.125rem solid var(--cb-success);border-radius:var(--cb-radius-lg);transform:translate(-50%,-50%)}.map-seat:hover:not(:disabled){box-shadow:var(--cb-shadow-md);transform:translate(-50%,-53%)}.map-seat small{font-size:var(--cb-font-size-xs)}.map-seat.is-reserved,.map-seat.is-disabled{color:var(--cb-text-muted);background:var(--cb-bg-soft);border-color:var(--cb-border-strong);cursor:not-allowed}.map-seat.is-selected{color:var(--cb-color-espresso);background:var(--cb-color-gold);border-color:var(--cb-color-caramel)}.booking-summary{padding:var(--cb-space-4);background:var(--cb-bg-soft);border-radius:var(--cb-radius-lg)}.booking-summary div{display:flex;justify-content:space-between;gap:var(--cb-space-4)}.booking-summary span{color:var(--cb-text-muted)}@media(max-width:64rem){.booking-layout--map{grid-template-columns:1fr}.booking-map-panel{min-width:0}}@media(max-width:36rem){.code-row{grid-template-columns:1fr}}
</style>
