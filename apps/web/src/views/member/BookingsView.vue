<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseSkeleton, BaseTabs, EmptyState, ErrorPanel } from '@/components/base'
import { useBookingStore } from '@/stores/booking'
import { useBooksStore } from '@/stores/books'
import '@/assets/styles/pages/engagement.css'

const router = useRouter()
const route = useRoute()
const bookingStore = useBookingStore()
const booksStore = useBooksStore()
const loading = ref(false)
const activeTab = ref(route.query.tab === 'books' ? 'books' : 'space')

const tabs = [
  { label: '空间预约', value: 'space' },
  { label: '图书预约', value: 'books' },
]

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

function reservationLocation(reservation) {
  return reservation.locationLabel
    || [reservation.seatName, reservation.seatCode].filter(Boolean).join(' · ')
    || '到店后由馆员指引'
}

function reservationNote(reservation) {
  if (reservation.status === 'cancelled') {
    return reservation.cancelledAt ? `取消时间：${formatDate(reservation.cancelledAt)}` : '该预约已取消'
  }
  if (reservation.status === 'completed') return '图书已取阅完成'
  if (reservation.status === 'confirmed') return `预约编号：${reservation.reservationNo || '-'}`
  return ''
}

async function loadSpaceBookings() {
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

async function loadBookReservations() {
  loading.value = true
  try {
    await booksStore.fetchMyBookReservations()
  } catch {
    // errors surfaced via booksStore.reservationsError
  } finally {
    loading.value = false
  }
}

async function loadActiveTab() {
  if (activeTab.value === 'books') await loadBookReservations()
  else await loadSpaceBookings()
}

async function cancelBooking(id) {
  await bookingStore.cancelBooking(id)
  await loadSpaceBookings()
}

async function cancelReservation(id) {
  await booksStore.cancelBookReservation(id)
  await loadBookReservations()
}

function openBookDetail(reservation) {
  const slug = String(reservation.slug || reservation.bookId || '').trim()
  if (slug) router.push(`/books/${slug}`)
}

watch(activeTab, loadActiveTab)
onMounted(loadActiveTab)
</script>

<template>
  <div class="member-page">
    <header>
      <span class="section-eyebrow">My Bookings</span>
      <h2 class="page-title">我的预约</h2>
    </header>

    <BaseTabs v-model="activeTab" :tabs="tabs" variant="member" aria-label="预约类型">
      <template v-if="activeTab === 'space'">
        <ErrorPanel v-if="bookingStore.apiError" :message="bookingStore.apiError" @retry="loadSpaceBookings" />
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
            title="暂无空间预约"
            description="选择一个适合阅读和工作的时间段。"
            action-label="立即预约"
            @action="router.push('/booking')"
          >
            <template #icon>□</template>
          </EmptyState>
        </div>
      </template>

      <template v-else>
        <ErrorPanel v-if="booksStore.reservationsError" :message="booksStore.reservationsError" @retry="loadBookReservations" />
        <BaseSkeleton v-else-if="loading" variant="card" />
        <div v-else class="record-list">
          <article v-for="reservation in booksStore.reservations" :key="reservation.id" class="record-row">
            <div>
              <div class="record-row__header">
                <strong>{{ reservation.title || '未命名图书' }}</strong>
                <BaseBadge :variant="bookingStatus(reservation.status).badge">
                  {{ bookingStatus(reservation.status).label }}
                </BaseBadge>
              </div>
              <p>馆藏位置：{{ reservationLocation(reservation) }}</p>
              <small>预约时间：{{ formatDate(reservation.reservedAt) }}</small>
              <small v-if="reservationNote(reservation)" class="record-row__note">{{ reservationNote(reservation) }}</small>
            </div>
            <div class="cb-cluster">
              <BaseButton size="sm" variant="outline" @click="openBookDetail(reservation)">查看图书</BaseButton>
              <BaseButton
                v-if="['pending', 'confirmed'].includes(reservation.status)"
                size="sm"
                variant="ghost"
                @click="cancelReservation(reservation.id)"
              >
                取消预约
              </BaseButton>
            </div>
          </article>
          <EmptyState
            v-if="!booksStore.reservations.length"
            title="暂无图书预约"
            description="在图书详情页可预约馆藏，到店取阅。"
            action-label="浏览图书"
            @action="router.push('/books')"
          >
            <template #icon>📖</template>
          </EmptyState>
        </div>
      </template>
    </BaseTabs>
  </div>
</template>

<style scoped>
.record-row__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cb-space-3);
  margin-bottom: var(--cb-space-2);
}

.record-row__note {
  display: block;
  margin-top: var(--cb-space-2);
  color: var(--cb-text-muted);
  overflow-wrap: anywhere;
}
</style>
