<script setup>
import { computed, reactive, ref } from 'vue'

import { BaseBadge, BaseButton, BaseInput, BaseModal, BaseSelect, BaseTable } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore=useAdminStore()
const keyword=ref('');const status=ref('');const level=ref('');const modalOpen=ref(false);const editingId=ref(null)
const form=reactive({nickname:'',phone:'',email:'',level:'Silver',points:0})
const statusOptions=[{label:'全部状态',value:'all'},{label:'启用',value:'active'},{label:'禁用',value:'disabled'}]
const levelOptions=['Silver','Gold','Black'].map(i=>({label:i,value:i}))
const columns=[{key:'avatar',label:'头像'},{key:'nickname',label:'昵称'},{key:'phone',label:'手机号'},{key:'email',label:'邮箱'},{key:'level',label:'等级'},{key:'points',label:'积分'},{key:'status',label:'状态'},{key:'actions',label:'操作'}]
const visible=computed(()=>adminStore.users.filter(i=>(!keyword.value||`${i.nickname}${i.phone}`.toLowerCase().includes(keyword.value.toLowerCase()))&&(!status.value||status.value==='all'||i.status===status.value)&&(!level.value||level.value==='all'||i.level===level.value)))
const stats=computed(()=>[['用户总数',adminStore.users.length],['会员用户',adminStore.users.filter(i=>['Gold','Black'].includes(i.level)).length],['活跃用户',adminStore.users.filter(i=>i.status==='active').length],['禁用用户',adminStore.users.filter(i=>i.status==='disabled').length]])
function edit(item){editingId.value=item.id;Object.assign(form,item);modalOpen.value=true}
function save(){adminStore.updateUser(editingId.value,form);modalOpen.value=false}
function toggle(item){adminStore.updateUser(item.id,{status:item.status==='active'?'disabled':'active'})}
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Customers</span><h1>用户管理</h1><p>维护用户资料、会员等级、积分和账户状态。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <section class="admin-filter-bar"><BaseInput v-model="keyword" search placeholder="搜索昵称或手机号" /><BaseSelect v-model="status" aria-label="用户状态" :options="statusOptions" /><BaseSelect v-model="level" aria-label="会员等级" :options="[{label:'全部等级',value:'all'},...levelOptions]" /></section>
    <BaseTable :columns="columns" :items="visible" empty-text="暂无匹配用户"><template #cell-avatar="{ item }"><span class="admin-user-avatar">{{ item.nickname.slice(0,1) }}</span></template><template #cell-level="{ value }"><BaseBadge variant="premium">{{ value }}</BaseBadge></template><template #cell-status="{ value }"><BaseBadge :variant="value==='active'?'success':'neutral'">{{ value==='active'?'启用':'禁用' }}</BaseBadge></template><template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="edit(item)">编辑用户</BaseButton><BaseButton size="sm" variant="ghost" @click="toggle(item)">{{ item.status==='active'?'禁用':'启用' }}</BaseButton></div></template></BaseTable>
    <BaseModal v-model="modalOpen" title="编辑用户"><form class="admin-form" @submit.prevent="save"><BaseInput v-model="form.nickname" label="昵称" /><BaseInput v-model="form.phone" label="手机号" /><BaseInput v-model="form.email" label="邮箱" /><BaseSelect v-model="form.level" label="会员等级" :options="levelOptions" /><BaseInput v-model="form.points" type="number" label="积分" /><div class="admin-actions"><BaseButton variant="ghost" type="button" @click="modalOpen=false">取消</BaseButton><BaseButton type="submit">保存</BaseButton></div></form></BaseModal>
  </div>
</template>
