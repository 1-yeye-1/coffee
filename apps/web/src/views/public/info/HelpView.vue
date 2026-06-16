<script setup>
import InfoPageShell from './InfoPageShell.vue'

const sections = [
  {
    title: '账户与登录',
    paragraphs: [
      '你可以使用手机号注册并登录 Coffee Book。若忘记密码，可使用短信验证码登录后前往账户安全页面更新密码。',
      '如果验证码长时间未收到，请检查手机号是否填写正确，并确认短信未被拦截。开发环境下页面可能直接显示测试验证码。',
    ],
  },
  {
    title: '订单与配送',
    paragraphs: [
      '在购物车选择商品后进入结算页，确认配送方式、收货信息、支付方式和订单备注即可提交订单。',
      '目前项目内支付为模拟流程，不会发起真实扣款。订单状态可在会员中心的订单页面查看。',
    ],
  },
  {
    title: '空间预约',
    paragraphs: [
      '预约页面可选择日期、时间段和座位，并填写联系人与手机号。预约成功后，可在会员中心查看预约记录。',
      '如行程变化，请尽早取消或调整预约，以便其他用户使用座位资源。',
    ],
  },
  {
    title: '社区发布',
    paragraphs: [
      '社区鼓励分享阅读笔记、咖啡体验、城市空间和生活灵感。发布后内容可能进入审核流程，审核通过后展示给其他用户。',
      '请避免发布广告、攻击性语言、侵权内容或与 Coffee Book 社区氛围无关的信息。',
    ],
  },
  {
    title: '仍需帮助',
    paragraphs: [
      '如果常见问题没有解决你的疑问，请前往联系我们页面，将问题描述、账号信息和相关截图说明发送给我们。',
    ],
  },
]

const asideItems = [
  { label: '最快方式', value: '通过联系我们页面发送问题说明' },
  { label: '建议附带', value: '手机号后四位、订单号或预约编号' },
  { label: '常规回复', value: '1 至 3 个工作日' },
]
</script>

<template>
  <InfoPageShell
    eyebrow="Help Center"
    title="帮助中心"
    description="这里整理了 Coffee Book 用户最常遇到的问题，帮助你快速完成登录、下单、预约和社区发布。"
    :sections="sections"
    aside-title="求助提示"
    :aside-items="asideItems"
  />
</template>
