<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const categories = ['文学', '商业', '艺术', '生活', '心理', '设计'].map((item) => ({ label: item, value: item }))
const statuses = [
  { label: '可展示', value: 'available' },
  { label: '不可用', value: 'unavailable' },
  { label: '隐藏', value: 'hidden' },
]
const columns = [
  { key: 'visual', label: '封面' }, { key: 'primary', label: '图书' }, { key: 'category', label: '分类' },
  { key: 'rating', label: '评分' }, { key: 'stock', label: '库存' }, { key: 'status', label: '状态' }, { key: 'actions', label: '操作' },
]
const fields = [
  { key: 'title', label: '书名' }, { key: 'slug', label: 'Slug' }, { key: 'author', label: '作者' },
  { key: 'category', label: '分类', type: 'select', options: categories },
  { key: 'coverUrl', label: '图书封面', type: 'image', uploadScene: 'book' },
  { key: 'rating', label: '评分', type: 'number' }, { key: 'stock', label: '库存', type: 'number' },
  { key: 'publisher', label: '出版社' }, { key: 'year', label: '出版年份', type: 'number' },
  { key: 'summary', label: '简介', type: 'textarea' },
  { key: 'status', label: '状态', type: 'select', options: statuses, default: 'available' },
]
const stats = [
  { label: '图书总数', icon: 'B', value: (items) => items.length, hint: '全部馆藏' },
  { label: '可借阅', icon: 'Y', value: (items) => items.filter((item) => item.stock > 0 && item.enabled !== false).length, hint: '当前可用馆藏' },
  { label: '库存不足', icon: '!', value: (items) => items.filter((item) => item.stock > 0 && item.stock < 5).length, hint: '库存少于 5 本' },
  { label: '分类数量', icon: '#', value: (items) => new Set(items.map((item) => item.category)).size, hint: '内容分类' },
]
</script>

<template>
  <AdminCrudView type="books" title="图书管理" description="维护图书馆藏、封面、分类、库存和状态。" singular="图书" :columns="columns" :fields="fields" :stats="stats" :category-options="categories" />
</template>
