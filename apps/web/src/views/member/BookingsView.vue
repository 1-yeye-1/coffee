<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, EmptyState, ErrorPanel } from '@/components/base'
import { useBookingStore } from '@/stores/booking'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const bookingStore = useBookingStore()
const loading = ref(false)
async function load() {
  loading.value = true
  bookingStore.apiError = ''
  try { await bookingStore.fetchMyBookings() }
  catch (error) { bookingStore.apiError = error.message || '预约记录加载失败。' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">我的预约</span>
      <h2 class="page-title">我的预约</h2>
    </header>
    <ErrorPanel v-if="bookingStore.apiError" :message="bookingStore.apiError" @retry="load" />
    <BaseSkeleton v-else-if="loading" variant="card" />
    <div v-else class="record-list">
      <article v-for="booking in bookingStore.bookings" :key="booking.id" class="record-row">
        <div>
          <div class="record-row__header">
            <strong>{{ booking.date }} · {{ booking.timeSlot || booking.time }}</strong>
            <BaseBadge :variant="booking.status === 'confirmed' ? 'success' : 'neutral'">
              {{ booking.status === 'confirmed' ? '已确认' : '已取消' }}
            </BaseBadge>
          </div>
          <p>{{ booking.space }} · {{ booking.seatName || `座位 ${booking.seatCode || booking.seat}` }}</p>
          <small>{{ booking.contactName }} · {{ booking.phone }}</small>
        </div>
        <div class="cb-cluster">
          <BaseButton size="sm" variant="outline" @click="router.push('/booking')">查看详情</BaseButton>
          <BaseButton
            v-if="booking.status === 'confirmed'"
            size="sm"
            variant="ghost"
            @click="bookingStore.cancelBooking(booking.id)"
          >
            取消预约
          </BaseButton>
        </div>
      </article>
      <EmptyState
        v-if="!bookingStore.bookings.length"
        title="暂无预约记录"
        description="选择一个适合阅读和工作的时间段。"
        action-label="立即预约"
        @action="router.push('/booking')"
      >
        <template #icon>□</template>
      </EmptyState>
    </div>
  </div>
</template>
