<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { createSeat, deleteSeat, fetchSeatUsage, updateSeat, updateSeatStatus } from '@/api/admin'
import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable, EmptyState } from '@/components/base'
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
const form = reactive({ code: '', name: '', area: '', capacity: 1, x: 50, y: 50, width: 64, height: 52, sortOrder: 0, status: 'available' })
const timeOptions = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map((value) => ({ label: value, value }))
const statusOptions = [{ label: '启用', value: 'available' }, { label: '停用', value: 'disabled' }]
const columns = [{ key: 'code', label: '座位' }, { key: 'area', label: '区域' }, { key: 'capacity', label: '容量' }, { key: 'status', label: '当前状态' }, { key: 'booking', label: '预约信息' }, { key: 'actions', label: '操作' }]
const stats = computed(() => ({ available: seats.value.filter((item) => item.status === 'available').length, reserved: seats.value.filter((item) => item.status === 'reserved').length, disabled: seats.value.filter((item) => item.status === 'disabled').length }))

async function refresh() {
  loading.value = true
  error.value = ''
  try { seats.value = (await fetchSeatUsage({ date: date.value, timeSlot: timeSlot.value })).data }
  catch (err) { error.value = err.message }
  finally { loading.value = false }
}

function openEditor(seat = null) {
  editingId.value = seat?.seatId || null
  Object.assign(form, seat ? { ...seat, status: seat.status === 'reserved' ? 'available' : seat.status } : { code: '', name: '', area: '', capacity: 1, x: 50, y: 50, width: 64, height: 52, sortOrder: 0, status: 'available' })
  modalOpen.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value) await updateSeat(editingId.value, form)
    else await createSeat(form)
    modalOpen.value = false
    await refresh()
  } catch (err) { error.value = err.message }
  finally { saving.value = false }
}

async function toggle(seat) {
  try { await updateSeatStatus(seat.seatId, seat.status === 'disabled' ? 'available' : 'disabled'); await refresh() }
  catch (err) { error.value = err.message }
}

async function remove(seat) {
  if (!window.confirm(`确认删除座位 ${seat.code}？存在未来预约时系统会拒绝删除。`)) return
  try { await deleteSeat(seat.seatId); await refresh() }
  catch (err) { error.value = err.message }
}

watch([date, timeSlot], refresh)
onMounted(refresh)
</script>

<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__title"><span class="section-eyebrow">Seats</span><h1>座位地图管理</h1><p>维护座位位置、容量与状态，并按日期和时段查看实时占用。</p></div>
      <div class="cb-cluster"><BaseButton variant="outline" :loading="loading" @click="refresh">刷新</BaseButton><BaseButton @click="openEditor()">新增座位</BaseButton></div>
    </header>
    <section class="admin-stat-grid"><div class="admin-stat"><span>空闲</span><strong>{{ stats.available }}</strong></div><div class="admin-stat"><span>已预约</span><strong>{{ stats.reserved }}</strong></div><div class="admin-stat"><span>停用</span><strong>{{ stats.disabled }}</strong></div><div class="admin-stat"><span>总座位</span><strong>{{ seats.length }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="date" type="date" label="日期" :min="today" /><BaseSelect v-model="timeSlot" label="时间段" :options="timeOptions" /></section>
    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="admin-panel">
      <div class="admin-seat-map">
        <button v-for="seat in seats" :key="seat.seatId" type="button" :class="`is-${seat.status}`" :style="{ left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.width || 64}px`, height: `${seat.height || 52}px` }" @click="openEditor(seat)"><strong>{{ seat.code }}</strong><small>{{ seat.status === 'available' ? '空闲' : seat.status === 'reserved' ? '已预约' : '停用' }}</small></button>
      </div>
      <BaseTable :columns="columns" :items="seats" :loading="loading" empty-text="暂无座位">
        <template #cell-capacity="{ value }">{{ value }} 人</template>
        <template #cell-status="{ item }"><BaseBadge :variant="item.status === 'available' ? 'success' : item.status === 'reserved' ? 'warning' : 'neutral'">{{ item.status === 'available' ? '空闲' : item.status === 'reserved' ? '已预约' : '停用' }}</BaseBadge></template>
        <template #cell-booking="{ item }"><div v-if="item.bookingInfo"><strong>{{ item.bookingInfo.nickname }}</strong><small>{{ item.bookingInfo.phoneMasked }} · {{ item.bookingInfo.bookingNo }}</small></div><span v-else>-</span></template>
        <template #cell-actions="{ item }"><div class="cb-cluster"><BaseButton size="sm" variant="outline" @click="openEditor(item)">编辑</BaseButton><BaseButton size="sm" :disabled="item.status === 'reserved'" @click="toggle(item)">{{ item.status === 'disabled' ? '启用' : '停用' }}</BaseButton><BaseButton size="sm" variant="danger" :disabled="item.status === 'reserved'" @click="remove(item)">删除</BaseButton></div></template>
      </BaseTable>
      <EmptyState v-if="!loading && !seats.length" title="暂无座位数据" />
    </section>

    <BaseModal v-model="modalOpen" :title="editingId ? '编辑座位' : '新增座位'">
      <form class="admin-form" @submit.prevent="save">
        <div class="form-grid"><BaseInput v-model="form.code" label="座位编号" /><BaseInput v-model="form.name" label="座位名称" /><BaseInput v-model="form.area" label="区域" /><BaseInput v-model="form.capacity" type="number" label="容量" min="1" /><BaseInput v-model="form.x" type="number" label="X 坐标 (%)" min="0" max="100" /><BaseInput v-model="form.y" type="number" label="Y 坐标 (%)" min="0" max="100" /><BaseInput v-model="form.width" type="number" label="宽度 (px)" min="32" /><BaseInput v-model="form.height" type="number" label="高度 (px)" min="32" /><BaseInput v-model="form.sortOrder" type="number" label="排序" /><BaseSelect v-model="form.status" label="状态" :options="statusOptions" /></div>
        <BaseButton type="submit" :loading="saving">保存座位</BaseButton>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-seat-map{position:relative;height:25rem;overflow:hidden;background:linear-gradient(135deg,var(--cb-bg-soft),var(--cb-bg-page));border:.0625rem solid var(--cb-border-strong);border-radius:var(--cb-radius-xl)}
.admin-seat-map button{position:absolute;display:grid;place-content:center;color:var(--cb-text-primary);background:var(--cb-bg-surface);border:.125rem solid var(--cb-success);border-radius:var(--cb-radius-lg);transform:translate(-50%,-50%)}
.admin-seat-map button.is-reserved{border-color:var(--cb-warning);background:color-mix(in srgb,var(--cb-warning) 12%,var(--cb-bg-surface))}.admin-seat-map button.is-disabled{color:var(--cb-text-muted);border-color:var(--cb-border-strong);background:var(--cb-bg-soft)}
.admin-seat-map small{font-size:var(--cb-font-size-xs)}
</style>
