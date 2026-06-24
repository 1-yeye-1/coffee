<script setup>
import AdminCrudView from '@/components/admin/AdminCrudView.vue'

const productTypes = [
  { label: '咖啡商品', value: 'coffee' },
  { label: '文创商品', value: 'cultural' },
]

const statuses = [
  { label: '上架', value: 'active' },
  { label: '下架', value: 'inactive' },
  { label: '草稿', value: 'draft' },
]

const categories = [
  '咖啡',
  '咖啡豆',
  '挂耳咖啡',
  '现磨咖啡',
  '冷萃咖啡',
  '咖啡杯',
  '杯子',
  '帆布袋',
  '笔记本',
  '书签',
  '明信片',
  '咖啡器具',
  '周边礼盒',
].map((item) => ({ label: item, value: item }))

const columns = [
  { key: 'visual', label: '商品图' },
  { key: 'primary', label: '商品' },
  { key: 'productType', label: '类型' },
  { key: 'category', label: '分类' },
  { key: 'price', label: '价格' },
  { key: 'stock', label: '库存' },
  { key: 'sales', label: '销量' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const fields = [
  { key: 'name', label: '名称' },
  { key: 'productType', label: '商品类型', type: 'select', options: productTypes, default: 'coffee' },
  { key: 'supportsBrewMethod', label: '咖啡商品支持制作方式', type: 'checkbox', default: true },
  { key: 'imageUrl', label: '商品图片', type: 'image' },
  { key: 'category', label: '分类', type: 'select', options: categories },
  { key: 'price', label: '价格', type: 'number' },
  { key: 'originalPrice', label: '原价', type: 'number' },
  { key: 'stock', label: '库存', type: 'number' },
  { key: 'lowStockThreshold', label: '低库存预警值', type: 'number', default: 5 },
  { key: 'sales', label: '销量', type: 'number' },
  { key: 'isFeatured', label: '推荐商品', type: 'checkbox', default: false },
  { key: 'isNew', label: '新品标记', type: 'checkbox', default: false },
  { key: 'isHot', label: '热销标记', type: 'checkbox', default: false },
  { key: 'flavor', label: '风味 / 卖点（顿号或逗号分隔）', array: true },
  { key: 'origin', label: '产地 / 来源' },
  { key: 'roast', label: '烘焙度 / 规格' },
  { key: 'description', label: '简介', type: 'textarea' },
  { key: 'status', label: '状态', type: 'select', options: statuses, default: 'active' },
]

const stats = [
  { label: '商品总数', icon: 'P', value: (items) => items.length, hint: '全部商品' },
  { label: '推荐商品', icon: '★', value: (items) => items.filter((item) => item.isFeatured).length, hint: '首页或列表优先展示' },
  { label: '新品 / 热销', icon: 'N', value: (items) => `${items.filter((item) => item.isNew).length} / ${items.filter((item) => item.isHot).length}`, hint: '新品与热销标记' },
  { label: '低库存预警', icon: '!', value: (items) => items.filter((item) => Number(item.stock || 0) <= Number(item.lowStockThreshold || 5)).length, hint: '库存达到预警值' },
]
</script>

<template>
  <AdminCrudView
    type="products"
    title="商品管理"
    description="维护咖啡商品与文创商品，支持推荐、新品、热销标记、库存预警和库存调整。"
    singular="商品"
    :columns="columns"
    :fields="fields"
    :stats="stats"
    :category-options="categories"
  />
</template>
