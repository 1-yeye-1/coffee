import { pool } from '../server/db/mysql.js'
import { env } from '../server/config/env.js'

const requiredColumns = {
  users: ['id', 'username', 'phone', 'points', 'level', 'profile_public'],
  admin_users: ['id', 'username', 'password_hash', 'status'],
  verification_codes: ['id', 'phone', 'scene', 'code_hash', 'used_at', 'expires_at', 'created_at'],
  books: ['id', 'slug', 'title', 'stock', 'status', 'cover_url'],
  products: ['id', 'slug', 'product_type', 'supports_brew_method', 'image_url', 'price', 'stock', 'sales', 'status'],
  events: ['id', 'slug', 'event_date', 'capacity', 'attendees', 'status', 'cover_url'],
  event_registrations: ['id', 'event_id', 'user_id', 'status', 'created_at', 'updated_at'],
  posts: ['id', 'slug', 'user_id', 'status', 'media_url', 'media_type', 'likes_count', 'comments_count'],
  comments: ['id', 'post_id', 'user_id', 'status', 'is_anonymous'],
  post_likes: ['id', 'post_id', 'user_id'],
  seats: ['id', 'code', 'area', 'capacity', 'x', 'y', 'width', 'height', 'status', 'sort_order'],
  bookings: ['id', 'booking_no', 'user_id', 'phone', 'seat_id', 'time_slot', 'people_count', 'status'],
  user_avatars: ['id', 'user_id', 'avatar_url', 'source', 'is_current', 'created_at'],
  user_favorites: ['id', 'user_id', 'target_type', 'target_id', 'created_at'],
  user_points: ['id', 'user_id', 'points', 'type', 'source', 'description', 'created_at'],
  user_notifications: ['id', 'user_id', 'type', 'is_read', 'related_id', 'related_type'],
  audit_logs: ['id', 'operator_id', 'operator_type', 'action', 'module', 'target_type', 'target_id'],
  orders: ['id', 'order_no', 'user_id', 'source', 'total_amount', 'status', 'paid_at'],
  order_items: ['id', 'order_id', 'product_id', 'brew_method', 'price', 'quantity', 'subtotal'],
  payments: ['id', 'payment_no', 'order_id', 'amount', 'status', 'paid_at', 'expires_at'],
}

const requiredIndexes = {
  users: ['uk_users_phone'],
  event_registrations: ['uk_event_registrations_event_user'],
  post_likes: ['uk_post_likes_post_user'],
  seats: ['uk_seats_code'],
  bookings: ['uk_bookings_booking_no', 'idx_bookings_seat_date_time'],
  user_favorites: ['uk_user_favorites_target'],
  user_avatars: ['uk_user_avatars_url'],
  orders: ['uk_orders_order_no'],
  payments: ['uk_payments_payment_no'],
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function checkStructure() {
  const [columnRows] = await pool.execute(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType, IS_NULLABLE AS isNullable
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
    [env.db.name],
  )
  const columns = new Map()
  for (const row of columnRows) {
    if (!columns.has(row.tableName)) columns.set(row.tableName, new Map())
    columns.get(row.tableName).set(row.columnName, row)
  }
  for (const [table, names] of Object.entries(requiredColumns)) {
    assert(columns.has(table), `Missing table: ${table}`)
    for (const name of names) assert(columns.get(table).has(name), `Missing column: ${table}.${name}`)
  }
  const verificationExpiry = columns.get('verification_codes').get('expires_at')
  const paymentExpiry = columns.get('payments').get('expires_at')
  assert(verificationExpiry.dataType === 'datetime' && verificationExpiry.isNullable === 'NO', 'verification_codes.expires_at must be DATETIME NOT NULL')
  assert(paymentExpiry.dataType === 'datetime' && paymentExpiry.isNullable === 'YES', 'payments.expires_at must be DATETIME NULL')

  const [indexRows] = await pool.execute(
    'SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?',
    [env.db.name],
  )
  const indexes = new Set(indexRows.map((row) => `${row.tableName}.${row.indexName}`))
  for (const [table, names] of Object.entries(requiredIndexes)) {
    for (const name of names) assert(indexes.has(`${table}.${name}`), `Missing index: ${table}.${name}`)
  }
}

async function checkSeed() {
  const [[counts]] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM admin_users) AS admins,
    (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
    (SELECT COUNT(*) FROM books) AS books,
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM events) AS events,
    (SELECT COUNT(*) FROM posts) AS posts,
    (SELECT COUNT(*) FROM comments) AS comments,
    (SELECT COUNT(*) FROM post_likes) AS likes,
    (SELECT COUNT(*) FROM seats) AS seats,
    (SELECT COUNT(*) FROM bookings) AS bookings,
    (SELECT COUNT(*) FROM event_registrations) AS registrations,
    (SELECT COUNT(*) FROM user_avatars) AS avatars,
    (SELECT COUNT(*) FROM user_favorites) AS favorites,
    (SELECT COUNT(*) FROM orders) AS orders,
    (SELECT COUNT(*) FROM order_items) AS orderItems,
    (SELECT COUNT(*) FROM user_points) AS points,
    (SELECT COUNT(*) FROM audit_logs) AS logs`)
  for (const [name, value] of Object.entries(counts)) assert(Number(value) > 0, `Seed data missing: ${name}`)
}

try {
  await checkStructure()
  await checkSeed()
  console.log(`Database consistency check passed: ${env.db.name}`)
} catch (error) {
  console.error(`Database consistency check failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
