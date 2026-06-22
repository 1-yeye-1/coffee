import { pool } from '../db/mysql.js'
import { recordAudit } from './audit.service.js'
import { parsePagination } from '../utils/pagination.js'
import { listBooks } from './books.service.js'
import { listProducts } from './products.service.js'

export async function getDashboardStats() {
  const [[users], [books], [products], [orders], [revenue], [pendingPosts]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM users'),
    pool.execute('SELECT COUNT(*) AS total FROM books'),
    pool.execute('SELECT COUNT(*) AS total FROM products'),
    pool.execute('SELECT COUNT(*) AS total FROM orders'),
    pool.execute(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders
      WHERE status IN ('paid','completed') AND DATE(paid_at) = CURRENT_DATE`),
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'"),
  ])

  return {
    users: Number(users[0].total),
    books: Number(books[0].total),
    products: Number(products[0].total),
    orders: Number(orders[0].total),
    todayRevenue: Number(revenue[0].total),
    pendingPosts: Number(pendingPosts[0].total),
  }
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })
}

function fillDaily(rows, valueKey = 'total') {
  const values = new Map(rows.map((row) => [String(row.day), Number(row[valueKey] || 0)]))
  return lastSevenDays().map((date) => ({ date, value: values.get(date) || 0 }))
}

export async function getDashboardSummary() {
  const queries = [
    ['users', 'SELECT COUNT(*) AS total FROM users WHERE role = "user"'],
    ['todayUsers', 'SELECT COUNT(*) AS total FROM users WHERE role = "user" AND DATE(created_at) = CURRENT_DATE'],
    ['products', 'SELECT COUNT(*) AS total FROM products'],
    ['books', 'SELECT COUNT(*) AS total FROM books'],
    ['events', 'SELECT COUNT(*) AS total FROM events'],
    ['bookings', 'SELECT COUNT(*) AS total FROM bookings'],
    ['todayBookings', 'SELECT COUNT(*) AS total FROM bookings WHERE DATE(created_at) = CURRENT_DATE'],
    ['posts', 'SELECT COUNT(*) AS total FROM posts'],
    ['pendingPosts', 'SELECT COUNT(*) AS total FROM posts WHERE status = "pending"'],
    ['orders', 'SELECT COUNT(*) AS total FROM orders'],
    ['sales', 'SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE status IN ("paid", "completed")'],
  ]
  const results = await Promise.all(queries.map(([, sql]) => pool.execute(sql)))
  return Object.fromEntries(queries.map(([key], index) => [key, Number(results[index][0][0].total || 0)]))
}

export async function getDashboardTrends() {
  const [users, orders, bookings, posts, registrations, categories] = await Promise.all([
    pool.execute('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") AS day, COUNT(*) AS total FROM users WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day'),
    pool.execute('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") AS day, COUNT(*) AS total FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day'),
    pool.execute('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") AS day, COUNT(*) AS total FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day'),
    pool.execute('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") AS day, COUNT(*) AS total FROM posts WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day'),
    pool.execute('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") AS day, COUNT(*) AS total FROM event_registrations WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day'),
    pool.execute('SELECT category AS label, COUNT(*) AS value FROM products GROUP BY category ORDER BY value DESC'),
  ])
  return {
    users: fillDaily(users[0]),
    orders: fillDaily(orders[0]),
    bookings: fillDaily(bookings[0]),
    posts: fillDaily(posts[0]),
    eventRegistrations: fillDaily(registrations[0]),
    productCategories: categories[0].map((row) => ({ label: row.label, value: Number(row.value) })),
  }
}

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

export async function getFinanceDashboard() {
  const [summaryRows, trendRows, statusRows, productRows, orderRows] = await Promise.all([
    pool.execute(`SELECT
      COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN total_amount ELSE 0 END), 0) AS totalSales,
      COALESCE(SUM(CASE WHEN status IN ('paid','completed') AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS todaySales,
      COALESCE(SUM(CASE WHEN status IN ('pending_payment','pending_review') THEN total_amount ELSE 0 END), 0) AS pendingAmount,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END), 0) AS refundedAmount FROM orders`),
    pool.execute(`SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m-%d') AS day, SUM(total_amount) AS total
      FROM orders WHERE status IN ('paid','completed') AND COALESCE(paid_at, created_at) >= CURRENT_DATE - INTERVAL 6 DAY GROUP BY day`),
    pool.execute('SELECT status AS label, COUNT(*) AS value FROM orders GROUP BY status ORDER BY value DESC'),
    pool.execute(`SELECT oi.product_name AS name, SUM(oi.quantity) AS quantity, SUM(oi.subtotal) AS revenue
      FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status IN ('paid','completed')
      GROUP BY oi.product_name ORDER BY quantity DESC, revenue DESC LIMIT 10`),
    pool.execute(`SELECT o.id, o.order_no AS orderNo, o.total_amount AS amount, o.payment_method AS method,
      o.status, o.created_at AS createdAt, COALESCE(u.nickname, u.username) AS userName
      FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 20`),
  ])
  const summary = summaryRows[0][0]
  return {
    summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Number(value || 0)])),
    trends: fillDaily(trendRows[0]),
    statusDistribution: statusRows[0].map((row) => ({ label: row.label, value: Number(row.value) })),
    topProducts: productRows[0].map((row) => ({ ...row, quantity: Number(row.quantity), revenue: Number(row.revenue) })),
    orders: orderRows[0].map((row) => ({ ...row, amount: Number(row.amount) })),
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
      u.points, u.level, DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday, u.created_at AS createdAt, u.updated_at AS updatedAt,
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
      u.points, u.level, DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday, u.created_at AS createdAt, u.updated_at AS updatedAt,
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
