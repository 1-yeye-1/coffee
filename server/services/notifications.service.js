import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'

const validTypes = new Set(['system', 'order', 'booking', 'activity', 'community', 'audit'])

function normalizeType(type) {
  const value = String(type || 'system').trim()
  return validTypes.has(value) ? value : 'system'
}

function mapNotification(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    isRead: Boolean(row.isRead),
    relatedId: row.relatedId,
    relatedType: row.relatedType,
    createdAt: row.createdAt,
    readAt: row.readAt,
  }
}

export async function listNotifications(userId, query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 10)
  const clauses = ['user_id = ?']
  const params = [userId]

  if (query.type && query.type !== 'all') {
    clauses.push('type = ?')
    params.push(normalizeType(query.type))
  }
  if (query.readStatus === 'unread') clauses.push('is_read = 0')
  if (query.readStatus === 'read') clauses.push('is_read = 1')
  if (query.keyword) {
    clauses.push('(title LIKE ? OR content LIKE ?)')
    const keyword = `%${String(query.keyword).trim()}%`
    params.push(keyword, keyword)
  }

  const where = `WHERE ${clauses.join(' AND ')}`
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM user_notifications ${where}`, params)
  const [rows] = await pool.execute(
    `SELECT id, title, content, type, is_read AS isRead, related_id AS relatedId,
      related_type AS relatedType, created_at AS createdAt, read_at AS readAt
     FROM user_notifications ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    params,
  )
  return {
    items: rows.map(mapNotification),
    meta: { page, pageSize, total: Number(total) },
  }
}

export async function getUnreadCount(userId) {
  const [[row]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user_notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  )
  return { count: Number(row.total) }
}

export async function markAsRead(userId, notificationId) {
  await pool.execute(
    `UPDATE user_notifications
     SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
  )
  return getUnreadCount(userId)
}

export async function markAllAsRead(userId) {
  const [result] = await pool.execute(
    `UPDATE user_notifications
     SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  )
  return { updated: Number(result.affectedRows || 0) }
}

export async function deleteNotification(userId, notificationId) {
  const [result] = await pool.execute(
    'DELETE FROM user_notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
  )
  return Number(result.affectedRows || 0) > 0
}

export async function createNotification(payload, connection = pool) {
  const userId = Number(payload.userId)
  const title = String(payload.title || '').trim()
  const content = String(payload.content || '').trim()
  if (!userId) throw Object.assign(new Error('通知接收用户不能为空'), { statusCode: 400 })
  if (!title) throw Object.assign(new Error('通知标题不能为空'), { statusCode: 400 })

  const [result] = await connection.execute(
    `INSERT INTO user_notifications
      (user_id, title, content, type, is_read, related_id, related_type)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [
      userId,
      title,
      content,
      normalizeType(payload.type),
      payload.relatedId || null,
      payload.relatedType || null,
    ],
  )
  const [[row]] = await connection.execute(
    `SELECT id, title, content, type, is_read AS isRead, related_id AS relatedId,
      related_type AS relatedType, created_at AS createdAt, read_at AS readAt
     FROM user_notifications WHERE id = ? LIMIT 1`,
    [result.insertId],
  )
  return mapNotification(row)
}

export const createSystemNotification = createNotification
