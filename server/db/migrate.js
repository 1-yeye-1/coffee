import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

import { env } from '../config/env.js'

const schemaPath = fileURLToPath(new URL('../sql/schema.sql', import.meta.url))
const databaseName = env.db.name
const databaseSql = `\`${databaseName}\``

async function migrate() {
  const sql = await readFile(schemaPath, 'utf8')
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    charset: 'utf8mb4',
    multipleStatements: true,
  })

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${databaseSql}
      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`USE ${databaseSql}`)
    await connection.query(sql)
    await ensureColumn(connection, databaseName, 'orders', 'source', "VARCHAR(30) NOT NULL DEFAULT 'cart' AFTER user_id")
    await ensureColumn(connection, databaseName, 'products', 'product_type', "VARCHAR(40) NOT NULL DEFAULT 'coffee' AFTER category")
    await ensureColumn(connection, databaseName, 'products', 'image_url', 'VARCHAR(500) NULL AFTER supports_brew_method')
    await ensureColumn(connection, databaseName, 'books', 'cover_url', 'VARCHAR(500) NULL AFTER cover_tone')
    await ensureColumn(connection, databaseName, 'events', 'cover_url', 'VARCHAR(500) NULL AFTER tone')
    await ensureColumn(connection, databaseName, 'products', 'supports_brew_method', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER product_type')
    await ensureColumn(connection, databaseName, 'cart_items', 'brew_method', "VARCHAR(40) NOT NULL DEFAULT 'none' AFTER product_id")
    await ensureColumn(connection, databaseName, 'order_items', 'brew_method', 'VARCHAR(40) NULL AFTER product_category')
    await ensureColumn(connection, databaseName, 'payments', 'expires_at', 'DATETIME NULL AFTER paid_at')
    await ensureColumn(connection, databaseName, 'payments', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
    await ensureColumn(connection, databaseName, 'audit_logs', 'operator_type', "VARCHAR(30) NOT NULL DEFAULT 'user' AFTER operator_id")
    await ensureColumn(connection, databaseName, 'audit_logs', 'admin_name', 'VARCHAR(120) NULL AFTER operator_type')
    await ensureColumn(connection, databaseName, 'audit_logs', 'user_name', 'VARCHAR(120) NULL AFTER admin_name')
    await ensureColumn(connection, databaseName, 'audit_logs', 'role', "VARCHAR(30) NOT NULL DEFAULT 'user' AFTER user_name")
    await ensureColumn(connection, databaseName, 'audit_logs', 'target_type', 'VARCHAR(80) NULL AFTER module')
    await ensureColumn(connection, databaseName, 'audit_logs', 'target_id', 'VARCHAR(80) NULL AFTER target_type')
    await ensureColumn(connection, databaseName, 'audit_logs', 'description', 'VARCHAR(500) NULL AFTER target_id')
    await ensureColumn(connection, databaseName, 'audit_logs', 'ip', 'VARCHAR(80) NULL AFTER description')
    await ensureColumn(connection, databaseName, 'audit_logs', 'user_agent', 'VARCHAR(500) NULL AFTER ip')
    await ensureColumn(connection, databaseName, 'users', 'profile_public', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER level')
    await ensureColumn(connection, databaseName, 'users', 'gender', 'VARCHAR(20) NULL AFTER profile_public')
    await ensureColumn(connection, databaseName, 'users', 'birthday', 'DATE NULL AFTER gender')
    await ensureColumn(connection, databaseName, 'users', 'bio', 'VARCHAR(500) NULL AFTER birthday')
    await ensureColumn(connection, databaseName, 'user_notifications', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER type')
    await ensureColumn(connection, databaseName, 'user_notifications', 'related_id', 'BIGINT UNSIGNED NULL AFTER is_read')
    await ensureColumn(connection, databaseName, 'user_notifications', 'related_type', 'VARCHAR(50) NULL AFTER related_id')
    await ensureColumn(connection, databaseName, 'posts', 'media_url', 'VARCHAR(500) NULL AFTER content')
    await ensureColumn(connection, databaseName, 'posts', 'media_type', 'VARCHAR(20) NULL AFTER media_url')
    await ensureColumn(connection, databaseName, 'posts', 'status', "VARCHAR(30) NOT NULL DEFAULT 'published' AFTER content")
    await ensureColumn(connection, databaseName, 'bookings', 'seat_id', 'BIGINT UNSIGNED NULL AFTER slot_id')
    await ensureColumn(connection, databaseName, 'bookings', 'time_slot', 'VARCHAR(50) NULL AFTER booking_time')
    await ensureColumn(connection, databaseName, 'bookings', 'people_count', 'INT NOT NULL DEFAULT 1 AFTER time_slot')
    await ensureColumn(connection, databaseName, 'comments', 'status', "VARCHAR(30) NOT NULL DEFAULT 'published' AFTER content")
    await ensureColumn(connection, databaseName, 'comments', 'is_anonymous', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER status')
    await ensureColumn(connection, databaseName, 'seats', 'width', 'INT NOT NULL DEFAULT 64 AFTER y')
    await ensureColumn(connection, databaseName, 'seats', 'height', 'INT NOT NULL DEFAULT 52 AFTER width')
    await ensureColumn(connection, databaseName, 'seats', 'sort_order', 'INT NOT NULL DEFAULT 0 AFTER status')
    await connection.query(`ALTER TABLE ${databaseSql}.\`verification_codes\` MODIFY \`expires_at\` DATETIME NOT NULL`)
    await connection.query(`ALTER TABLE ${databaseSql}.\`payments\` MODIFY \`expires_at\` DATETIME NULL`)
    await connection.query(`UPDATE ${databaseSql}.\`user_notifications\` SET is_read = 1 WHERE read_at IS NOT NULL`)
    await connection.query(`UPDATE ${databaseSql}.\`seats\` SET status = 'maintenance' WHERE status = 'disabled'`)
    await connection.query(`UPDATE ${databaseSql}.\`audit_logs\` SET role = operator_type WHERE role IS NULL OR role = '' OR (role = 'user' AND operator_type = 'admin')`)
    await connection.query(`UPDATE ${databaseSql}.\`audit_logs\` SET user_name = admin_name WHERE (user_name IS NULL OR user_name = '') AND admin_name IS NOT NULL`)
    await connection.query(`UPDATE ${databaseSql}.\`audit_logs\` SET operator_type = 'user', role = 'user'
      WHERE action IN ('event.register', 'event.unregister', 'order.create', 'order.pay.submit', 'order.cancel',
        'booking.create', 'booking.cancel', 'post.create', 'post.like', 'post.unlike', 'comment.create', 'comment.delete')`)
    await connection.query(`UPDATE ${databaseSql}.\`audit_logs\` SET operator_type = 'admin', role = 'admin'
      WHERE action LIKE 'seat.%'`)
    await migrateContentStatuses(connection)
    await ensureContentReports(connection)
    await migrateProductTypes(connection)
    await dropForeignKeyIfExists(connection, databaseName, 'audit_logs', 'fk_audit_logs_operator')
    await dropIndexIfExists(connection, databaseName, 'cart_items', 'uk_cart_items_cart_product')
    await ensureIndex(connection, databaseName, 'users', 'uk_users_phone', 'UNIQUE KEY uk_users_phone (phone)')
    await ensureIndex(connection, databaseName, 'products', 'idx_products_product_type', 'KEY idx_products_product_type (product_type)')
    await ensureIndex(connection, databaseName, 'cart_items', 'uk_cart_items_cart_product_brew', 'UNIQUE KEY uk_cart_items_cart_product_brew (cart_id, product_id, brew_method)')
    await ensureIndex(connection, databaseName, 'audit_logs', 'idx_audit_logs_operator', 'KEY idx_audit_logs_operator (operator_type, operator_id)')
    await ensureIndex(connection, databaseName, 'audit_logs', 'idx_audit_logs_action', 'KEY idx_audit_logs_action (action)')
    await ensureIndex(connection, databaseName, 'audit_logs', 'idx_audit_logs_role', 'KEY idx_audit_logs_role (role)')
    await ensureIndex(connection, databaseName, 'user_notifications', 'idx_user_notifications_type', 'KEY idx_user_notifications_type (type)')
    await ensureIndex(connection, databaseName, 'user_notifications', 'idx_user_notifications_is_read', 'KEY idx_user_notifications_is_read (is_read)')
    await ensureIndex(connection, databaseName, 'bookings', 'idx_bookings_seat_date_time', 'KEY idx_bookings_seat_date_time (seat_id, booking_date, time_slot)')
    await ensureIndex(connection, databaseName, 'posts', 'idx_posts_status', 'KEY idx_posts_status (status)')
    await ensureIndex(connection, databaseName, 'comments', 'idx_comments_status', 'KEY idx_comments_status (status)')
    await ensureIndex(connection, databaseName, 'content_reports', 'idx_content_reports_post', 'KEY idx_content_reports_post (post_id)')
    await ensureIndex(connection, databaseName, 'content_reports', 'idx_content_reports_comment', 'KEY idx_content_reports_comment (comment_id)')
    await ensureIndex(connection, databaseName, 'content_reports', 'idx_content_reports_status', 'KEY idx_content_reports_status (status)')
    await ensureIndex(connection, databaseName, 'content_reports', 'idx_content_reports_reporter', 'KEY idx_content_reports_reporter (reporter_id)')
    await ensureIndex(connection, databaseName, 'content_reports', 'idx_content_reports_target_status', 'KEY idx_content_reports_target_status (post_id, comment_id, reporter_id, status)')
    await ensureSeats(connection)
    await ensureUserAvatars(connection)
    await ensureProductReviews(connection)
    await ensurePointsCenter(connection)
    await ensureColumn(connection, databaseName, 'user_coupons', 'request_key', 'VARCHAR(80) NULL AFTER coupon_code')
    await ensureIndex(connection, databaseName, 'user_coupons', 'uk_user_coupons_request', 'UNIQUE KEY uk_user_coupons_request (user_id, request_key)')
    await removeLegacyAdminUsers(connection)
    console.log(`Database migration completed: ${databaseName} (schema.sql)`)
  } finally {
    await connection.end()
  }
}

async function ensurePointsCenter(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS ${databaseSql}.\`coupons\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, name VARCHAR(120) NOT NULL,
    coupon_type VARCHAR(40) NOT NULL, points_cost INT NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0, min_spend DECIMAL(10,2) NOT NULL DEFAULT 0,
    valid_days INT NOT NULL DEFAULT 30, description VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_coupons_code (code), KEY idx_coupons_status (status)
  ) ENGINE=InnoDB`)
  await connection.query(`CREATE TABLE IF NOT EXISTS ${databaseSql}.\`user_coupons\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, user_id BIGINT UNSIGNED NOT NULL,
    coupon_id BIGINT UNSIGNED NOT NULL, coupon_code VARCHAR(120) NOT NULL, request_key VARCHAR(80) NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'points', issue_year SMALLINT UNSIGNED NULL,
    points_cost INT NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'unused',
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL, redeemed_at DATETIME NULL,
    PRIMARY KEY (id), UNIQUE KEY uk_user_coupons_code (coupon_code),
    UNIQUE KEY uk_user_coupons_request (user_id, request_key),
    UNIQUE KEY uk_user_coupons_annual (user_id, coupon_id, source, issue_year),
    KEY idx_user_coupons_user_status (user_id, status),
    CONSTRAINT fk_user_coupons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_coupons_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`)
  const coupons = [
    ['COFFEE-8', '咖啡 8 元折扣券', 'coffee', 300, 8, 28, 30, '咖啡商品满 28 元可用'],
    ['BOOK-15', '图书满 99 减 15 券', 'book', 500, 15, 99, 45, '图书商品满 99 元可用'],
    ['EVENT-20', '文化活动 20 元券', 'event', 800, 20, 80, 60, '文化活动报名满 80 元可用'],
    ['MEMBER-10', '全场 10 元优惠券', 'general', 600, 10, 68, 30, '全场满 68 元可用'],
    ['BIRTHDAY-20', '生日专享 20 元券', 'birthday', 0, 20, 68, 30, '生日当天自动发放，每年一次'],
  ]
  for (const coupon of coupons) {
    await connection.execute(`INSERT INTO ${databaseSql}.\`coupons\`
      (code, name, coupon_type, points_cost, discount_amount, min_spend, valid_days, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), coupon_type=VALUES(coupon_type), points_cost=VALUES(points_cost),
        discount_amount=VALUES(discount_amount), min_spend=VALUES(min_spend), valid_days=VALUES(valid_days),
        description=VALUES(description)`, coupon)
  }
}

async function ensureUserAvatars(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS ${databaseSql}.\`user_avatars\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    avatar_url VARCHAR(500) NOT NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'upload',
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_avatars_url (user_id, avatar_url),
    KEY idx_user_avatars_current (user_id, is_current),
    CONSTRAINT fk_user_avatars_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`)
  await connection.query(`INSERT INTO ${databaseSql}.\`user_avatars\` (user_id, avatar_url, source, is_current)
    SELECT id, avatar, 'legacy', 1 FROM ${databaseSql}.\`users\` WHERE avatar IS NOT NULL AND avatar <> ''
    ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url)`)
}

async function ensureSeats(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS ${databaseSql}.\`seats\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, area VARCHAR(100) NULL,
    capacity INT NOT NULL DEFAULT 1, x INT NOT NULL DEFAULT 0, y INT NOT NULL DEFAULT 0,
    width INT NOT NULL DEFAULT 64, height INT NOT NULL DEFAULT 52,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_seats_code (code), KEY idx_seats_status (status)
  ) ENGINE=InnoDB`)
  const seats = [
    ['A1', '靠窗双人座 A1', '靠窗区', 2, 12, 18], ['A2', '靠窗双人座 A2', '靠窗区', 2, 32, 18],
    ['B1', '阅读区单人座 B1', '阅读区', 1, 16, 48], ['B2', '阅读区单人座 B2', '阅读区', 1, 34, 48],
    ['C1', '四人桌 C1', '阅读区', 4, 58, 38], ['C2', '四人桌 C2', '书架区', 4, 78, 38],
    ['D1', '吧台座 D1', '吧台区', 1, 62, 72], ['D2', '吧台座 D2', '吧台区', 1, 78, 72],
  ]
  for (const seat of seats) {
    await connection.execute(`INSERT INTO ${databaseSql}.\`seats\` (code, name, area, capacity, x, y, status)
      VALUES (?, ?, ?, ?, ?, ?, 'available')
      ON DUPLICATE KEY UPDATE code=VALUES(code)`, seat)
  }
}

