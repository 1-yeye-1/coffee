import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

import { env } from '../config/env.js'

const schemaPath = fileURLToPath(new URL('../sql/schema.sql', import.meta.url))

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
    await connection.query(sql)
    await ensureColumn(connection, 'coffee', 'orders', 'source', "VARCHAR(30) NOT NULL DEFAULT 'cart' AFTER user_id")
    await ensureColumn(connection, 'coffee', 'products', 'product_type', "VARCHAR(40) NOT NULL DEFAULT 'coffee' AFTER category")
    await ensureColumn(connection, 'coffee', 'products', 'image_url', 'VARCHAR(500) NULL AFTER supports_brew_method')
    await ensureColumn(connection, 'coffee', 'books', 'cover_url', 'VARCHAR(500) NULL AFTER cover_tone')
    await ensureColumn(connection, 'coffee', 'events', 'cover_url', 'VARCHAR(500) NULL AFTER tone')
    await ensureColumn(connection, 'coffee', 'products', 'supports_brew_method', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER product_type')
    await ensureColumn(connection, 'coffee', 'cart_items', 'brew_method', "VARCHAR(40) NOT NULL DEFAULT 'none' AFTER product_id")
    await ensureColumn(connection, 'coffee', 'order_items', 'brew_method', 'VARCHAR(40) NULL AFTER product_category')
    await ensureColumn(connection, 'coffee', 'payments', 'expires_at', 'TIMESTAMP NULL AFTER paid_at')
    await ensureColumn(connection, 'coffee', 'payments', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'operator_type', "VARCHAR(30) NOT NULL DEFAULT 'user' AFTER operator_id")
    await ensureColumn(connection, 'coffee', 'audit_logs', 'admin_name', 'VARCHAR(120) NULL AFTER operator_type')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'target_type', 'VARCHAR(80) NULL AFTER module')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'target_id', 'VARCHAR(80) NULL AFTER target_type')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'description', 'VARCHAR(500) NULL AFTER target_id')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'ip', 'VARCHAR(80) NULL AFTER description')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'user_agent', 'VARCHAR(500) NULL AFTER ip')
    await ensureColumn(connection, 'coffee', 'users', 'profile_public', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER level')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER type')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'related_id', 'BIGINT UNSIGNED NULL AFTER is_read')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'related_type', 'VARCHAR(50) NULL AFTER related_id')
    await ensureColumn(connection, 'coffee', 'posts', 'media_url', 'VARCHAR(500) NULL AFTER content')
    await ensureColumn(connection, 'coffee', 'posts', 'media_type', 'VARCHAR(20) NULL AFTER media_url')
    await ensureColumn(connection, 'coffee', 'bookings', 'seat_id', 'BIGINT UNSIGNED NULL AFTER slot_id')
    await ensureColumn(connection, 'coffee', 'bookings', 'time_slot', 'VARCHAR(50) NULL AFTER booking_time')
    await ensureColumn(connection, 'coffee', 'bookings', 'people_count', 'INT NOT NULL DEFAULT 1 AFTER time_slot')
    await connection.query('UPDATE `coffee`.`user_notifications` SET is_read = 1 WHERE read_at IS NOT NULL')
    await migrateContentStatuses(connection)
    await migrateProductTypes(connection)
    await dropForeignKeyIfExists(connection, 'coffee', 'audit_logs', 'fk_audit_logs_operator')
    await dropIndexIfExists(connection, 'coffee', 'cart_items', 'uk_cart_items_cart_product')
    await ensureIndex(connection, 'coffee', 'users', 'uk_users_phone', 'UNIQUE KEY uk_users_phone (phone)')
    await ensureIndex(connection, 'coffee', 'products', 'idx_products_product_type', 'KEY idx_products_product_type (product_type)')
    await ensureIndex(connection, 'coffee', 'cart_items', 'uk_cart_items_cart_product_brew', 'UNIQUE KEY uk_cart_items_cart_product_brew (cart_id, product_id, brew_method)')
    await ensureIndex(connection, 'coffee', 'audit_logs', 'idx_audit_logs_operator', 'KEY idx_audit_logs_operator (operator_type, operator_id)')
    await ensureIndex(connection, 'coffee', 'audit_logs', 'idx_audit_logs_action', 'KEY idx_audit_logs_action (action)')
    await ensureIndex(connection, 'coffee', 'user_notifications', 'idx_user_notifications_type', 'KEY idx_user_notifications_type (type)')
    await ensureIndex(connection, 'coffee', 'user_notifications', 'idx_user_notifications_is_read', 'KEY idx_user_notifications_is_read (is_read)')
    await ensureIndex(connection, 'coffee', 'bookings', 'idx_bookings_seat_date_time', 'KEY idx_bookings_seat_date_time (seat_id, booking_date, time_slot)')
    await ensureSeats(connection)
    await ensureProductReviews(connection)
    await removeLegacyAdminUsers(connection)
    console.log('Database migration completed: coffee (schema.sql)')
  } finally {
    await connection.end()
  }
}

