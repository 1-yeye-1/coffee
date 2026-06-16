<script setup>
import InfoPageShell from './InfoPageShell.vue'

const sections = [
  {
    title: '我们是谁',
    paragraphs: [
      'Coffee Book 是一个把精品咖啡、精选阅读和城市文化活动放在同一张桌上的生活方式空间。我们相信，一杯好咖啡和一本好书，都能让日常慢下来一点。',
      '线上平台承载商品浏览、空间预约、图书活动和社区交流；线下空间则提供安静阅读、轻量办公、朋友聚会和主题沙龙。',
    ],
  },
  {
    title: '我们的理念',
    paragraphs: [
      '我们偏爱温暖、克制、真实的体验：咖啡不只是一种饮品，阅读不只是一种消费，社区也不只是内容列表。',
      'Coffee Book 希望成为城市里的柔软节点，让用户在忙碌生活中找到稳定的味道、可以停留的角落和愿意分享的灵感。',
    ],
  },
  {
    title: '我们提供什么',
    paragraphs: [],
    items: [
      '精选咖啡豆、挂耳咖啡、咖啡器具和主题礼盒。',
      '图书推荐、阅读活动、作者分享和城市文化沙龙。',
      '可预约的阅读座位、安静工作区和小型交流空间。',
      '面向咖啡、阅读与生活方式的友好社区。',
    ],
  },
  {
    title: '服务承诺',
    paragraphs: [
      '我们会认真对待每一份订单、每一次预约和每一条社区反馈。无论你是第一次来，还是已经熟悉这里的咖啡香，我们都希望你被清楚、温和地接待。',
    ],
  },
]

const asideItems = [
  { label: '品牌主色', value: '咖啡棕与暖金色' },
  { label: '空间关键词', value: '阅读、咖啡、社区、灵感' },
  { label: '门店城市', value: '上海' },
]
</script>

<template>
  <InfoPageShell
    eyebrow="About Coffee Book"
    title="关于我们"
    description="Coffee Book 是一间咖啡书屋，也是一处让阅读、咖啡和人与人之间的连接自然发生的城市空间。"
    :sections="sections"
    aside-title="品牌信息"
    :aside-items="asideItems"
  />
</template>