async function migrateContentStatuses(connection) {
  // Older installations may use ENUMs that cannot accept the current workflow states.
  await connection.query(`ALTER TABLE ${databaseSql}.\`posts\` MODIFY \`status\` VARCHAR(30) NULL`)
  await connection.query(`ALTER TABLE ${databaseSql}.\`comments\` MODIFY \`status\` VARCHAR(30) NULL`)
  await connection.query(`UPDATE ${databaseSql}.\`posts\` SET status = CASE
    WHEN status IN ('已发布', 'active') THEN 'published'
    WHEN status IN ('待审核', 'reviewing') THEN 'pending'
    WHEN status IN ('已拒绝', 'inactive') THEN 'rejected'
    WHEN status IN ('被举报', '待复核', 'review') THEN 'reported'
    WHEN status IN ('已隐藏', 'deleted') THEN 'hidden'
    WHEN status IN ('pending', 'published', 'rejected', 'reported', 'hidden') THEN status
    ELSE 'published' END`)
  await connection.query(`UPDATE ${databaseSql}.\`comments\` SET status = CASE
    WHEN status IN ('正常', '已发布', 'active', 'approved') THEN 'published'
    WHEN status IN ('待审核', 'reviewing', 'review') THEN 'pending'
    WHEN status IN ('已隐藏', 'inactive') THEN 'hidden'
    WHEN status IN ('已删除', 'removed') THEN 'deleted'
    WHEN status IN ('published', 'pending', 'hidden', 'deleted') THEN status
    ELSE 'published' END`)
  await connection.query(`ALTER TABLE ${databaseSql}.\`posts\`
    MODIFY \`status\` VARCHAR(30) NOT NULL DEFAULT 'pending'`)
  await connection.query(`ALTER TABLE ${databaseSql}.\`comments\`
    MODIFY \`status\` VARCHAR(30) NOT NULL DEFAULT 'published'`)
  await connection.query(`UPDATE ${databaseSql}.\`books\` SET status = CASE
    WHEN status IN ('可借阅', '少量馆藏', 'active') THEN 'available'
    WHEN status IN ('暂不可借', 'inactive') THEN 'unavailable'
    ELSE status END`)
  await connection.query(`UPDATE ${databaseSql}.\`events\` SET status = CASE
    WHEN status IN ('报名中', 'open', 'active') THEN 'published'
    WHEN status = '即将满员' THEN 'ongoing'
    WHEN status = 'inactive' THEN 'cancelled'
    ELSE status END`)
  await connection.query(`UPDATE ${databaseSql}.\`products\` SET status = CASE
    WHEN status IN ('现货', '少量库存') THEN 'active'
    WHEN status IN ('暂时售罄', 'sold_out') THEN 'inactive'
    ELSE status END`)
}

