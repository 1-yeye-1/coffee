import { pool } from '../server/db/mysql.js'
import { env } from '../server/config/env.js'

const requiredColumns = {
  users: ['id', 'username', 'phone', 'points', 'level', 'profile_public', 'gender', 'birthday', 'bio', 'last_login_at', 'disabled_reason', 'booking_limit_until', 'post_limit_until'],
  admin_users: ['id', 'username', 'password_hash', 'status'],
  verification_codes: ['id', 'phone', 'scene', 'code_hash', 'used_at', 'expires_at', 'created_at'],
  books: ['id', 'slug', 'title', 'stock', 'status', 'cover_url', 'seat_id', 'location_label', 'is_recommended', 'is_featured', 'is_new', 'shelf_area', 'shelf_code', 'borrow_count', 'favorite_count', 'damaged_count', 'lost_count', 'low_stock_threshold'],
  products: ['id', 'slug', 'product_type', 'supports_brew_method', 'image_url', 'price', 'stock', 'sales', 'status', 'is_featured', 'is_new', 'is_hot', 'low_stock_threshold', 'view_count', 'favorite_count'],
  product_stock_logs: ['id', 'product_id', 'change_type', 'change_amount', 'before_stock', 'after_stock', 'reason', 'operator_id', 'created_at'],
  book_stock_logs: ['id', 'book_id', 'change_type', 'change_amount', 'before_stock', 'after_stock', 'reason', 'operator_id', 'created_at'],
  events: ['id', 'slug', 'event_date', 'capacity', 'attendees', 'status', 'cover_url'],
  event_registrations: ['id', 'event_id', 'user_id', 'status', 'registered_at', 'cancelled_at', 'attended_at', 'absent_at', 'created_at', 'updated_at'],
  posts: ['id', 'slug', 'user_id', 'status', 'media_url', 'media_type', 'likes_count', 'comments_count'],
  comments: ['id', 'post_id', 'user_id', 'status', 'is_anonymous'],
  post_likes: ['id', 'post_id', 'user_id'],
  content_reports: ['id', 'post_id', 'comment_id', 'reporter_id', 'reason', 'status', 'target_previous_status', 'resolution', 'handled_by', 'handled_at'],
  seats: ['id', 'code', 'area', 'capacity', 'x', 'y', 'width', 'height', 'status', 'sort_order', 'maintenance_reason', 'maintenance_until', 'usage_count'],
  bookings: ['id', 'booking_no', 'user_id', 'phone', 'seat_id', 'time_slot', 'people_count', 'cancel_reason', 'cancelled_at', 'completed_at', 'no_show_at', 'status_updated_by', 'status'],
  user_avatars: ['id', 'user_id', 'avatar_url', 'source', 'is_current', 'created_at'],
  upload_files: ['id', 'user_id', 'scene', 'file_type', 'original_name', 'stored_name', 'mime_type', 'size', 'url', 'storage_path'],
  user_favorites: ['id', 'user_id', 'target_type', 'target_id', 'created_at'],
  user_points: ['id', 'user_id', 'points', 'type', 'source', 'description', 'created_at'],
  coupons: ['id', 'code', 'coupon_type', 'points_cost', 'discount_amount', 'min_spend', 'valid_days', 'status'],
  user_coupons: ['id', 'user_id', 'coupon_id', 'coupon_code', 'request_key', 'source', 'issue_year', 'points_cost', 'status', 'expires_at'],
  user_notifications: ['id', 'user_id', 'type', 'is_read', 'related_id', 'related_type'],
  product_reviews: ['id', 'product_id', 'user_id', 'order_id', 'parent_id', 'rating', 'content', 'status'],
  book_reviews: ['id', 'book_id', 'user_id', 'reservation_id', 'parent_id', 'rating', 'content', 'status'],
  comment_likes: ['id', 'target_type', 'comment_id', 'user_id', 'created_at'],
  book_reservations: ['id', 'reservation_no', 'user_id', 'book_id', 'seat_id', 'location_label', 'status'],
  audit_logs: ['id', 'operator_id', 'operator_type', 'action', 'module', 'target_type', 'target_id'],
  user_risk_logs: ['id', 'user_id', 'risk_type', 'reason', 'operator_id', 'start_at', 'end_at', 'created_at'],
  user_penalties: ['id', 'user_id', 'penalty_type', 'reason', 'operator_id', 'start_at', 'end_at', 'created_at'],
  seat_maintenance_logs: ['id', 'seat_id', 'reason', 'start_at', 'end_at', 'operator_id', 'created_at'],
  orders: ['id', 'order_no', 'user_id', 'source', 'total_amount', 'status', 'paid_at', 'cancel_reason', 'refund_reason', 'refund_amount', 'refund_note', 'refunded_at', 'refund_operator_id'],
  order_items: ['id', 'order_id', 'product_id', 'brew_method', 'price', 'quantity', 'subtotal'],
  payments: ['id', 'payment_no', 'order_id', 'amount', 'status', 'paid_at', 'expires_at'],
  image_captchas: ['id', 'captcha_id', 'code_hash', 'attempts', 'expires_at', 'used_at'],
}

