import { pool } from '../db/mysql.js'
import { recordAudit } from './audit.service.js'
import { parsePagination } from '../utils/pagination.js'
import { listBooks } from './books.service.js'
import { listProducts } from './products.service.js'
export {
  getDashboardStats,
  getDashboardSummary,
  getDashboardTrends,
  getFinanceDashboard,
} from './stats.service.js'

export async function getDashboardRecent() {
  const [orders, bookings, posts, registrations, logs] = await Promise.all([
    pool.execute(`SELECT o.id, o.order_no AS orderNo, o.total_amount AS amount, o.status, o.created_at AS createdAt,
      COALESCE(u.nickname, u.username) AS userName FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 5`),
    pool.execute(`SELECT b.id, b.booking_no AS bookingNo, b.booking_date AS bookingDate, b.time_slot AS timeSlot,
      b.status, b.created_at AS createdAt, COALESCE(u.nickname, u.username) AS userName
      FROM bookings b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC LIMIT 5`),
    pool.execute('SELECT id, slug, title, author, status, created_at AS createdAt FROM posts ORDER BY created_at DESC LIMIT 5'),
    pool.execute(`SELECT r.id, r.status, r.created_at AS createdAt, e.title AS eventTitle,
      COALESCE(u.nickname, u.username) AS userName FROM event_registrations r
      JOIN events e ON e.id = r.event_id JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT 5`),
    pool.execute('SELECT id, action, module, description, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 5'),
  ])
  return {
    orders: orders[0].map((row) => ({ ...row, amount: Number(row.amount) })),
    bookings: bookings[0], posts: posts[0], eventRegistrations: registrations[0], logs: logs[0],
  }
}

export const listAdminBooks = (query = {}) => listBooks({ ...query, admin: true })
export const listAdminProducts = listProducts

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    points: Number(row.points || 0),
    birthday: row.birthday,
    couponCount: Number(row.couponCount || 0),
    level: row.level,
    growthValue: Number(row.growthValue || 0),
    lastCheckinDate: row.lastCheckinDate,
    lastLoginAt: row.lastLoginAt,
    disabledReason: row.disabledReason,
    bookingLimitUntil: row.bookingLimitUntil,
    postLimitUntil: row.postLimitUntil,
    bio: row.bio,
    gender: row.gender,
    orders: Number(row.orders || 0),
    bookings: Number(row.bookings || 0),
    posts: Number(row.posts || 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listAdminUsers(query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 20)
  const safeLimit = Number(pageSize)
  const safeOffset = Number(offset)
  const keyword = String(query.keyword || '').trim()
  const status = String(query.status || '').trim()
  const level = String(query.level || '').trim()
  const where = ['u.role = ?']
  const params = ['user']

  if (keyword) {
    where.push('(u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)')
    const like = `%${keyword}%`
    params.push(like, like, like, like)
  }
  if (status && status !== 'all') {
    where.push('u.status = ?')
    params.push(status)
  }
  if (level && level !== 'all') {
    where.push('u.level = ?')
    params.push(level)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
    params,
  )
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.nickname, u.email, u.phone, u.avatar, u.role, u.status,
      u.points, u.level, u.growth_value AS growthValue, DATE_FORMAT(u.last_checkin_date, '%Y-%m-%d') AS lastCheckinDate,
      u.last_login_at AS lastLoginAt, u.disabled_reason AS disabledReason, u.booking_limit_until AS bookingLimitUntil,
      u.post_limit_until AS postLimitUntil, u.bio, u.gender,
      DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday, u.created_at AS createdAt, u.updated_at AS updatedAt,
      COUNT(DISTINCT o.id) AS orders,
      COUNT(DISTINCT b.id) AS bookings,
      COUNT(DISTINCT p.id) AS posts,
      COUNT(DISTINCT uc.id) AS couponCount
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     LEFT JOIN bookings b ON b.user_id = u.id
     LEFT JOIN posts p ON p.user_id = u.id
     LEFT JOIN user_coupons uc ON uc.user_id = u.id
     ${whereSql}
     GROUP BY u.id
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params,
  )

  return {
    items: rows.map(mapUser),
    meta: { page, pageSize, total: Number(total) },
  }
}

