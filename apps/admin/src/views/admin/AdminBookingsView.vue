<script setup>
import { computed, onMounted, ref } from 'vue'

import { BaseBadge, BaseButton, BaseInput, BaseSelect, BaseTable } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const phone = ref('')
const date = ref('')
const status = ref('')
const statusOptions=[{label:'全部状态',value:'all'},{label:'已确认',value:'confirmed'},{label:'已取消',value:'cancelled'},{label:'已到店',value:'arrived'}]
const columns=[{key:'id',label:'预约号'},{key:'contactName',label:'用户'},{key:'phone',label:'手机号'},{key:'date',label:'日期'},{key:'time',label:'时间段'},{key:'seat',label:'座位'},{key:'status',label:'状态'},{key:'actions',label:'操作'}]
const visible=computed(()=>adminStore.bookings.filter(item=>(!phone.value||item.phone.includes(phone.value))&&(!date.value||item.date===date.value)&&(!status.value||status.value==='all'||item.status===status.value)))
const stats=computed(()=>[['今日预约',adminStore.bookings.filter(i=>i.date===new Date().toISOString().slice(0,10)).length],['总预约',adminStore.bookings.length],['已确认',adminStore.bookings.filter(i=>i.status==='confirmed').length],['已取消',adminStore.bookings.filter(i=>i.status==='cancelled').length]])
async function update(id,next){await adminStore.updateAdminBookingStatus(id,next)}
onMounted(() => {
  adminStore.fetchAdminBookings()
})
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Space</span><h1>预约管理</h1><p>管理空间座位预约和到店状态。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="phone" search placeholder="搜索手机号" /><BaseInput v-model="date" type="date" aria-label="预约日期" /><BaseSelect v-model="status" aria-label="预约状态" :options="statusOptions" /></section>
    <BaseTable :columns="columns" :items="visible" empty-text="暂无匹配预约"><template #cell-status="{ value }"><BaseBadge :variant="value==='confirmed'?'success':value==='arrived'?'info':'neutral'">{{ value==='confirmed'?'已确认':value==='arrived'?'已到店':'已取消' }}</BaseBadge></template><template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="update(item.id,'confirmed')">确认预约</BaseButton><BaseButton size="sm" variant="ghost" @click="update(item.id,'arrived')">标记到店</BaseButton><BaseButton size="sm" variant="danger" @click="update(item.id,'cancelled')">取消预约</BaseButton></div></template></BaseTable>
  </div>
</template>
