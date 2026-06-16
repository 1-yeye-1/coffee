<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseButton, BaseInput, BaseTextarea, BaseToast } from '@/components/base'
import { useBookingStore } from '@/stores/booking'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const bookingStore = useBookingStore()
const today = new Date()
const dates = Array.from({ length: 5 }, (_, index) => {
  const date = new Date(today)
  date.setDate(today.getDate() + index + 1)
  return date.toISOString().slice(0, 10)
})
const times = ['10:00 - 12:00', '13:00 - 15:00', '15:30 - 17:30', '18:00 - 20:00']
const seats = Array.from({ length: 12 }, (_, index) => `A${index + 1}`)
const selectedDate = ref(dates[0])
const selectedTime = ref(times[0])
const selectedSeat = ref('A1')
const name = ref('Coffee Reader')
const phone = ref('13800138000')
const note = ref('')
const error = ref('')
const toastVisible = ref(false)
const formattedDates = computed(() => dates.map((date) => ({
  value: date,
  label: new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
})))

onMounted(async () => {
  await bookingStore.fetchSpaces()
  await bookingStore.fetchSlots('city-reading-room')
})

async function submit() {
  if (!name.value.trim() || !/^1\d{10}$/.test(phone.value)) {
    error.value = '请填写联系人，并输入正确的 11 位手机号。'
    return
  }
  await bookingStore.createBooking({
    spaceSlug: 'city-reading-room',
    date: selectedDate.value,
    time: selectedTime.value,
    seat: selectedSeat.value,
    contactName: name.value.trim(),
    phone: phone.value,
    note: note.value.trim(),
    space: 'Coffee Book 城市阅读店',
  })
  error.value = ''
  toastVisible.value = false
  nextTick(() => { toastVisible.value = true })
}
</script>

<template>
  <div class="engagement-page cb-fade-in">
    <section class="engagement-hero">
      <div class="cb-container engagement-hero__grid">
        <div class="engagement-hero__copy"><span class="section-eyebrow">Space Booking</span><h1 class="page-title">预约中心</h1><p class="page-subtitle">为专注阅读、安静工作或一次小型会面，提前留下一张座位。</p></div>
        <div class="engagement-hero__art"><strong>A quiet seat is waiting.</strong></div>
      </div>
    </section>

    <main class="cb-container engagement-content booking-layout">
      <section class="booking-panel booking-form">
        <div><h2 class="section-title">选择预约信息</h2><p class="text-muted">当前空间：Coffee Book 城市阅读店</p></div>
        <div><strong>日期</strong><div class="choice-grid"><button v-for="item in formattedDates" :key="item.value" class="choice-chip" :class="{ 'is-active': selectedDate === item.value }" type="button" @click="selectedDate = item.value">{{ item.label }}</button></div></div>
        <div><strong>时间段</strong><div class="choice-grid"><button v-for="time in times" :key="time" class="choice-chip" :class="{ 'is-active': selectedTime === time }" type="button" @click="selectedTime = time">{{ time }}</button></div></div>
        <div class="form-grid"><BaseInput v-model="name" label="联系人" /><BaseInput v-model="phone" label="手机号" /></div>
        <BaseTextarea v-model="note" label="备注" placeholder="选填，例如靠窗、需要插座等。" :maxlength="120" show-count />
        <p v-if="error" class="is-error" role="alert">{{ error }}</p>
        <BaseButton size="lg" @click="submit">确认预约</BaseButton>
        <p class="policy-hint">
          提交预约即表示你同意 Coffee Book 的
          <RouterLink to="/terms">服务条款</RouterLink>
          和
          <RouterLink to="/privacy">隐私政策</RouterLink>
          。
        </p>
        <BaseButton variant="ghost" @click="router.push('/account/bookings')">查看我的预约</BaseButton>
      </section>

      <aside class="side-panel">
        <h2 class="section-title">座位平面图</h2>
        <div class="seat-map"><div class="seat-map__screen">窗景阅读区</div><div class="seat-grid"><button v-for="seat in seats" :key="seat" class="seat-button" :class="{ 'is-active': selectedSeat === seat }" type="button" @click="selectedSeat = seat">{{ seat }}</button></div></div>
        <h2 class="section-title section-block">预约须知</h2>
        <ul class="booking-notice"><li>预约保留 20 分钟，请按时到店。</li><li>每个时间段最多预约一个座位。</li><li>如行程变化，请在会员中心取消。</li><li>空间内请保持安静并爱护公共设施。</li></ul>
      </aside>
    </main>
    <div class="page-toast"><BaseToast v-model="toastVisible" variant="success" title="预约成功">预约记录已保存，可在会员中心查看。</BaseToast></div>
  </div>
</template>

<style scoped>
.policy-hint {
  margin: calc(var(--cb-space-2) * -1) 0 0;
  color: var(--cb-text-muted);
  font-size: var(--cb-font-size-sm);
  line-height: var(--cb-line-relaxed);
}

.policy-hint a {
  color: var(--cb-color-coffee);
  font-weight: var(--cb-font-semibold);
}
</style>
