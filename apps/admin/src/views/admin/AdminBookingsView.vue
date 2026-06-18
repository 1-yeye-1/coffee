<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { BaseBadge, BaseButton, BaseInput, BaseSelect, BaseTable } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const route = useRoute()
const phone = ref(String(route.query.keyword || ''))
const date = ref('')
const status = ref('')
const statusOptions=[{label:'全部状态',value:'all'},{label:'待确认',value:'pending'},{label:'已确认',value:'confirmed'},{label:'已取消',value:'cancelled'},{label:'已完成',value:'completed'}]
const editableStatusOptions=statusOptions.filter((item)=>item.value!=='all')
const statusText={pending:'待确认',confirmed:'已确认',cancelled:'已取消',completed:'已完成',arrived:'已到店'}
const columns=[{key:'id',label:'预约号'},{key:'contactName',label:'用户'},{key:'phone',label:'手机号'},{key:'date',label:'日期'},{key:'time',label:'时间段'},{key:'seat',label:'座位'},{key:'status',label:'状态'},{key:'actions',label:'操作'}]
const visible=computed(()=>adminStore.bookings.filter(item=>(!phone.value||item.phone.includes(phone.value))&&(!date.value||item.date===date.value)&&(!status.value||status.value==='all'||item.status===status.value)))
const stats=computed(()=>[['今日预约',adminStore.bookings.filter(i=>i.date===new Date().toISOString().slice(0,10)).length],['总预约',adminStore.bookings.length],['已确认',adminStore.bookings.filter(i=>i.status==='confirmed').length],['已取消',adminStore.bookings.filter(i=>i.status==='cancelled').length]])
async function update(id,next){await adminStore.updateAdminBookingStatus(id,next)}
onMounted(() => {
  adminStore.fetchAdminBookings()
})
watch(() => route.query.keyword, (value) => { phone.value = String(value || '') })
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Space</span><h1>预约管理</h1><p>管理空间座位预约和到店状态。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="phone" search placeholder="搜索手机号" /><BaseInput v-model="date" type="date" aria-label="预约日期" /><BaseSelect v-model="status" aria-label="预约状态" :options="statusOptions" /></section>
    <BaseTable :columns="columns" :items="visible" empty-text="暂无匹配预约"><template #cell-status="{ item }"><BaseSelect :model-value="item.status" :aria-label="`修改预约 ${item.id} 状态`" :options="editableStatusOptions" @update:model-value="update(item.id,$event)" /></template><template #cell-actions="{ item }"><BaseBadge :variant="item.status==='confirmed'?'success':item.status==='pending'?'warning':'neutral'">{{ statusText[item.status] || item.status }}</BaseBadge></template></BaseTable>
  </div>
</template>
