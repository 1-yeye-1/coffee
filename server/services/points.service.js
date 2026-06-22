import { randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { isBirthdayOnDate, shanghaiDateString } from '../utils/date.js'
import { recordAudit } from './audit.service.js'
import { createNotification } from './notifications.service.js'

function mapCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    pointsCost: Number(row.pointsCost || 0),
    discountAmount: Number(row.discountAmount || 0),
    minSpend: Number(row.minSpend || 0),
    validDays: Number(row.validDays || 0),
    description: row.description,
  }
}

export async function issueBirthdayCoupon(userId, { date = shanghaiDateString() } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError('生日优惠券发放日期格式无效')
  const issueYear = Number(date.slice(0, 4))
  const todayMd = date.slice(5)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[user]] = await connection.execute(
      `SELECT id, username, nickname, birthday, DATE_FORMAT(birthday, '%Y-%m-%d') AS birthdayDate,
        DATE_FORMAT(birthday, '%m-%d') AS birthdayMd
       FROM users WHERE id = ? AND role = 'user' FOR UPDATE`,
      [userId],
    )
    if (!user?.birthday) {
      await connection.commit()
      return { status: 'unset', message: '设置生日后可在生日当天领取专享优惠券。' }
    }
    if (!isBirthdayOnDate(user.birthdayDate, date)) {
      await connection.commit()
      return { status: 'upcoming', message: user.birthdayMd < todayMd ? '今年生日已过，将在下一次生日当天自动发放。' : '生日当天登录或进入积分中心即可自动领取。' }
    }
    const [[coupon]] = await connection.execute("SELECT * FROM coupons WHERE coupon_type = 'birthday' AND status = 'active' LIMIT 1")
    if (!coupon) {
      await connection.commit()
      return { status: 'unavailable', message: '生日福利暂未开放。' }
    }
    const code = `BDAY-${issueYear}-${user.id}`
    const [result] = await connection.execute(
      `INSERT IGNORE INTO user_coupons
        (user_id, coupon_id, coupon_code, source, issue_year, points_cost, expires_at)
       VALUES (?, ?, ?, 'birthday', ?, 0, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`,
      [user.id, coupon.id, code, issueYear, coupon.valid_days],
    )
    if (result.affectedRows) {
      await recordAudit({ operatorId: user.id, operatorType: 'user', actor: user, action: 'coupon.issue', module: 'coupons', targetType: 'coupon', targetId: coupon.id, description: `发放 ${issueYear} 年生日优惠券`, payload: { couponId: coupon.id, source: 'birthday', issueYear }, connection })
      await createNotification({ userId: user.id, title: '生日福利已到账', content: `${coupon.name} 已放入你的优惠券账户。`, type: 'coupon', relatedId: coupon.id, relatedType: 'coupon' }, connection)
    }
    await connection.commit()
    return { status: 'claimed', issued: Boolean(result.affectedRows), message: '生日福利已领取，每年限领一次。' }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function getPointsCenter(userId) {
  const birthdayBenefit = await issueBirthdayCoupon(userId)
  const [userResult, recordsResult, couponsResult, redemptionsResult] = await Promise.all([
    pool.execute('SELECT points FROM users WHERE id = ? AND role = "user" LIMIT 1', [userId]),
    pool.execute(`SELECT id, points, type, source, description, created_at AS createdAt
      FROM user_points WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`, [userId]),
    pool.execute(`SELECT id, code, name, coupon_type AS type, points_cost AS pointsCost,
      discount_amount AS discountAmount, min_spend AS minSpend, valid_days AS validDays, description
      FROM coupons WHERE status = 'active' AND coupon_type <> 'birthday' ORDER BY points_cost ASC, id ASC`),
    pool.execute(`SELECT uc.id, uc.coupon_code AS couponCode, uc.source, uc.points_cost AS pointsCost,
      uc.status, uc.issued_at AS issuedAt, uc.expires_at AS expiresAt,
      c.name, c.coupon_type AS type, c.discount_amount AS discountAmount, c.min_spend AS minSpend
      FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
      WHERE uc.user_id = ? ORDER BY uc.issued_at DESC, uc.id DESC`, [userId]),
  ])
  const user = userResult[0][0]
  const records = recordsResult[0]
  const coupons = couponsResult[0]
  const redemptions = redemptionsResult[0]
  return {
    balance: Number(user?.points || 0),
    records,
    coupons: coupons.map(mapCoupon),
    redemptions: redemptions.map((row) => ({ ...row, pointsCost: Number(row.pointsCost), discountAmount: Number(row.discountAmount), minSpend: Number(row.minSpend) })),
    birthdayBenefit,
  }
}

export async function redeemCoupon(userId, couponId, requestKey) {
  const normalizedRequestKey = String(requestKey || '').trim()
  if (!/^[A-Za-z0-9-]{8,80}$/.test(normalizedRequestKey)) {
    throw Object.assign(new Error('兑换请求标识无效'), { statusCode: 400 })
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[user]] = await connection.execute('SELECT id, username, nickname, points FROM users WHERE id = ? AND role = "user" FOR UPDATE', [userId])
    const [[existing]] = await connection.execute(
      'SELECT id FROM user_coupons WHERE user_id = ? AND request_key = ? LIMIT 1',
      [userId, normalizedRequestKey],
    )
    if (existing) {
      await connection.commit()
      return getPointsCenter(userId)
    }
    const [[coupon]] = await connection.execute(`SELECT id, code, name, coupon_type AS type,
      points_cost AS pointsCost, valid_days AS validDays FROM coupons
      WHERE id = ? AND status = 'active' AND coupon_type <> 'birthday' FOR UPDATE`, [couponId])
    if (!user || !coupon) throw Object.assign(new Error('可兑换优惠券不存在'), { statusCode: 404 })
    const cost = Number(coupon.pointsCost)
    if (Number(user.points) < cost) throw Object.assign(new Error(`积分不足，还需要 ${cost - Number(user.points)} 积分`), { statusCode: 409 })
    const userCouponCode = `${coupon.code}-${user.id}-${randomUUID().slice(0, 8).toUpperCase()}`
    await connection.execute('UPDATE users SET points = points - ? WHERE id = ?', [cost, user.id])
    await connection.execute(`INSERT INTO user_points (user_id, points, type, source, description)
      VALUES (?, ?, 'spend', 'coupon_redeem', ?)`, [user.id, -cost, `兑换${coupon.name}`])
    const [result] = await connection.execute(`INSERT INTO user_coupons
      (user_id, coupon_id, coupon_code, request_key, source, points_cost, expires_at)
      VALUES (?, ?, ?, ?, 'points', ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))`,
    [user.id, coupon.id, userCouponCode, normalizedRequestKey, cost, coupon.validDays])
    await recordAudit({ operatorId: user.id, operatorType: 'user', actor: user, action: 'points.change', module: 'points', targetType: 'coupon', targetId: coupon.id, description: `兑换${coupon.name}扣除 ${cost} 积分`, payload: { points: -cost, balance: Number(user.points) - cost, source: 'coupon_redeem' }, connection })
    await recordAudit({ operatorId: user.id, operatorType: 'user', actor: user, action: 'coupon.redeem', module: 'coupons', targetType: 'user_coupon', targetId: result.insertId, description: `使用 ${cost} 积分兑换${coupon.name}`, payload: { couponId: coupon.id, pointsCost: cost }, connection })
    await connection.commit()
    return getPointsCenter(user.id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
