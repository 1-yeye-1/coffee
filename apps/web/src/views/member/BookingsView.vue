<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, EmptyState, ErrorPanel } from '@/components/base'
import { useBookingStore } from '@/stores/booking'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const bookingStore = useBookingStore()
const loading = ref(false)

const statusMeta = {
  pending: { label: '待确认', badge: 'warning' },
  confirmed: { label: '已确认', badge: 'success' },
  completed: { label: '已完成', badge: 'success' },
  cancelled: { label: '已取消', badge: 'neutral' },
  no_show: { label: '已爽约', badge: 'danger' },
}

function bookingStatus(status) {
  return statusMeta[status] || { label: status || '未知状态', badge: 'neutral' }
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusNote(booking) {
  if (booking.status === 'cancelled') {
    return [
      booking.cancelReason ? `取消原因：${booking.cancelReason}` : '该预约已取消',
      booking.cancelledAt ? `取消时间：${formatDate(booking.cancelledAt)}` : '',
    ].filter(Boolean).join('；')
  }
  if (booking.status === 'completed') return booking.completedAt ? `完成时间：${formatDate(booking.completedAt)}` : '预约已完成'
  if (booking.status === 'no_show') return booking.noShowAt ? `爽约记录时间：${formatDate(booking.noShowAt)}` : '该预约已被记录为爽约'
  if (booking.status === 'pending') return '预约待确认，请留意通知中心状态更新'
  return ''
}

async function load() {
  loading.value = true
  bookingStore.apiError = ''
  try {
    await bookingStore.fetchMyBookings()
  } catch (error) {
    bookingStore.apiError = error.message || '预约记录加载失败。'
  } finally {
    loading.value = false
  }
}

async function cancelBooking(id) {
  await bookingStore.cancelBooking(id)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">My Bookings</span>
      <h2 class="page-title">我的预约</h2>
    </header>
    <ErrorPanel v-if="bookingStore.apiError" :message="bookingStore.apiError" @retry="load" />
    <BaseSkeleton v-else-if="loading" variant="card" />
    <div v-else class="record-list">
      <article v-for="booking in bookingStore.bookings" :key="booking.id" class="record-row">
        <div>
          <div class="record-row__header">
            <strong>{{ booking.date }} · {{ booking.timeSlot || booking.time }}</strong>
            <BaseBadge :variant="bookingStatus(booking.status).badge">
              {{ bookingStatus(booking.status).label }}
            </BaseBadge>
          </div>
          <p>{{ booking.space }} · {{ booking.seatName || `座位 ${booking.seatCode || booking.seat}` }}</p>
          <small>{{ booking.contactName }} · {{ booking.phone }}</small>
          <small v-if="statusNote(booking)" class="record-row__note">{{ statusNote(booking) }}</small>
        </div>
        <div class="cb-cluster">
          <BaseButton size="sm" variant="outline" @click="router.push('/booking')">查看座位</BaseButton>
          <BaseButton
            v-if="['pending', 'confirmed'].includes(booking.status)"
            size="sm"
            variant="ghost"
            @click="cancelBooking(booking.id)"
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

<style scoped>
.record-row__note {
  display: block;
  margin-top: var(--cb-space-2);
  color: var(--cb-text-muted);
  overflow-wrap: anywhere;
}
</style>
