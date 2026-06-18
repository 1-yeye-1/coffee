<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchSeatUsage, updateSeatStatus } from '@/api/admin'
import { BaseBadge, BaseButton, BaseInput, BaseSelect, BaseTable, EmptyState } from '@/components/base'
import '@/assets/styles/pages/admin-management.css'

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
const date = ref(today)
const timeSlot = ref('09:00-11:00')
const seats = ref([])
const loading = ref(false)
const error = ref('')
const timeOptions = ['09:00-11:00','11:00-13:00','13:00-15:00','15:00-17:00','17:00-19:00','19:00-21:00'].map((value)=>({label:value,value}))
const columns=[{key:'code',label:'座位'},{key:'area',label:'区域'},{key:'capacity',label:'容量'},{key:'status',label:'当前状态'},{key:'booking',label:'预约信息'},{key:'actions',label:'操作'}]
const stats=computed(()=>({available:seats.value.filter(i=>i.status==='available').length,reserved:seats.value.filter(i=>i.status==='reserved').length,disabled:seats.value.filter(i=>i.status==='disabled').length}))

async function refresh(){loading.value=true;error.value='';try{seats.value=(await fetchSeatUsage({date:date.value,timeSlot:timeSlot.value})).data}catch(err){error.value=err.message}finally{loading.value=false}}
async function toggle(seat){await updateSeatStatus(seat.seatId,seat.status==='disabled'?'available':'disabled');await refresh()}
watch([date,timeSlot],refresh)
onMounted(refresh)
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Seats</span><h1>座位使用</h1><p>按日期和时间段查看书屋座位占用，并启用或停用座位。</p></div><BaseButton variant="outline" :loading="loading" @click="refresh">刷新</BaseButton></header>
    <section class="admin-stat-grid"><div class="admin-stat"><span>空闲</span><strong>{{ stats.available }}</strong></div><div class="admin-stat"><span>已预约</span><strong>{{ stats.reserved }}</strong></div><div class="admin-stat"><span>停用</span><strong>{{ stats.disabled }}</strong></div><div class="admin-stat"><span>总座位</span><strong>{{ seats.length }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="date" type="date" label="日期" :min="today" /><BaseSelect v-model="timeSlot" label="时间段" :options="timeOptions" /></section>
    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="admin-panel">
      <div class="admin-seat-map"><button v-for="seat in seats" :key="seat.seatId" type="button" :class="`is-${seat.status}`" :style="{left:`${seat.x}%`,top:`${seat.y}%`}" :title="`${seat.name} · ${seat.status}`"><strong>{{ seat.code }}</strong><small>{{ seat.status==='available'?'空闲':seat.status==='reserved'?'已预约':'停用' }}</small></button><span class="admin-seat-map__window">靠窗区</span><span class="admin-seat-map__bar">咖啡吧台</span></div>
      <BaseTable :columns="columns" :items="seats" :loading="loading" empty-text="暂无座位">
        <template #cell-capacity="{value}">{{ value }} 人</template>
        <template #cell-status="{item}"><BaseBadge :variant="item.status==='available'?'success':item.status==='reserved'?'warning':'neutral'">{{ item.status==='available'?'空闲':item.status==='reserved'?'已预约':'停用' }}</BaseBadge></template>
        <template #cell-booking="{item}"><div v-if="item.bookingInfo" class="admin-cell-primary"><strong>{{ item.bookingInfo.nickname }}</strong><small>{{ item.bookingInfo.phoneMasked }} · {{ item.bookingInfo.peopleCount }} 人 · {{ item.bookingInfo.bookingNo }}</small></div><span v-else class="text-muted">-</span></template>
        <template #cell-actions="{item}"><BaseButton size="sm" :variant="item.status==='disabled'?'outline':'danger'" :disabled="item.status==='reserved'" @click="toggle(item)">{{ item.status==='disabled'?'启用':'停用' }}</BaseButton></template>
      </BaseTable>
      <EmptyState v-if="!loading&&!seats.length" title="暂无座位数据" />
    </section>
  </div>
</template>
<style scoped>
.admin-seat-map{position:relative;height:25rem;overflow:hidden;background:linear-gradient(135deg,var(--cb-bg-soft),var(--cb-bg-page));border:.0625rem solid var(--cb-border-strong);border-radius:var(--cb-radius-xl)}.admin-seat-map button{position:absolute;display:grid;width:4rem;height:3.25rem;place-content:center;color:var(--cb-text-primary);background:var(--cb-bg-surface);border:.125rem solid var(--cb-success);border-radius:var(--cb-radius-lg);transform:translate(-50%,-50%)}.admin-seat-map button.is-reserved{border-color:var(--cb-warning);background:color-mix(in srgb,var(--cb-warning) 12%,var(--cb-bg-surface))}.admin-seat-map button.is-disabled{color:var(--cb-text-muted);border-color:var(--cb-border-strong);background:var(--cb-bg-soft)}.admin-seat-map small{font-size:var(--cb-font-size-xs)}.admin-seat-map__window,.admin-seat-map__bar{position:absolute;color:var(--cb-text-muted);font-size:var(--cb-font-size-xs);letter-spacing:.12em}.admin-seat-map__window{top:var(--cb-space-3);left:50%}.admin-seat-map__bar{right:12%;bottom:var(--cb-space-4)}
</style>
