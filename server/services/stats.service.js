import { pool } from '../db/mysql.js'
import {
  addBusinessDays,
  getBusinessDayRange,
  getBusinessDate,
  getBusinessTimestamp,
  getLastBusinessDates,
  getStartOfDay,
} from '../utils/date.js'

export function statsMeta(extra = {}) {
  return { timestamp: getBusinessTimestamp(), source: 'db', ...extra }
}

export function bookFavoriteCountSql(alias = 'books') {
  return `(SELECT COUNT(*) FROM user_favorites uf WHERE uf.target_type = 'book' AND uf.target_id = ${alias}.id)`
}

export function postLikeCountSql(alias = 'posts') {
  return `(SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = ${alias}.id)`
}

export function postCommentCountSql(alias = 'posts') {
  return `(SELECT COUNT(*) FROM comments c WHERE c.post_id = ${alias}.id AND c.status = 'published')`
}

function firstTotal(result) {
  return Number(result?.[0]?.[0]?.total || 0)
}

function fillDaily(days, rows, valueKey = 'total') {
  const values = new Map(rows.map((row) => [String(row.day), Number(row[valueKey] || 0)]))
  return days.map((date) => ({ date, value: values.get(date) || 0 }))
}

function businessDaySql(column = 'created_at') {
  return `DATE_FORMAT(${column}, "%Y-%m-%d")`
}

function lastDaysRange(count = 7) {
  const today = getBusinessDate()
  return {
    days: getLastBusinessDates(count, today),
    start: getStartOfDay(addBusinessDays(today, 1 - count)),
    end: getBusinessDayRange(today).end,
  }
}