async function ensureContentReports(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS ${databaseSql}.\`content_reports\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    comment_id BIGINT UNSIGNED NULL,
    reporter_id BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    target_previous_status VARCHAR(30) NULL,
    resolution VARCHAR(30) NULL,
    handled_by BIGINT UNSIGNED NULL,
    handled_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_content_reports_post (post_id),
    KEY idx_content_reports_comment (comment_id),
    KEY idx_content_reports_status (status),
    KEY idx_content_reports_reporter (reporter_id),
    KEY idx_content_reports_target_status (post_id, comment_id, reporter_id, status),
    CONSTRAINT fk_content_reports_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_reports_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`)
  await ensureColumn(connection, databaseName, 'content_reports', 'comment_id', 'BIGINT UNSIGNED NULL AFTER post_id')
  await ensureColumn(connection, databaseName, 'content_reports', 'description', 'VARCHAR(1000) NULL AFTER reason')
  await ensureColumn(connection, databaseName, 'content_reports', 'status', "VARCHAR(30) NOT NULL DEFAULT 'pending' AFTER description")
  await ensureColumn(connection, databaseName, 'content_reports', 'target_previous_status', 'VARCHAR(30) NULL AFTER status')
  await ensureColumn(connection, databaseName, 'content_reports', 'resolution', 'VARCHAR(30) NULL AFTER target_previous_status')
  await ensureColumn(connection, databaseName, 'content_reports', 'handled_by', 'BIGINT UNSIGNED NULL AFTER resolution')
  await ensureColumn(connection, databaseName, 'content_reports', 'handled_at', 'DATETIME NULL AFTER handled_by')
  await ensureColumn(connection, databaseName, 'content_reports', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER handled_at')
  await ensureColumn(connection, databaseName, 'content_reports', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
  await connection.query(`UPDATE ${databaseSql}.\`content_reports\` SET status = CASE
    WHEN status IN ('resolved', 'processed', 'handled') THEN 'resolved'
    WHEN status IN ('dismissed', 'rejected') THEN 'dismissed'
    WHEN status = 'pending' THEN 'pending'
    ELSE 'pending' END`)
  await connection.query(`ALTER TABLE ${databaseSql}.\`content_reports\`
    MODIFY \`status\` VARCHAR(30) NOT NULL DEFAULT 'pending'`)
}

async function ensureProductReviews(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS ${databaseSql}.\`product_reviews\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NULL,
      rating INT NOT NULL DEFAULT 5,
      content TEXT NULL,
      media_url VARCHAR(500) NULL,
      media_type VARCHAR(20) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_product_reviews_product_id (product_id),
      KEY idx_product_reviews_user_id (user_id),
      KEY idx_product_reviews_status (status),
      CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_product_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
  )
}

async function removeLegacyAdminUsers(connection) {
  await connection.query(
    `DELETE c FROM carts c
     INNER JOIN users u ON u.id = c.user_id
     WHERE (u.username = 'admin' OR u.phone = '13800000000')
       AND u.role = 'admin'`,
  )
  await connection.query(
    `DELETE FROM users
     WHERE (username = 'admin' OR phone = '13800000000')
       AND role = 'admin'
       AND id NOT IN (SELECT DISTINCT user_id FROM orders)
       AND id NOT IN (SELECT DISTINCT user_id FROM posts WHERE user_id IS NOT NULL)
       AND id NOT IN (SELECT DISTINCT user_id FROM bookings)
       AND id NOT IN (SELECT DISTINCT user_id FROM event_registrations)`,
  )
}

async function migrateProductTypes(connection) {
  const coffeePattern = [
    '%咖啡%', '%咖啡豆%', '%挂耳%', '%拿铁%', '%美式%', '%冷萃%', '%现磨%', '%卡布奇诺%', '%饮品%',
    '%鍜栧暋%', '%鍐疯悆%', '%鎷块搧%',
  ]
  const culturalPattern = [
    '%杯子%', '%杯具%', '%书签%', '%笔记本%', '%帆布袋%', '%器具%', '%礼盒%', '%周边%',
    '%滤纸%', '%手冲壶%', '%磨豆机%', '%咖啡杯%', '%明信片%',
    '%鏉叿%', '%绀肩洅%',
  ]
  const coffeeWhere = coffeePattern.map(() => '(category LIKE ? OR name LIKE ?)').join(' OR ')
  const culturalWhere = culturalPattern.map(() => '(category LIKE ? OR name LIKE ?)').join(' OR ')
  const coffeeParams = coffeePattern.flatMap((pattern) => [pattern, pattern])
  const culturalParams = culturalPattern.flatMap((pattern) => [pattern, pattern])

  await connection.query(
    `UPDATE ${databaseSql}.\`products\`
     SET product_type = 'cultural', supports_brew_method = 0
     WHERE ${culturalWhere}`,
    culturalParams,
  )
  await connection.query(
    `UPDATE ${databaseSql}.\`products\`
     SET product_type = 'coffee', supports_brew_method = 1
     WHERE (${coffeeWhere}) AND NOT (${culturalWhere})`,
    [...coffeeParams, ...culturalParams],
  )
  await connection.query(
    `UPDATE ${databaseSql}.\`products\` SET product_type = 'cultural', supports_brew_method = 0 WHERE product_type NOT IN ('coffee', 'cultural') OR product_type IS NULL`,
  )
  await connection.query(`UPDATE ${databaseSql}.\`products\` SET supports_brew_method = 1 WHERE product_type = 'coffee'`)
  await connection.query(`UPDATE ${databaseSql}.\`products\` SET supports_brew_method = 0 WHERE product_type = 'cultural'`)
}

async function ensureColumn(connection, schema, table, column, definition) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [schema, table, column],
  )
  if (Number(rows[0].total) === 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`${column}\` ${definition}`)
  }
}

async function ensureIndex(connection, schema, table, indexName, definition) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [schema, table, indexName],
  )
  if (Number(rows[0].total) === 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` ADD ${definition}`)
  }
}

async function dropIndexIfExists(connection, schema, table, indexName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [schema, table, indexName],
  )
  if (Number(rows[0].total) > 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` DROP INDEX \`${indexName}\``)
  }
}

async function dropForeignKeyIfExists(connection, schema, table, constraintName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [schema, table, constraintName],
  )
  if (Number(rows[0].total) > 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` DROP FOREIGN KEY \`${constraintName}\``)
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error.message)
  process.exitCode = 1
})