const requiredIndexes = {
  users: ['uk_users_phone'],
  products: ['idx_products_stock', 'idx_products_flags'],
  books: ['idx_books_stock', 'idx_books_flags'],
  product_stock_logs: ['idx_product_stock_logs_product'],
  book_stock_logs: ['idx_book_stock_logs_book'],
  event_registrations: ['uk_event_registrations_event_user'],
  post_likes: ['uk_post_likes_post_user'],
  posts: ['idx_posts_status'],
  comments: ['idx_comments_status'],
  content_reports: ['idx_content_reports_post', 'idx_content_reports_comment', 'idx_content_reports_status', 'idx_content_reports_reporter', 'idx_content_reports_target_status'],
  seats: ['uk_seats_code', 'idx_seats_usage'],
  user_risk_logs: ['idx_user_risk_logs_user'],
  user_penalties: ['idx_user_penalties_user'],
  seat_maintenance_logs: ['idx_seat_maintenance_logs_seat'],
  bookings: ['uk_bookings_booking_no', 'idx_bookings_seat_date_time', 'idx_bookings_date_status'],
  user_favorites: ['uk_user_favorites_target'],
  user_avatars: ['uk_user_avatars_url'],
  coupons: ['uk_coupons_code'],
  user_coupons: ['uk_user_coupons_code', 'uk_user_coupons_annual', 'uk_user_coupons_request'],
  orders: ['uk_orders_order_no'],
  payments: ['uk_payments_payment_no'],
  product_reviews: ['idx_product_reviews_parent'],
  book_reviews: ['idx_book_reviews_parent'],
  comment_likes: ['uk_comment_likes_target_user', 'idx_comment_likes_target'],
  book_reservations: ['uk_book_reservations_no'],
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
  const uploadFileUserId = columns.get('upload_files').get('user_id')
  assert(verificationExpiry.dataType === 'datetime' && verificationExpiry.isNullable === 'NO', 'verification_codes.expires_at must be DATETIME NOT NULL')
  assert(paymentExpiry.dataType === 'datetime' && paymentExpiry.isNullable === 'YES', 'payments.expires_at must be DATETIME NULL')
  assert(uploadFileUserId.isNullable === 'YES', 'upload_files.user_id must be nullable for admin/system uploads')

  const [[statusDefaults]] = await pool.query(`SELECT
    (SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'status') AS postDefault,
    (SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'status') AS commentDefault,
    (SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'content_reports' AND COLUMN_NAME = 'status') AS reportDefault`,
  [env.db.name, env.db.name, env.db.name])
  assert(statusDefaults.postDefault === 'pending', 'posts.status default must be pending for new posts')
  assert(statusDefaults.commentDefault === 'published', 'comments.status default must be published')
  assert(statusDefaults.reportDefault === 'pending', 'content_reports.status default must be pending')

  const [[invalidStatuses]] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM posts WHERE status NOT IN ('pending','published','rejected','reported','hidden') OR status IS NULL) AS posts,
    (SELECT COUNT(*) FROM comments WHERE status NOT IN ('published','pending','hidden','deleted') OR status IS NULL) AS comments,
    (SELECT COUNT(*) FROM content_reports WHERE status NOT IN ('pending','resolved','dismissed') OR status IS NULL) AS reports`)
  assert(Number(invalidStatuses.posts) === 0, 'posts contain unsupported statuses')
  assert(Number(invalidStatuses.comments) === 0, 'comments contain unsupported statuses')
  assert(Number(invalidStatuses.reports) === 0, 'content_reports contain unsupported statuses')

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
