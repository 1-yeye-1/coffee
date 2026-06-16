<script setup>
import InfoPageShell from './InfoPageShell.vue'

const sections = [
  {
    title: '我们收集的信息',
    paragraphs: [
      '为完成注册、登录、下单、预约、活动报名和社区互动，我们可能收集你的手机号、昵称、收货信息、预约联系人、订单记录、社区发布内容以及必要的设备与日志信息。',
      '当你主动完善个人资料、参与活动或联系客服时，我们也会根据你提供的内容处理相关信息。',
    ],
  },
  {
    title: '信息使用方式',
    paragraphs: [
      '我们使用个人信息用于身份验证、订单履约、预约确认、活动通知、售后支持、社区管理、风险控制和服务体验优化。',
      '在不识别具体个人身份的前提下，我们可能对运营数据进行统计分析，用于了解商品偏好、空间使用情况和内容质量。',
    ],
  },
  {
    title: '信息共享与委托处理',
    paragraphs: [
      '除法律法规要求、获得你的明确同意或完成必要服务外，我们不会向无关第三方出售或非法共享你的个人信息。',
      '在配送、短信通知、支付模拟、云服务等必要场景中，我们可能委托可信服务商处理部分信息，并要求其按照安全和保密要求处理。',
    ],
  },
  {
    title: '信息保护',
    paragraphs: [
      '我们会通过权限控制、加密传输、访问审计和最小必要原则保护用户信息，避免未经授权的访问、披露、篡改或丢失。',
      '请你也妥善保管账户密码和验证码，不要在非官方页面输入账户信息。',
    ],
  },
  {
    title: '你的权利',
    paragraphs: [
      '你可以在账户中心查看和更新个人资料，也可以通过联系我们页面申请更正、删除或查询与个人信息相关的问题。',
      '如你对隐私处理方式有疑问或投诉，我们会在核验身份后尽快反馈处理结果。',
    ],
  },
]

const asideItems = [
  { label: '隐私负责人', value: 'Coffee Book 用户服务团队' },
  { label: '响应周期', value: '通常在 7 个工作日内回复' },
  { label: '联系邮箱', value: 'privacy@coffeebook.example' },
]
</script>

<template>
  <InfoPageShell
    eyebrow="Privacy Policy"
    title="隐私政策"
    description="我们尊重并保护你的个人信息。本政策说明 Coffee Book 如何收集、使用、保存和保护与你相关的信息。"
    :sections="sections"
    aside-title="隐私联系"
    :aside-items="asideItems"
  />
</template>
