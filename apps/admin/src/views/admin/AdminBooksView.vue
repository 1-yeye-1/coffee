<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const categories = ['文学', '商业', '艺术', '生活', '心理', '设计'].map((item) => ({ label: item, value: item }))

const statuses = [
  { label: '可展示', value: 'available' },
  { label: '不可用', value: 'unavailable' },
  { label: '隐藏', value: 'hidden' },
]

const columns = [
  { key: 'visual', label: '封面' },
  { key: 'primary', label: '图书' },
  { key: 'category', label: '分类' },
  { key: 'rating', label: '评分' },
  { key: 'stock', label: '库存' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const fields = [
  { key: 'title', label: '书名' },
  { key: 'author', label: '作者' },
  { key: 'category', label: '分类', type: 'select', options: categories },
  { key: 'coverUrl', label: '图书封面', type: 'image', uploadScene: 'book' },
  { key: 'rating', label: '评分', type: 'number' },
  { key: 'stock', label: '库存', type: 'number' },
  { key: 'lowStockThreshold', label: '低库存预警值', type: 'number', default: 3 },
  { key: 'isRecommended', label: '推荐图书', type: 'checkbox', default: false },
  { key: 'isFeatured', label: '热门图书', type: 'checkbox', default: false },
  { key: 'isNew', label: '新书标记', type: 'checkbox', default: false },
  { key: 'seatId', label: '绑定座位 ID', type: 'number' },
  { key: 'locationLabel', label: '馆藏位置说明' },
  { key: 'shelfArea', label: '书架区域' },
  { key: 'shelfCode', label: '书架编号' },
  { key: 'publisher', label: '出版社' },
  { key: 'year', label: '出版年份', type: 'number' },
  { key: 'summary', label: '简介', type: 'textarea' },
  { key: 'status', label: '状态', type: 'select', options: statuses, default: 'available' },
]

const stats = [
  { label: '图书总数', icon: 'B', value: (items) => items.length, hint: '全部馆藏' },
  { label: '推荐 / 热门', icon: '★', value: (items) => `${items.filter((item) => item.isRecommended).length} / ${items.filter((item) => item.isFeatured).length}`, hint: '推荐与热门标记' },
  { label: '新书', icon: 'N', value: (items) => items.filter((item) => item.isNew).length, hint: '新书标记' },
  { label: '低库存预警', icon: '!', value: (items) => items.filter((item) => Number(item.stock || 0) <= Number(item.lowStockThreshold || 3)).length, hint: '库存达到预警值' },
]
</script>

<template>
  <AdminCrudView
    type="books"
    title="图书管理"
    description="维护图书馆藏、封面、分类、库存、馆藏位置和展示状态，支持推荐、热门、新书标记。"
    singular="图书"
    :columns="columns"
    :fields="fields"
    :stats="stats"
    :category-options="categories"
  />
</template>
