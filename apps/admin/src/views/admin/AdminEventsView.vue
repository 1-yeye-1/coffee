<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const categories = ['读书会', '咖啡课', '文化沙龙', '创意工作坊', '亲子阅读'].map((item) => ({ label: item, value: item }))
const statuses = [
  { label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' },
  { label: '进行中', value: 'ongoing' }, { label: '已结束', value: 'ended' },
  { label: '已取消', value: 'cancelled' },
]
const columns = [
  { key: 'visual', label: '海报' }, { key: 'primary', label: '活动标题' }, { key: 'date', label: '日期' },
  { key: 'time', label: '时间' }, { key: 'attendees', label: '报名人数' }, { key: 'capacity', label: '容量' },
  { key: 'status', label: '状态' }, { key: 'actions', label: '操作' },
]
const fields = [
  { key: 'title', label: '活动标题' }, { key: 'slug', label: 'Slug' },
  { key: 'category', label: '分类', type: 'select', options: categories },
  { key: 'coverUrl', label: '活动海报', type: 'image', uploadScene: 'event' },
  { key: 'date', label: '日期', type: 'date' }, { key: 'time', label: '时间' }, { key: 'location', label: '地点' },
  { key: 'attendees', label: '报名人数', type: 'number' }, { key: 'capacity', label: '容量', type: 'number' },
  { key: 'summary', label: '活动简介', type: 'textarea' },
  { key: 'status', label: '状态', type: 'select', options: statuses, default: 'draft' },
]
const stats = [
  { label: '活动总数', icon: 'E', value: (items) => items.length, hint: '全部活动' },
  { label: '开放活动', icon: 'Y', value: (items) => items.filter((item) => ['published', 'ongoing', 'open'].includes(item.status)).length, hint: '当前可报名' },
  { label: '报名人数', icon: '+', value: (items) => items.reduce((sum, item) => sum + Number(item.attendees || 0), 0), hint: '累计报名' },
  { label: '已结束', icon: '-', value: (items) => items.filter((item) => item.status === 'ended').length, hint: '历史活动' },
]
</script>

<template>
  <AdminCrudView type="events" title="活动管理" description="创建活动并维护海报、时间、场地、容量和状态。" singular="活动" :columns="columns" :fields="fields" :stats="stats" :category-options="categories" />
</template>
