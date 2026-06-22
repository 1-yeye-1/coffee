<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { createSeat, deleteSeat, fetchSeatUsage, updateSeat, updateSeatStatus } from '@/api/admin'
import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable, BaseToast, EmptyState } from '@/components/base'
import { debounce } from '@/utils'
import { useAnimeMotion } from '@/composables/useAnimeMotion'
import { useGsapReveal } from '@/composables/useGsapReveal'
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
const mapRef = ref(null)
const draggingSeatId = ref(null)
const toastVisible = ref(false)
const toastVariant = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')
let dragState = null
let suppressedClickId = null
const { revealCards, revealSeatMap, animateProgress } = useGsapReveal(pageRef)
const { pulseSeat, wiggleIcon, flashRow, successCheck } = useAnimeMotion()
const form = reactive({ code: '', name: '', area: '', capacity: 1, x: 50, y: 50, width: 64, height: 52, sortOrder: 0, status: 'available' })
const timeOptions = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map((value) => ({ label: value, value }))
const statusOptions = [{ label: '启用', value: 'available' }, { label: '维护中', value: 'maintenance' }]
const columns = [{ key: 'code', label: '座位' }, { key: 'area', label: '区域' }, { key: 'capacity', label: '容量' }, { key: 'status', label: '当前状态' }, { key: 'booking', label: '预约信息' }, { key: 'actions', label: '操作' }]
const stats = computed(() => ({ available: seats.value.filter((item) => item.status === 'available').length, reserved: seats.value.filter((item) => item.status === 'reserved').length, maintenance: seats.value.filter((item) => item.status === 'maintenance').length }))
const occupancyRate = computed(() => {
  const usable = stats.value.available + stats.value.reserved
  return usable ? Math.round((stats.value.reserved / usable) * 100) : 0
})

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
  if (event.button !== 0 || saving.value) return
  const map = mapRef.value
  if (!map) return
  dragState = {
    seat,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalX: seat.x,
    originalY: seat.y,
    moved: false,
  }
  draggingSeatId.value = seat.seatId
  event.currentTarget.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveSeat(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return
  const distance = Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY)
  if (!dragState.moved && distance < 4) return
  dragState.moved = true
  const bounds = mapRef.value.getBoundingClientRect()
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
    await nextTick()
    revealSeatMap('.admin-seat-map button')
    animateProgress('.seat-occupancy progress', { axis: 'x' })
  }
  catch (err) { error.value = err.message }
  finally { loading.value = false }
}

const scheduleRefresh = debounce(refresh, 200)

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
  } catch (err) { error.value = err.message }
  finally { saving.value = false }
}

async function toggle(seat) {
  try {
    await updateSeatStatus(seat.seatId, seat.status === 'maintenance' ? 'available' : 'maintenance')
    await refresh()
    await nextTick()
    flashRow(pageRef.value?.querySelector(`[data-row-key="${seat.seatId}"]`))
    if (seat.status !== 'maintenance') wiggleIcon(pageRef.value?.querySelector(`.admin-seat-map button[title*="${seat.code}"]`))
  }
  catch (err) { error.value = err.message }
}

async function remove(seat) {
  if (!window.confirm(`确认删除座位 ${seat.code}？存在未来预约时系统会拒绝删除。`)) return
  try { await deleteSeat(seat.seatId); await refresh() }
  catch (err) { error.value = err.message }
}

watch([date, timeSlot], scheduleRefresh)
onMounted(async () => {
  await refresh()
  await nextTick()
  revealCards('.admin-stat', { key: 'seat-stats', stagger: 0.055 })
})
onBeforeUnmount(scheduleRefresh.cancel)
</script>

