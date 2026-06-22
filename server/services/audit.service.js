import { AsyncLocalStorage } from 'node:async_hooks'

import { pool } from '../db/mysql.js'

const auditContext = new AsyncLocalStorage()
const sensitiveKey = /password|passwd|token|authorization|captcha|verification|code_hash|identity|id_card/i

function clientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return req?.ip || req?.socket?.remoteAddress || ''
}

function sanitize(value, depth = 0) {
  if (value == null || depth > 4) return value
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, depth + 1))
  if (typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 500) : value
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !sensitiveKey.test(key))
    .map(([key, item]) => [key, sanitize(item, depth + 1)]))
}

function inferTarget(payload = {}) {
  const entry = ['id', 'userId', 'orderId', 'bookingId', 'eventId', 'postId', 'commentId', 'seatId']
    .find((key) => payload[key] != null)
  return entry ? payload[entry] : null
}

const descriptions = {
  'user.profile.update': '修改个人资料',
  'user.avatar.select': '选择用户头像',
  'user.avatar.upload': '上传用户头像',
  'order.create': '创建订单',
  'order.cancel': '取消订单',
  'order.pay.submit': '提交订单支付',
  'booking.create': '预约座位',
  'booking.cancel': '取消座位预约',
  'event.register': '报名活动',
  'event.unregister': '取消活动报名',
  'post.create': '发布社区帖子',
  'post.like': '点赞社区帖子',
  'post.unlike': '取消点赞社区帖子',
  'comment.create': '发布社区评论',
  'comment.delete': '删除社区评论',
  'points.change': '积分变更',
  'coupon.issue': '发放优惠券',
  'coupon.redeem': '积分兑换优惠券',
  'seat.update': '更新座位信息或位置',
}

export function auditContextMiddleware(req, _res, next) {
  auditContext.run({ req }, next)
}

export async function recordAudit({
  operatorId = null,
  operatorType = 'user',
  actor = null,
  action,
  module,
  targetType = null,
  targetId = null,
  description = '',
  payload = null,
  req = null,
  connection = pool,
}) {
  const contextReq = req || auditContext.getStore()?.req
  const contextActor = actor || contextReq?.user || contextReq?.admin
  const role = operatorType === 'admin' ? 'admin' : contextActor?.role || 'user'
  const userName = contextActor?.nickname || contextActor?.username || ''
  const safePayload = sanitize(payload)
  const resolvedTargetId = targetId ?? inferTarget(safePayload || {})
  await connection.execute(
    `INSERT INTO audit_logs
      (operator_id, operator_type, admin_name, user_name, role, action, module,
       target_type, target_id, description, ip, user_agent, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      operatorId || contextActor?.id || null,
      operatorType,
      operatorType === 'admin' ? userName : null,
      userName,
      role,
      action,
      module,
      targetType || module.replace(/s$/, ''),
      resolvedTargetId == null ? null : String(resolvedTargetId),
      String(description || descriptions[action] || action).slice(0, 500),
      clientIp(contextReq),
      String(contextReq?.headers?.['user-agent'] || '').slice(0, 500),
      safePayload ? JSON.stringify(safePayload) : null,
    ],
  )
}