export async function getDashboardStats() {
  const today = getBusinessDayRange()
  const [[users], [books], [products], [orders], [revenue], [pendingPosts]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM users'),
    pool.execute('SELECT COUNT(*) AS total FROM books'),
    pool.execute('SELECT COUNT(*) AS total FROM products'),
    pool.execute('SELECT COUNT(*) AS total FROM orders'),
    pool.execute(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders
      WHERE status IN ('paid','completed') AND paid_at >= ? AND paid_at < ?`, [today.start, today.end]),
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

export async function getDashboardSummary() {
  const today = getBusinessDayRange()
  const queries = [
    ['users', 'SELECT COUNT(*) AS total FROM users WHERE role = "user"', []],
    ['todayUsers', 'SELECT COUNT(*) AS total FROM users WHERE role = "user" AND created_at >= ? AND created_at < ?', [today.start, today.end]],
    ['products', 'SELECT COUNT(*) AS total FROM products', []],
    ['books', 'SELECT COUNT(*) AS total FROM books', []],
    ['events', 'SELECT COUNT(*) AS total FROM events', []],
    ['bookings', 'SELECT COUNT(*) AS total FROM bookings', []],
    ['todayBookings', 'SELECT COUNT(*) AS total FROM bookings WHERE created_at >= ? AND created_at < ?', [today.start, today.end]],
    ['posts', 'SELECT COUNT(*) AS total FROM posts', []],
    ['pendingPosts', 'SELECT COUNT(*) AS total FROM posts WHERE status = "pending"', []],
    ['orders', 'SELECT COUNT(*) AS total FROM orders', []],
    ['sales', 'SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE status IN ("paid", "completed")', []],
  ]
  const results = await Promise.all(queries.map(([, sql, params]) => pool.execute(sql, params)))
  return Object.fromEntries(queries.map(([key], index) => [key, firstTotal(results[index])]))
}

export async function getDashboardTrends() {
  const range = lastDaysRange(7)
  const [users, orders, bookings, posts, registrations, categories] = await Promise.all([
    pool.execute(`SELECT ${businessDaySql('created_at')} AS day, COUNT(*) AS total FROM users WHERE role = "user" AND created_at >= ? AND created_at < ? GROUP BY day`, [range.start, range.end]),
    pool.execute(`SELECT ${businessDaySql('created_at')} AS day, COUNT(*) AS total FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY day`, [range.start, range.end]),
    pool.execute(`SELECT ${businessDaySql('created_at')} AS day, COUNT(*) AS total FROM bookings WHERE created_at >= ? AND created_at < ? GROUP BY day`, [range.start, range.end]),
    pool.execute(`SELECT ${businessDaySql('created_at')} AS day, COUNT(*) AS total FROM posts WHERE created_at >= ? AND created_at < ? GROUP BY day`, [range.start, range.end]),
    pool.execute(`SELECT ${businessDaySql('created_at')} AS day, COUNT(*) AS total FROM event_registrations WHERE created_at >= ? AND created_at < ? GROUP BY day`, [range.start, range.end]),
    pool.execute('SELECT category AS label, COUNT(*) AS value FROM products GROUP BY category ORDER BY value DESC'),
  ])
  return {
    range: { start: range.days[0], end: range.days[range.days.length - 1] },
    users: fillDaily(range.days, users[0]),
    orders: fillDaily(range.days, orders[0]),
    bookings: fillDaily(range.days, bookings[0]),
    posts: fillDaily(range.days, posts[0]),
    eventRegistrations: fillDaily(range.days, registrations[0]),
    productCategories: categories[0].map((row) => ({ label: row.label, value: Number(row.value) })),
  }
}

export async function getFinanceDashboard() {
  const today = getBusinessDayRange()
  const range = lastDaysRange(7)
  const [summaryRows, trendRows, statusRows, productRows, orderRows] = await Promise.all([
    pool.execute(`SELECT
      COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN total_amount ELSE 0 END), 0) AS totalSales,
      COALESCE(SUM(CASE WHEN status IN ('paid','completed') AND COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < ? THEN total_amount ELSE 0 END), 0) AS todaySales,
      COALESCE(SUM(CASE WHEN status IN ('pending_payment','pending_review') THEN total_amount ELSE 0 END), 0) AS pendingAmount,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END), 0) AS refundedAmount FROM orders`, [today.start, today.end]),
    pool.execute(`SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m-%d') AS day, SUM(total_amount) AS total
      FROM orders WHERE status IN ('paid','completed') AND COALESCE(paid_at, created_at) >= ?
        AND COALESCE(paid_at, created_at) < ? GROUP BY day`, [range.start, range.end]),
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
    trends: fillDaily(range.days, trendRows[0]),
    statusDistribution: statusRows[0].map((row) => ({ label: row.label, value: Number(row.value) })),
    topProducts: productRows[0].map((row) => ({ ...row, quantity: Number(row.quantity), revenue: Number(row.revenue) })),
    orders: orderRows[0].map((row) => ({ ...row, amount: Number(row.amount) })),
  }
}

export async function getCommunityStats() {
  const today = getBusinessDate()
  const monthStart = getStartOfDay(`${today.slice(0, 8)}01`)
  const nextMonthStart = getStartOfDay(addBusinessDays(`${today.slice(0, 8)}01`, 32).slice(0, 8) + '01')
  const [[members], [monthlyShares], [publishedPosts], [comments]] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'user' AND status = 'active'"),
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'published' AND created_at >= ? AND created_at < ?", [monthStart, nextMonthStart]),
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'published'"),
    pool.execute("SELECT COUNT(*) AS total FROM comments WHERE status = 'published'"),
  ])
  return {
    members: Number(members[0].total || 0),
    monthlyShares: Number(monthlyShares[0].total || 0),
    posts: Number(publishedPosts[0].total || 0),
    comments: Number(comments[0].total || 0),
  }
}

export async function getUserPointStats(userId, connection = pool) {
  const [[user], [earned], [spent], [couponStats]] = await Promise.all([
    connection.execute('SELECT points AS total FROM users WHERE id = ? AND role = "user" LIMIT 1', [userId]),
    connection.execute("SELECT COALESCE(SUM(points), 0) AS total FROM user_points WHERE user_id = ? AND points > 0", [userId]),
    connection.execute("SELECT COALESCE(SUM(ABS(points)), 0) AS total FROM user_points WHERE user_id = ? AND points < 0", [userId]),
    connection.execute(`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired
      FROM user_coupons WHERE user_id = ?`, [userId]),
  ])
  return {
    balance: Number(user[0]?.total || 0),
    earned: Number(earned[0].total || 0),
    spent: Number(spent[0].total || 0),
    coupons: {
      total: Number(couponStats[0].total || 0),
      used: Number(couponStats[0].used || 0),
      available: Number(couponStats[0].available || 0),
      expired: Number(couponStats[0].expired || 0),
    },
  }
}

export async function getAccountOverviewStats(userId) {
  const [orders, bookings, posts, unread, addresses, registrations, favorites, pointStats] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM posts WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM user_notifications WHERE user_id = ? AND is_read = 0', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?', [userId]),
    pool.execute("SELECT COUNT(*) AS total FROM event_registrations WHERE user_id = ? AND status = 'registered'", [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM user_favorites WHERE user_id = ?', [userId]),
    getUserPointStats(userId),
  ])
  return {
    orders: firstTotal(orders),
    bookings: firstTotal(bookings),
    posts: firstTotal(posts),
    unreadNotifications: firstTotal(unread),
    addresses: firstTotal(addresses),
    eventRegistrations: firstTotal(registrations),
    favorites: firstTotal(favorites),
    points: pointStats.balance,
  }
}
