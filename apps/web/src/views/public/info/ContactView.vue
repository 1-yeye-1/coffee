<script setup>
import InfoPageShell from './InfoPageShell.vue'

const sections = [
  {
    title: '用户服务',
    paragraphs: [
      '如果你在注册登录、订单支付、配送信息、空间预约、活动报名或社区发布中遇到问题，可以通过邮箱或电话联系我们。',
      '为了更快定位问题，请在来信中说明你的手机号后四位、订单号或预约编号，以及遇到问题的页面和时间。',
    ],
  },
  {
    title: '门店与营业时间',
    paragraphs: [
      'Coffee Book 城市阅读店位于上海市静安区示例路 88 号，日常营业时间为 09:00 至 21:30。节假日或特殊活动期间可能临时调整，请以页面公告为准。',
      '如需团队预约、小型活动合作或场地咨询，建议提前 3 至 5 个工作日联系我们。',
    ],
  },
  {
    title: '商务与活动合作',
    paragraphs: [
      '我们欢迎独立出版、咖啡品牌、文化机构、创作者和社区伙伴与 Coffee Book 一起策划活动、书单、联名商品或线下体验。',
      '合作提案可发送至 partnership@coffeebook.example，我们会在评估主题契合度和档期后回复。',
    ],
  },
  {
    title: '反馈与建议',
    paragraphs: [
      '你的反馈会直接帮助我们改善商品选择、空间体验和线上功能。无论是页面使用问题、内容建议，还是一次不够理想的体验，都欢迎告诉我们。',
    ],
  },
]

const asideItems = [
  { label: '客服电话', value: '021-8888-2026' },
  { label: '客服邮箱', value: 'hello@coffeebook.example' },
  { label: '合作邮箱', value: 'partnership@coffeebook.example' },
  { label: '服务时间', value: '每日 09:00 - 21:30' },
]
</script>

<template>
  <InfoPageShell
    eyebrow="Contact Us"
    title="联系我们"
    description="无论是订单、预约、活动合作还是体验反馈，都可以从这里找到合适的联系入口。"
    :sections="sections"
    aside-title="联系方式"
    :aside-items="asideItems"
  />
</template>
