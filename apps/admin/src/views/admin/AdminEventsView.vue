<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const categories = ['读书会', '咖啡课', '文化沙龙', '创意工作坊', '亲子阅读'].map((item) => ({ label: item, value: item }))
const columns = [
  { key: 'primary', label: '活动标题' }, { key: 'date', label: '日期' }, { key: 'time', label: '时间' },
  { key: 'attendees', label: '报名人数' }, { key: 'capacity', label: '容量' }, { key: 'status', label: '状态' }, { key: 'actions', label: '操作' },
]
const fields = [
  { key: 'title', label: '活动标题' }, { key: 'slug', label: 'Slug' }, { key: 'category', label: '分类', type: 'select', options: categories }, { key: 'date', label: '日期', type: 'date' },
  { key: 'time', label: '时间' }, { key: 'location', label: '地点' }, { key: 'attendees', label: '报名人数', type: 'number' },
  { key: 'capacity', label: '容量', type: 'number' }, { key: 'summary', label: '活动简介', type: 'textarea' }, { key: 'status', label: '状态' },
]
const stats = [
  { label: '活动总数', icon: 'E', value: (items) => items.length, hint: '全部活动' },
  { label: '正在报名', icon: '✓', value: (items) => items.filter((item) => item.status.includes('报名') || item.status.includes('满员')).length, hint: '开放报名' },
  { label: '报名人数', icon: '+', value: (items) => items.reduce((sum, item) => sum + item.attendees, 0), hint: '累计报名' },
  { label: '已结束', icon: '—', value: () => 0, hint: '当前模拟数据' },
]
</script>
<template><AdminCrudView type="events" title="活动管理" description="创建活动并维护时间、场地、容量和报名状态。" singular="活动" :columns="columns" :fields="fields" :stats="stats" :category-options="categories" /></template>
