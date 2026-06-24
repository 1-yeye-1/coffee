<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { createSeat, deleteSeat, fetchSeatUsage, updateSeat, updateSeatStatus } from '@/api/admin'
import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable, BaseToast, EmptyState } from '@/components/base'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapReveal } from '@/composables/useGsapReveal'
import { debounce } from '@/utils'
import SeatMap from '../../../../shared/components/SeatMap.vue'
import '@/assets/styles/pages/admin-management.css'

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const date = ref(today)
const timeSlot = ref('09:00-11:00')
const seats = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const pageRef = ref(null)
const draggingSeatId = ref(null)
const toastVisible = ref(false)
const toastVariant = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')
const selectedIds = ref([])
const batchLoading = ref(false)
let dragState = null
let suppressedClickId = null
let refreshTimer = 0

const { revealCards, revealSeatMap, animateProgress } = useGsapReveal(pageRef)
const { pulseSeat, wiggleIcon, flashRow, successCheck } = useAnimeMotion()

const form = reactive({ code: '', name: '', area: '', capacity: 1, x: 50, y: 50, width: 64, height: 52, sortOrder: 0, status: 'available' })
const timeOptions = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map((value) => ({ label: value, value }))
const statusOptions = [{ label: '启用', value: 'available' }, { label: '维护中', value: 'maintenance' }]
const columns = [
  { key: 'select', label: '' },
  { key: 'code', label: '座位' },
  { key: 'area', label: '区域' },
  { key: 'capacity', label: '容量' },
  { key: 'status', label: '当前状态' },
  { key: 'booking', label: '预约信息' },
  { key: 'actions', label: '操作' },
]
const stats = computed(() => ({
  available: seats.value.filter((item) => item.status === 'available').length,
  reserved: seats.value.filter((item) => item.status === 'reserved').length,
  maintenance: seats.value.filter((item) => item.status === 'maintenance').length,
}))
const occupancyRate = computed(() => {
  const usable = stats.value.available + stats.value.reserved
  return usable ? Math.round((stats.value.reserved / usable) * 100) : 0
})
const selectableSeats = computed(() => seats.value.filter((item) => item.status !== 'reserved'))
const allVisibleSelected = computed(() => selectableSeats.value.length > 0 && selectableSeats.value.every((item) => selectedIds.value.includes(item.seatId)))

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function showToast(variant, title, message) {
  toastVariant.value = variant
  toastTitle.value = title
  toastMessage.value = message
  toastVisible.value = true
}

function seatPayload(seat) {
  return {
    code: seat.code,
    name: seat.name,
    area: seat.area,
    capacity: seat.capacity,
    x: seat.x,
    y: seat.y,
    width: seat.width || 64,
    height: seat.height || 52,
    sortOrder: seat.sortOrder || 0,
    status: seat.status === 'maintenance' ? 'maintenance' : 'available',
  }
}

function startSeatDrag(seat, event) {
  if (event.button !== 0 || saving.value || seat.status === 'reserved') return
  const map = event.currentTarget?.closest?.('.coffee-seat-map')
  if (!map) return
  dragState = {
    seat,
    map,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalX: seat.x,
    originalY: seat.y,
    moved: false,
  }
  draggingSeatId.value = seat.seatId
  event.currentTarget.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function moveSeat(seat, event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return
  const distance = Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY)
  if (!dragState.moved && distance < 4) return
  dragState.moved = true
  const bounds = dragState.map.getBoundingClientRect()
  const halfWidth = ((dragState.seat.width || 64) / bounds.width) * 50
  const halfHeight = ((dragState.seat.height || 52) / bounds.height) * 50
  dragState.seat.x = Math.round(clamp(((event.clientX - bounds.left) / bounds.width) * 100, halfWidth, 100 - halfWidth))
  dragState.seat.y = Math.round(clamp(((event.clientY - bounds.top) / bounds.height) * 100, halfHeight, 100 - halfHeight))
}

async function finishSeatDrag(event, cancelled = false) {
  if (!dragState || dragState.pointerId !== event.pointerId) return
  const state = dragState
  dragState = null
  draggingSeatId.value = null
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  if (!state.moved || cancelled) {
    if (cancelled) Object.assign(state.seat, { x: state.originalX, y: state.originalY })
    return
  }
  suppressedClickId = state.seat.seatId
  window.setTimeout(() => {
    if (suppressedClickId === state.seat.seatId) suppressedClickId = null
  }, 0)
  try {
    await updateSeat(state.seat.seatId, seatPayload(state.seat))
    await refresh()
    showToast('success', '位置已保存', `${state.seat.code} 已移动到 ${state.seat.x}%, ${state.seat.y}%`)
  } catch (err) {
    Object.assign(state.seat, { x: state.originalX, y: state.originalY })
    showToast('error', '保存失败', err.message || '座位位置已回滚')
  }
}

