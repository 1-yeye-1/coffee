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
    await ensureColumn(connection, 'coffee', 'payments', 'expires_at', 'TIMESTAMP NULL AFTER paid_at')
    await ensureColumn(connection, 'coffee', 'payments', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'operator_type', "VARCHAR(30) NOT NULL DEFAULT 'user' AFTER operator_id")
    await ensureColumn(connection, 'coffee', 'audit_logs', 'admin_name', 'VARCHAR(120) NULL AFTER operator_type')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'target_type', 'VARCHAR(80) NULL AFTER module')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'target_id', 'VARCHAR(80) NULL AFTER target_type')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'description', 'VARCHAR(500) NULL AFTER target_id')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'ip', 'VARCHAR(80) NULL AFTER description')
    await ensureColumn(connection, 'coffee', 'audit_logs', 'user_agent', 'VARCHAR(500) NULL AFTER ip')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER type')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'related_id', 'BIGINT UNSIGNED NULL AFTER is_read')
    await ensureColumn(connection, 'coffee', 'user_notifications', 'related_type', 'VARCHAR(50) NULL AFTER related_id')
    await ensureColumn(connection, 'coffee', 'posts', 'media_url', 'VARCHAR(500) NULL AFTER content')
    await ensureColumn(connection, 'coffee', 'posts', 'media_type', 'VARCHAR(20) NULL AFTER media_url')
    await connection.query('UPDATE `coffee`.`user_notifications` SET is_read = 1 WHERE read_at IS NOT NULL')
    await dropForeignKeyIfExists(connection, 'coffee', 'audit_logs', 'fk_audit_logs_operator')
    await ensureIndex(connection, 'coffee', 'users', 'uk_users_phone', 'UNIQUE KEY uk_users_phone (phone)')
    await ensureIndex(connection, 'coffee', 'audit_logs', 'idx_audit_logs_operator', 'KEY idx_audit_logs_operator (operator_type, operator_id)')
    await ensureIndex(connection, 'coffee', 'audit_logs', 'idx_audit_logs_action', 'KEY idx_audit_logs_action (action)')
    await ensureIndex(connection, 'coffee', 'user_notifications', 'idx_user_notifications_type', 'KEY idx_user_notifications_type (type)')
    await ensureIndex(connection, 'coffee', 'user_notifications', 'idx_user_notifications_is_read', 'KEY idx_user_notifications_is_read (is_read)')
    await removeLegacyAdminUsers(connection)
    console.log('Database migration completed: coffee (schema.sql)')
  } finally {
    await connection.end()
  }
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