export async function updateAdminUser(id, payload, operatorId) {
  if (payload.points !== undefined && (!Number.isInteger(Number(payload.points)) || Number(payload.points) < 0)) {
    throw Object.assign(new Error('积分必须是非负整数'), { statusCode: 400 })
  }
  const fields = []
  const params = []
  const allowed = {
    nickname: 'nickname',
    email: 'email',
    phone: 'phone',
    level: 'level',
    points: 'points',
    status: 'status',
    disabledReason: 'disabled_reason',
    bookingLimitUntil: 'booking_limit_until',
    postLimitUntil: 'post_limit_until',
  }

  Object.entries(allowed).forEach(([key, column]) => {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`)
      params.push(key === 'points' ? Number(payload[key]) || 0 : String(payload[key] || '').trim() || null)
    }
  })

  if (!fields.length) throw Object.assign(new Error('没有可更新的用户字段'), { statusCode: 400 })
  if (payload.status !== undefined && !['active', 'disabled'].includes(payload.status)) {
    throw Object.assign(new Error('用户状态无效'), { statusCode: 400 })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[before]] = await connection.execute('SELECT id, points FROM users WHERE id = ? AND role = "user" FOR UPDATE', [id])
    if (!before) { await connection.rollback(); return null }
    params.push(id)
    await connection.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'user'`, params)
    const nextPoints = payload.points === undefined ? Number(before.points) : Number(payload.points) || 0
    const delta = nextPoints - Number(before.points)
    if (delta) {
      await connection.execute(`INSERT INTO user_points (user_id, points, type, source, description)
        VALUES (?, ?, 'adjust', 'admin_adjust', '后台调整积分')`, [id, delta])
      await writeAudit(operatorId, 'points.change', 'points', { id, userId: id, points: delta, balance: nextPoints, source: 'admin_adjust', operatorType: 'admin' }, connection)
    }
    await writeAudit(operatorId, 'user.admin.update', 'users', { id, fields: Object.keys(payload), operatorType: 'admin' }, connection)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  const [[row]] = await pool.execute(
    `SELECT u.id, u.username, u.nickname, u.email, u.phone, u.avatar, u.role, u.status,
      u.points, u.level, u.growth_value AS growthValue, DATE_FORMAT(u.last_checkin_date, '%Y-%m-%d') AS lastCheckinDate,
      u.last_login_at AS lastLoginAt, u.disabled_reason AS disabledReason, u.booking_limit_until AS bookingLimitUntil,
      u.post_limit_until AS postLimitUntil, u.bio, u.gender,
      DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday, u.created_at AS createdAt, u.updated_at AS updatedAt,
      0 AS orders, 0 AS bookings, 0 AS posts,
      (SELECT COUNT(*) FROM user_coupons uc WHERE uc.user_id = u.id) AS couponCount
     FROM users u WHERE u.id = ? AND u.role = 'user' LIMIT 1`,
    [id],
  )
  return row ? mapUser(row) : null
}

export async function writeAudit(operatorId, action, module, payload = null, connection = pool) {
  const userActionPrefixes = ['user.', 'order.create', 'order.pay', 'order.cancel', 'order.completed', 'booking.create', 'booking.cancel', 'event.register', 'event.unregister', 'post.create', 'post.like', 'post.unlike', 'comment.create', 'comment.delete', 'content.report.create', 'points.', 'coupon.']
  const operatorType = payload?.operatorType || (userActionPrefixes.some((prefix) => action.startsWith(prefix)) ? 'user' : 'admin')
  const safePayload = payload?.operatorType ? { ...payload } : payload
  if (safePayload?.operatorType) delete safePayload.operatorType
  await recordAudit({ operatorId, operatorType, action, module, payload: safePayload, connection })
}


export async function getAdminUserDetail(id) {
  const [[row]] = await pool.execute(
    `SELECT u.id, u.username, u.nickname, u.email, u.phone, u.avatar, u.role, u.status,
      u.points, u.level, u.growth_value AS growthValue, DATE_FORMAT(u.last_checkin_date, '%Y-%m-%d') AS lastCheckinDate,
      u.last_login_at AS lastLoginAt, u.disabled_reason AS disabledReason, u.booking_limit_until AS bookingLimitUntil,
      u.post_limit_until AS postLimitUntil, u.bio, u.gender, DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday,
      u.created_at AS createdAt, u.updated_at AS updatedAt,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(CASE WHEN o.status IN ('paid','completed') THEN o.total_amount ELSE 0 END), 0) AS spending,
      COUNT(DISTINCT b.id) AS bookings,
      SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) AS noShows,
      COUNT(DISTINCT er.id) AS eventRegistrations,
      SUM(CASE WHEN er.status IN ('attended','checked_in') THEN 1 ELSE 0 END) AS eventAttended,
      COUNT(DISTINCT p.id) AS posts,
      COUNT(DISTINCT c.id) AS comments,
      COUNT(DISTINCT pl.id) AS likes,
      COUNT(DISTINCT uf.id) AS favorites
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     LEFT JOIN bookings b ON b.user_id = u.id
     LEFT JOIN event_registrations er ON er.user_id = u.id
     LEFT JOIN posts p ON p.user_id = u.id
     LEFT JOIN comments c ON c.user_id = u.id
     LEFT JOIN post_likes pl ON pl.user_id = u.id
     LEFT JOIN user_favorites uf ON uf.user_id = u.id
     WHERE u.id = ? AND u.role = 'user'
     GROUP BY u.id LIMIT 1`,
    [id],
  )
  if (!row) return null
  const [points] = await pool.execute('SELECT id, points, type, source, description, created_at AS createdAt FROM user_points WHERE user_id = ? ORDER BY id DESC LIMIT 30', [id])
  const [risks] = await pool.execute('SELECT id, risk_type AS riskType, reason, operator_id AS operatorId, start_at AS startAt, end_at AS endAt, created_at AS createdAt FROM user_risk_logs WHERE user_id = ? ORDER BY id DESC LIMIT 30', [id])
  return { ...mapUser(row), behavior: { spending: Number(row.spending || 0), noShows: Number(row.noShows || 0), eventRegistrations: Number(row.eventRegistrations || 0), eventAttended: Number(row.eventAttended || 0), comments: Number(row.comments || 0), likes: Number(row.likes || 0), favorites: Number(row.favorites || 0) }, pointLogs: points, riskLogs: risks }
}

export async function applyUserRisk(id, payload = {}, operatorId = null) {
  const riskType = String(payload.riskType || payload.type || '').trim()
  const reason = String(payload.reason || '').trim()
  const endAt = payload.endAt || payload.until || null
  if (!['disable', 'enable', 'booking_limit', 'booking_unlimit', 'post_limit', 'post_unlimit'].includes(riskType)) {
    throw Object.assign(new Error('????????'), { statusCode: 400 })
  }
  if (!reason && !riskType.endsWith('unlimit') && riskType !== 'enable') throw Object.assign(new Error('??????????'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[user]] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = "user" FOR UPDATE', [id])
    if (!user) { await connection.rollback(); return null }
    if (riskType === 'disable') await connection.execute("UPDATE users SET status = 'disabled', disabled_reason = ? WHERE id = ?", [reason, id])
    if (riskType === 'enable') await connection.execute("UPDATE users SET status = 'active', disabled_reason = NULL WHERE id = ?", [id])
    if (riskType === 'booking_limit') await connection.execute('UPDATE users SET booking_limit_until = ? WHERE id = ?', [endAt, id])
    if (riskType === 'booking_unlimit') await connection.execute('UPDATE users SET booking_limit_until = NULL WHERE id = ?', [id])
    if (riskType === 'post_limit') await connection.execute('UPDATE users SET post_limit_until = ? WHERE id = ?', [endAt, id])
    if (riskType === 'post_unlimit') await connection.execute('UPDATE users SET post_limit_until = NULL WHERE id = ?', [id])
    await connection.execute('INSERT INTO user_risk_logs (user_id, risk_type, reason, operator_id, start_at, end_at) VALUES (?, ?, ?, ?, NOW(), ?)', [id, riskType, reason || null, operatorId, endAt])
    await writeAudit(operatorId, 'user.risk.update', 'users', { id, riskType, reason, endAt, operatorType: 'admin' }, connection)
    await connection.commit()
    return getAdminUserDetail(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
