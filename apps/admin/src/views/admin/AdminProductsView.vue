<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const categories = ['手冲咖啡', '冷萃', '拿铁', '咖啡豆', '杯具', '礼盒'].map((item) => ({ label: item, value: item }))
const columns = [
  { key: 'visual', label: '商品视觉' }, { key: 'primary', label: '商品' }, { key: 'category', label: '分类' },
  { key: 'price', label: '价格' }, { key: 'stock', label: '库存' }, { key: 'sales', label: '销量' }, { key: 'status', label: '状态' }, { key: 'actions', label: '操作' },
]
const fields = [
  { key: 'name', label: '名称' }, { key: 'slug', label: 'Slug' }, { key: 'category', label: '分类', type: 'select', options: categories }, { key: 'price', label: '价格', type: 'number' },
  { key: 'originalPrice', label: '原价', type: 'number' }, { key: 'stock', label: '库存', type: 'number' }, { key: 'sales', label: '销量', type: 'number' },
  { key: 'flavor', label: '风味（顿号分隔）', array: true }, { key: 'origin', label: '产地' }, { key: 'roast', label: '烘焙度' },
  { key: 'description', label: '简介', type: 'textarea' }, { key: 'status', label: '状态' },
]
const stats = [
  { label: '商品总数', icon: 'P', value: (items) => items.length, hint: '全部商品' },
  { label: '上架中', icon: '✓', value: (items) => items.filter((item) => item.enabled !== false).length, hint: '当前可售' },
  { label: '库存紧张', icon: '!', value: (items) => items.filter((item) => item.stock > 0 && item.stock < 10).length, hint: '库存少于 10 件' },
  { label: '售罄', icon: '0', value: (items) => items.filter((item) => item.stock === 0).length, hint: '需要补货' },
]
</script>
<template><AdminCrudView type="products" title="商品管理" description="维护咖啡商品、价格、库存和销售状态。" singular="商品" :columns="columns" :fields="fields" :stats="stats" :category-options="categories" /></template>
