import { pool } from '../db/mysql.js'
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

export const listAdminBooks = listBooks
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
      u.points, u.level, u.created_at AS createdAt, u.updated_at AS updatedAt,
      COUNT(DISTINCT o.id) AS orders,
      COUNT(DISTINCT b.id) AS bookings,
      COUNT(DISTINCT p.id) AS posts
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     LEFT JOIN bookings b ON b.user_id = u.id
     LEFT JOIN posts p ON p.user_id = u.id
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

  params.push(id)
  const [result] = await pool.execute(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'user'`,
    params,
  )
  if (!result.affectedRows) return null

  await writeAudit(operatorId, 'user.admin.update', 'users', { id, changes: payload, operatorType: 'admin' })
  const [[row]] = await pool.execute(
    `SELECT u.id, u.username, u.nickname, u.email, u.phone, u.avatar, u.role, u.status,
      u.points, u.level, u.created_at AS createdAt, u.updated_at AS updatedAt,
      0 AS orders, 0 AS bookings, 0 AS posts
     FROM users u WHERE u.id = ? AND u.role = 'user' LIMIT 1`,
    [id],
  )
  return row ? mapUser(row) : null
}

export async function writeAudit(operatorId, action, module, payload = null, connection = pool) {
  const adminActionPrefixes = ['book.', 'product.', 'event.', 'post.status', 'booking.status', 'order.status', 'order.payment', 'user.admin.']
  const operatorType = payload?.operatorType || (adminActionPrefixes.some((prefix) => action.startsWith(prefix)) ? 'admin' : 'user')
  const safePayload = payload?.operatorType ? { ...payload } : payload
  if (safePayload?.operatorType) delete safePayload.operatorType
  await connection.execute(
    'INSERT INTO audit_logs (operator_id, operator_type, action, module, payload) VALUES (?, ?, ?, ?, ?)',
    [operatorId || null, operatorType, action, module, safePayload ? JSON.stringify(safePayload) : null],
  )
}
