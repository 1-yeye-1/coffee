<script setup>
import { computed, onMounted, ref } from 'vue'

import { BaseBadge, BaseButton, BaseModal, BaseTable, BaseTabs } from '@/components/base'
import { useAdminStore } from '@/stores/admin'
import '@/assets/styles/pages/admin-management.css'

const adminStore = useAdminStore()
const tab = ref('all')
const deleteOpen = ref(false)
const deleting = ref(null)
const tabs = [{label:'全部',value:'all'},{label:'待审核',value:'pending'},{label:'已发布',value:'published'},{label:'已拒绝',value:'rejected'}]
const columns = [{key:'title',label:'标题'},{key:'author',label:'作者'},{key:'excerpt',label:'摘要'},{key:'likes',label:'点赞'},{key:'comments',label:'评论'},{key:'status',label:'状态'},{key:'createdAt',label:'发布时间'},{key:'actions',label:'操作'}]
const rows = computed(() => adminStore.posts.map((item)=>({...item,status:item.reviewStatus,comments:item.comments.length})))
const visible = computed(() => tab.value==='all'?rows.value:rows.value.filter((item)=>item.status===tab.value))
const stats = computed(() => [['帖子总数',rows.value.length],['待审核',rows.value.filter(i=>i.status==='pending').length],['已发布',rows.value.filter(i=>i.status==='published').length],['举报内容',1]])
function askDelete(item){deleting.value=item;deleteOpen.value=true}
async function remove(){await adminStore.remove('posts',deleting.value.id);deleteOpen.value=false}
onMounted(() => {
  adminStore.fetchAdminCollection('posts')
})
</script>
<template>
  <div class="admin-page">
    <header class="admin-page__header"><div class="admin-page__title"><span class="section-eyebrow">Moderation</span><h1>社区审核</h1><p>管理帖子发布状态、精选内容与违规信息。</p></div></header>
    <section class="admin-stat-grid"><div v-for="item in stats" :key="item[0]" class="admin-stat"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div></section>
    <BaseTabs v-model="tab" :tabs="tabs"><BaseTable :columns="columns" :items="visible" empty-text="暂无对应帖子">
      <template #cell-title="{ item }"><div class="admin-cell-primary"><strong>{{ item.title }}</strong><small v-if="item.featured">精选内容</small></div></template>
      <template #cell-excerpt="{ value }"><span class="text-muted">{{ value.slice(0,32) }}…</span></template>
      <template #cell-status="{ value }"><BaseBadge :variant="value==='published'?'success':value==='pending'?'warning':'danger'">{{ value==='published'?'已发布':value==='pending'?'待审核':'已拒绝' }}</BaseBadge></template>
      <template #cell-createdAt="{ value }">{{ new Date(value).toLocaleDateString('zh-CN') }}</template>
      <template #cell-actions="{ item }"><div class="admin-row-actions"><BaseButton size="sm" variant="ghost" @click="adminStore.reviewPost(item.id,'published')">通过</BaseButton><BaseButton size="sm" variant="ghost" @click="adminStore.reviewPost(item.id,'rejected')">拒绝</BaseButton><BaseButton size="sm" variant="ghost" @click="adminStore.toggleFeaturedPost(item.id)">{{ item.featured?'取消精选':'标记精选' }}</BaseButton><BaseButton size="sm" variant="danger" @click="askDelete(item)">删除</BaseButton></div></template>
    </BaseTable></BaseTabs>
    <BaseModal v-model="deleteOpen" title="确认删除"><div class="admin-confirm"><p>确定删除帖子“{{ deleting?.title }}”吗？</p><div class="admin-actions"><BaseButton variant="ghost" @click="deleteOpen=false">取消</BaseButton><BaseButton variant="danger" @click="remove">确认删除</BaseButton></div></div></BaseModal>
  </div>
</template>