<template>
  <div ref="pageRef" class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title"><span class="section-eyebrow">Seats</span><h1>座位地图管理</h1><p>维护座位位置、容量与状态，并按日期和时段查看实时占用。</p></div>
      <div class="cb-cluster"><BaseButton variant="outline" :loading="loading" @click="refresh">刷新</BaseButton><BaseButton @click="openEditor()">新增座位</BaseButton></div>
    </header>
    <section class="admin-stat-grid"><div class="admin-stat"><span>空闲</span><strong>{{ stats.available }}</strong></div><div class="admin-stat"><span>已预约</span><strong>{{ stats.reserved }}</strong></div><div class="admin-stat"><span>维护中</span><strong>{{ stats.maintenance }}</strong></div><div class="admin-stat"><span>总座位</span><strong>{{ seats.length }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="date" type="date" label="日期" :min="today" /><BaseSelect v-model="timeSlot" label="时间段" :options="timeOptions" /></section>
    <section class="seat-occupancy" aria-label="当前时段占用率"><div><strong>当前时段占用率</strong><span>{{ occupancyRate }}%</span></div><progress :value="occupancyRate" max="100">{{ occupancyRate }}%</progress></section>
    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="admin-panel">
      <div ref="mapRef" class="admin-seat-map" data-cursor="drag" data-draggable="true" aria-label="可拖拽座位地图">
        <button v-for="seat in seats" :key="seat.seatId" type="button" data-cursor="drag" data-draggable="true" :title="`${seat.code} ${seat.status}，拖拽可调整位置，点击可编辑`" :aria-label="`${seat.code}，拖拽调整位置，点击编辑`" :class="[`is-${seat.status}`, { 'is-dragging': draggingSeatId === seat.seatId }]" :style="{ left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.width || 64}px`, height: `${seat.height || 52}px` }" @pointerdown="startSeatDrag(seat, $event)" @pointermove="moveSeat" @pointerup="finishSeatDrag" @pointercancel="finishSeatDrag($event, true)" @click="handleSeatClick(seat, $event)"><strong>{{ seat.code }}</strong><small>{{ seat.status === 'available' ? '空闲' : seat.status === 'reserved' ? '已预约' : '停用' }}</small></button>
      </div>
      <BaseTable :columns="columns" :items="seats" :loading="loading" empty-text="暂无座位">
        <template #cell-capacity="{ value }">{{ value }} 人</template>
        <template #cell-status="{ item }"><BaseBadge :variant="item.status === 'available' ? 'success' : item.status === 'reserved' ? 'warning' : 'neutral'">{{ item.status === 'available' ? '空闲' : item.status === 'reserved' ? '已预约' : '停用' }}</BaseBadge></template>
        <template #cell-booking="{ item }"><div v-if="item.bookingInfo"><strong>{{ item.bookingInfo.nickname }}</strong><small>{{ item.bookingInfo.phoneMasked }} · {{ item.bookingInfo.bookingNo }}</small></div><span v-else>-</span></template>
        <template #cell-actions="{ item }"><div class="cb-cluster"><BaseButton size="sm" variant="outline" @click="openEditor(item)">编辑</BaseButton><BaseButton size="sm" :disabled="item.status === 'reserved'" @click="toggle(item)">{{ item.status === 'maintenance' ? '启用' : '设为维护' }}</BaseButton><BaseButton size="sm" variant="danger" :disabled="item.status === 'reserved'" @click="remove(item)">删除</BaseButton></div></template>
      </BaseTable>
      <EmptyState v-if="!loading && !seats.length" title="暂无座位数据" />
    </section>

    <BaseModal v-model="modalOpen" :title="editingId ? '编辑座位' : '新增座位'">
      <form class="admin-form" @submit.prevent="save">
        <div class="form-grid"><BaseInput v-model="form.code" label="座位编号" /><BaseInput v-model="form.name" label="座位名称" /><BaseInput v-model="form.area" label="区域" /><BaseInput v-model="form.capacity" type="number" label="容量" min="1" /><BaseInput v-model="form.x" type="number" label="X 坐标 (%)" min="0" max="100" /><BaseInput v-model="form.y" type="number" label="Y 坐标 (%)" min="0" max="100" /><BaseInput v-model="form.width" type="number" label="宽度 (px)" min="32" /><BaseInput v-model="form.height" type="number" label="高度 (px)" min="32" /><BaseInput v-model="form.sortOrder" type="number" label="排序" /><BaseSelect v-model="form.status" label="状态" :options="statusOptions" /></div>
        <BaseButton type="submit" :loading="saving">保存座位</BaseButton>
      </form>
    </BaseModal>
    <div class="seat-toast"><BaseToast v-model="toastVisible" :variant="toastVariant" :title="toastTitle">{{ toastMessage }}</BaseToast></div>
  </div>
</template>

<style scoped>
.admin-seat-map{position:relative;height:25rem;overflow:hidden;background:linear-gradient(135deg,var(--cb-bg-soft),var(--cb-bg-page));border:.0625rem solid var(--cb-border-strong);border-radius:var(--cb-radius-xl)}
.admin-seat-map button{position:absolute;display:grid;place-content:center;color:var(--cb-text-primary);background:var(--cb-bg-surface);border:.125rem solid var(--cb-success);border-radius:var(--cb-radius-lg);cursor:grab;touch-action:none;user-select:none;transform:translate(-50%,-50%)}
.admin-seat-map button:active,.admin-seat-map button.is-dragging{z-index:3;cursor:grabbing;box-shadow:0 0 0 .3rem color-mix(in srgb,var(--cb-color-gold) 22%,transparent),var(--cb-shadow-lg)}
.admin-seat-map button.is-reserved{border-color:var(--cb-warning);background:color-mix(in srgb,var(--cb-warning) 12%,var(--cb-bg-surface))}.admin-seat-map button.is-maintenance{color:var(--cb-text-muted);border-color:var(--cb-border-strong);background:var(--cb-bg-soft)}
.admin-seat-map small{font-size:var(--cb-font-size-xs)}
.seat-toast{position:fixed;z-index:var(--cb-z-toast);right:var(--cb-space-5);bottom:var(--cb-space-5);width:min(calc(100% - var(--cb-space-8)),24rem)}
@media(prefers-reduced-motion:reduce){.admin-seat-map button{transition:none!important}}
</style>