async function ensureSeats(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS \`coffee\`.\`seats\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, area VARCHAR(100) NULL,
    capacity INT NOT NULL DEFAULT 1, x INT NOT NULL DEFAULT 0, y INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
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
    await connection.execute(`INSERT INTO \`coffee\`.\`seats\` (code, name, area, capacity, x, y, status)
      VALUES (?, ?, ?, ?, ?, ?, 'available')
      ON DUPLICATE KEY UPDATE name=VALUES(name), area=VALUES(area), capacity=VALUES(capacity), x=VALUES(x), y=VALUES(y)`, seat)
  }
}

async function migrateContentStatuses(connection) {
  await connection.query(`UPDATE \`coffee\`.\`posts\` SET status = CASE
    WHEN status IN ('已发布', 'active') THEN 'published'
    WHEN status IN ('待审核', 'reviewing') THEN 'pending'
    WHEN status IN ('已拒绝', 'inactive') THEN 'rejected'
    WHEN status IN ('已隐藏', 'deleted') THEN 'hidden'
    ELSE status END`)
  await connection.query(`UPDATE \`coffee\`.\`books\` SET status = CASE
    WHEN status IN ('可借阅', '少量馆藏', 'active') THEN 'available'
    WHEN status IN ('暂不可借', 'inactive') THEN 'unavailable'
    ELSE status END`)
  await connection.query(`UPDATE \`coffee\`.\`events\` SET status = CASE
    WHEN status IN ('报名中', 'open', 'active') THEN 'published'
    WHEN status = '即将满员' THEN 'ongoing'
    WHEN status = 'inactive' THEN 'cancelled'
    ELSE status END`)
  await connection.query(`UPDATE \`coffee\`.\`products\` SET status = CASE
    WHEN status IN ('现货', '少量库存') THEN 'active'
    WHEN status IN ('暂时售罄', 'sold_out') THEN 'inactive'
    ELSE status END`)
}

async function ensureProductReviews(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS \`coffee\`.\`product_reviews\` (
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
    `UPDATE \`coffee\`.\`products\`
     SET product_type = 'cultural', supports_brew_method = 0
     WHERE ${culturalWhere}`,
    culturalParams,
  )
  await connection.query(
    `UPDATE \`coffee\`.\`products\`
     SET product_type = 'coffee', supports_brew_method = 1
     WHERE (${coffeeWhere}) AND NOT (${culturalWhere})`,
    [...coffeeParams, ...culturalParams],
  )
  await connection.query(
    "UPDATE `coffee`.`products` SET product_type = 'cultural', supports_brew_method = 0 WHERE product_type NOT IN ('coffee', 'cultural') OR product_type IS NULL",
  )
  await connection.query("UPDATE `coffee`.`products` SET supports_brew_method = 1 WHERE product_type = 'coffee'")
  await connection.query("UPDATE `coffee`.`products` SET supports_brew_method = 0 WHERE product_type = 'cultural'")
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