function handleSeatClick(seat, event) {
  if (suppressedClickId === seat.seatId) {
    suppressedClickId = null
    return
  }
  openEditor(seat, event)
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    seats.value = (await fetchSeatUsage({ date: date.value, timeSlot: timeSlot.value })).data
    selectedIds.value = selectedIds.value.filter((id) => seats.value.some((item) => item.seatId === id))
    await nextTick()
    revealSeatMap('.admin-seat-map .map-seat')
    animateProgress('.seat-occupancy progress', { axis: 'x' })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const scheduleRefresh = debounce(refresh, 200)

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') refresh()
}

function toggleSelect(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((itemId) => itemId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value ? [] : selectableSeats.value.map((item) => item.seatId)
}

async function batchSeatStatus(nextStatus) {
  const ids = [...selectedIds.value]
  if (!ids.length || batchLoading.value) return
  if (nextStatus === 'maintenance' && !window.confirm(`\u6279\u91cf\u8bbe\u7f6e ${ids.length} \u4e2a\u5ea7\u4f4d\u4e3a\u7ef4\u62a4/\u505c\u7528\uff1f`)) return
  batchLoading.value = true
  error.value = ''
  let failed = 0
  try {
    for (const id of ids) {
      try { await updateSeatStatus(id, nextStatus) }
      catch { failed += 1 }
    }
    selectedIds.value = []
    await refresh()
    showToast(failed ? 'error' : 'success', failed ? '\u6279\u91cf\u64cd\u4f5c\u90e8\u5206\u5931\u8d25' : '\u6279\u91cf\u64cd\u4f5c\u5df2\u5b8c\u6210', failed ? `${failed} \u9879\u5931\u8d25` : '')
  } finally {
    batchLoading.value = false
  }
}

function openEditor(seat = null, event = null) {
  editingId.value = seat?.seatId || null
  Object.assign(form, seat ? { ...seat, status: seat.status === 'reserved' ? 'available' : seat.status } : { code: '', name: '', area: '', capacity: 1, x: 50, y: 50, width: 64, height: 52, sortOrder: 0, status: 'available' })
  modalOpen.value = true
  if (seat) pulseSeat(event?.currentTarget)
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value) await updateSeat(editingId.value, form)
    else await createSeat(form)
    modalOpen.value = false
    await refresh()
    successCheck(pageRef.value?.querySelector(`[data-row-key="${editingId.value}"]`) || pageRef.value?.querySelector('.admin-seat-map'))
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function toggle(seat) {
  try {
    await updateSeatStatus(seat.seatId, seat.status === 'maintenance' ? 'available' : 'maintenance')
    await refresh()
    await nextTick()
    flashRow(pageRef.value?.querySelector(`[data-row-key="${seat.seatId}"]`))
    if (seat.status !== 'maintenance') wiggleIcon(pageRef.value?.querySelector(`.admin-seat-map button[title*="${seat.code}"]`))
  } catch (err) {
    error.value = err.message
  }
}

async function remove(seat) {
  if (!window.confirm(`确认删除座位 ${seat.code}？存在未来预约时系统会拒绝删除。`)) return
  try {
    await deleteSeat(seat.seatId)
    await refresh()
  } catch (err) {
    error.value = err.message
  }
}

function statusText(status) {
  if (status === 'available') return '空闲'
  if (status === 'reserved') return '已预约'
  return '维护中'
}

watch([date, timeSlot], scheduleRefresh)
onMounted(async () => {
  await refresh()
  await nextTick()
  revealCards('.admin-stat', { key: 'seat-stats', stagger: 0.055 })
  window.addEventListener('focus', refreshWhenVisible)
  document.addEventListener('visibilitychange', refreshWhenVisible)
  refreshTimer = window.setInterval(refreshWhenVisible, 15000)
})
onBeforeUnmount(() => {
  scheduleRefresh.cancel()
  window.removeEventListener('focus', refreshWhenVisible)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
  window.clearInterval(refreshTimer)
})
</script>

<template>
  <div ref="pageRef" class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title">
        <span class="section-eyebrow">Seats</span>
        <h1>座位地图管理</h1>
        <p>维护咖啡书屋座位位置、容量与状态，并按日期和时间段查看实时占用。</p>
      </div>
      <div class="cb-cluster">
        <BaseButton variant="outline" :loading="loading" @click="refresh">刷新</BaseButton>
        <BaseButton @click="openEditor()">新增座位</BaseButton>
      </div>
    </header>

    <section class="admin-stat-grid">
      <div class="admin-stat"><span>空闲</span><strong>{{ stats.available }}</strong></div>
      <div class="admin-stat"><span>已预约</span><strong>{{ stats.reserved }}</strong></div>
      <div class="admin-stat"><span>维护中</span><strong>{{ stats.maintenance }}</strong></div>
      <div class="admin-stat"><span>总座位</span><strong>{{ seats.length }}</strong></div>
    </section>

    <section class="admin-filter-bar">
      <BaseInput v-model="date" type="date" label="日期" :min="today" />
      <BaseSelect v-model="timeSlot" label="时间段" :options="timeOptions" />
    </section>

    <section class="seat-occupancy" aria-label="当前时段占用率">
      <div><strong>当前时段占用率</strong><span>{{ occupancyRate }}%</span></div>
      <progress :value="occupancyRate" max="100">{{ occupancyRate }}%</progress>
    </section>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="admin-panel">
      <SeatMap
        class="admin-seat-map"
        :seats="seats"
        :dragging-seat-id="draggingSeatId"
        mode="edit"
        height="25rem"
        min-width="42rem"
        :disabled="saving"
        @seat-pointerdown="startSeatDrag"
        @seat-pointermove="moveSeat"
        @seat-pointerup="(seat, event) => finishSeatDrag(event)"
        @seat-pointercancel="(seat, event) => finishSeatDrag(event, true)"
        @seat-click="handleSeatClick"
      />

      <section class="admin-batch-bar">
        <label><input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!seats.length || batchLoading" @change="toggleSelectAll" /> <span>&#20840;&#36873;&#24403;&#21069;&#39029;</span></label>
        <span class="admin-batch-bar__count">&#24050;&#36873;&#25321; {{ selectedIds.length }} &#39033;</span>
        <BaseButton size="sm" variant="outline" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchSeatStatus('available')">&#25209;&#37327;&#35774;&#20026;&#21487;&#29992;</BaseButton>
        <BaseButton size="sm" variant="danger" :disabled="!selectedIds.length || batchLoading" :loading="batchLoading" @click="batchSeatStatus('maintenance')">&#25209;&#37327;&#35774;&#20026;&#32500;&#25252;/&#20572;&#29992;</BaseButton>
      </section>
      <BaseTable :columns="columns" :items="seats" :loading="loading" empty-text="暂无座位">
        <template #head-select>
          <input class="admin-select-head" type="checkbox" :checked="allVisibleSelected" :disabled="!seats.length || batchLoading" aria-label="Select current page" @change="toggleSelectAll" />
        </template>
        <template #cell-select="{ item }">
          <input class="admin-select-cell" type="checkbox" :checked="selectedIds.includes(item.seatId)" :disabled="item.status === 'reserved'" :aria-label="`select ${item.code}`" @change="toggleSelect(item.seatId)" />
        </template>
        <template #cell-capacity="{ value }">{{ value }} 人</template>
        <template #cell-status="{ item }">
          <BaseBadge :variant="item.status === 'available' ? 'success' : item.status === 'reserved' ? 'warning' : 'neutral'">
            {{ statusText(item.status) }}
          </BaseBadge>
        </template>
        <template #cell-booking="{ item }">
          <div v-if="item.bookingInfo"><strong>{{ item.bookingInfo.nickname }}</strong><small>{{ item.bookingInfo.phoneMasked }} · {{ item.bookingInfo.bookingNo }}</small></div>
          <span v-else>-</span>
        </template>
        <template #cell-actions="{ item }">
          <div class="cb-cluster">
            <BaseButton size="sm" variant="outline" @click="openEditor(item)">编辑</BaseButton>
            <BaseButton size="sm" :disabled="item.status === 'reserved'" @click="toggle(item)">{{ item.status === 'maintenance' ? '启用' : '设为维护' }}</BaseButton>
            <BaseButton size="sm" variant="danger" :disabled="item.status === 'reserved'" @click="remove(item)">删除</BaseButton>
          </div>
        </template>
      </BaseTable>
      <EmptyState v-if="!loading && !seats.length" title="暂无座位数据" />
    </section>

    <BaseModal v-model="modalOpen" :title="editingId ? '编辑座位' : '新增座位'">
      <form class="admin-form" @submit.prevent="save">
        <div class="form-grid">
          <BaseInput v-model="form.code" label="座位编号" />
          <BaseInput v-model="form.name" label="座位名称" />
          <BaseInput v-model="form.area" label="区域" />
          <BaseInput v-model="form.capacity" type="number" label="容量" min="1" />
          <BaseInput v-model="form.x" type="number" label="X 坐标 (%)" min="0" max="100" />
          <BaseInput v-model="form.y" type="number" label="Y 坐标 (%)" min="0" max="100" />
          <BaseInput v-model="form.width" type="number" label="宽度 (px)" min="32" />
          <BaseInput v-model="form.height" type="number" label="高度 (px)" min="32" />
          <BaseInput v-model="form.sortOrder" type="number" label="排序" />
          <BaseSelect v-model="form.status" label="状态" :options="statusOptions" />
        </div>
        <BaseButton type="submit" :loading="saving">保存座位</BaseButton>
      </form>
    </BaseModal>

    <div class="seat-toast">
      <BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast>
    </div>
  </div>
</template>

<style scoped>
.seat-toast {
  position: fixed;
  z-index: var(--cb-z-toast);
  right: var(--cb-space-5);
  bottom: var(--cb-space-5);
  width: min(calc(100% - var(--cb-space-8)), 24rem);
}
</style>
