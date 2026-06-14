<script setup>
import { computed } from 'vue'

import { BaseBadge, BaseTable } from '@/components/base'
import { paymentRecords, revenueTrend } from '@/data/admin'
import { useOrderStore } from '@/stores/orders'
import '@/assets/styles/pages/admin-management.css'

const orderStore=useOrderStore()
const maxRevenue=Math.max(...revenueTrend)
const total=computed(()=>orderStore.orders.filter(i=>['paid','completed'].includes(i.status)).reduce((sum,i)=>sum+i.amounts.total,0))
const stats=computed(()=>[
  ['总收入',`¥${total.value||36520}`],['今日收入',`¥${revenueTrend.at(-1)}`],['订单收入',`¥${total.value||28760}`],['活动收入','¥7,760'],['退款金额','¥320'],
])
const columns=[{key:'id',label:'支付编号'},{key:'orderId',label:'订单号'},{key:'user',label:'用户'},{key:'amount',label:'金额'},{key:'method',label:'方式'},{key:'status',label:'状态'},{key:'time',label:'时间'}]
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Finance</span><h1>财务统计</h1><p>查看收入趋势、支付方式与近期支付记录。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <section class="admin-dashboard-grid">
      <div class="admin-chart"><div class="admin-panel__header"><h2>近 7 日收入趋势</h2><BaseBadge variant="premium">Revenue</BaseBadge></div><div class="admin-bars"><div v-for="(value,index) in revenueTrend" :key="value" class="admin-bar"><span :style="{height:`${value/maxRevenue*100}%`}" /><small>{{ index+1 }}日</small></div></div></div>
      <div class="admin-chart"><div class="admin-panel__header"><h2>支付方式占比</h2></div><div class="admin-ranking"><div class="admin-ranking__item"><span>微信支付</span><strong>58%</strong></div><div class="admin-ranking__item"><span>支付宝</span><strong>34%</strong></div><div class="admin-ranking__item"><span>到店支付</span><strong>8%</strong></div></div></div>
    </section>
    <section class="admin-panel"><div class="admin-panel__header"><h2>支付记录</h2></div><BaseTable :columns="columns" :items="paymentRecords"><template #cell-amount="{value}">¥{{ value }}</template><template #cell-status="{value}"><BaseBadge :variant="value==='成功'?'success':'warning'">{{ value }}</BaseBadge></template></BaseTable></section>
  </div>
</template>
