import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'

function clientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return req?.ip || req?.socket?.remoteAddress || ''
}

function mapLog(row) {
  return {
    id: row.id,
    adminId: row.adminId,
    adminName: row.adminName,
    action: row.action,
    module: row.module,
    targetType: row.targetType,
    targetId: row.targetId,
    description: row.description,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  }
}

export async function logAdminAction({
  admin,
  action,
  module,
  targetType = null,
  targetId = null,
  description = '',
  req = null,
  payload = null,
}) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs
        (operator_id, operator_type, admin_name, action, module, target_type, target_id, description, ip, user_agent, payload)
       VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admin?.id || null,
        admin?.username || admin?.nickname || '',
        action,
        module,
        targetType,
        targetId == null ? null : String(targetId),
        description,
        clientIp(req),
        req?.headers?.['user-agent'] || '',
        payload ? JSON.stringify(payload) : null,
      ],
    )
  } catch (error) {
    console.warn(`后台操作日志写入失败: ${error.message}`)
  }
}

export async function listAdminLogs(query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 20)
  const clauses = ["operator_type = 'admin'"]
  const params = []

  if (query.adminId) {
    clauses.push('operator_id = ?')
    params.push(query.adminId)
  }
  if (query.adminName) {
    clauses.push('admin_name LIKE ?')
    params.push(`%${String(query.adminName).trim()}%`)
  }
  if (query.action && query.action !== 'all') {
    clauses.push('action = ?')
    params.push(query.action)
  }
  if (query.module && query.module !== 'all') {
    clauses.push('module = ?')
    params.push(query.module)
  }
  if (query.startDate) {
    clauses.push('created_at >= ?')
    params.push(query.startDate)
  }
  if (query.endDate) {
    clauses.push('created_at <= ?')
    params.push(query.endDate)
  }
  if (query.keyword) {
    clauses.push('(action LIKE ? OR module LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR description LIKE ? OR admin_name LIKE ?)')
    const keyword = `%${String(query.keyword).trim()}%`
    params.push(keyword, keyword, keyword, keyword, keyword, keyword)
  }

  const where = `WHERE ${clauses.join(' AND ')}`
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params)
  const [rows] = await pool.execute(
    `SELECT id, operator_id AS adminId, admin_name AS adminName, action, module,
      target_type AS targetType, target_id AS targetId, description, ip,
      user_agent AS userAgent, created_at AS createdAt
     FROM audit_logs ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    params,
  )
  return {
    items: rows.map(mapLog),
    meta: { page, pageSize, total: Number(total) },
  }
}

export async function getAdminLogDetail(id) {
  const [[row]] = await pool.execute(
    `SELECT id, operator_id AS adminId, admin_name AS adminName, action, module,
      target_type AS targetType, target_id AS targetId, description, ip,
      user_agent AS userAgent, created_at AS createdAt
     FROM audit_logs
     WHERE id = ? AND operator_type = 'admin'
     LIMIT 1`,
    [id],
  )
  return row ? mapLog(row) : null
}
