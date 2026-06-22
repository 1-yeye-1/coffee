import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { recordAudit } from './audit.service.js'

function mapLog(row) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    role: row.role,
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
    await recordAudit({ operatorId: admin?.id, operatorType: 'admin', actor: admin, action, module, targetType, targetId, description, req, payload })
  } catch (error) {
    console.warn(`后台操作日志写入失败: ${error.message}`)
  }
}

export async function listAdminLogs(query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 20)
  const clauses = []
  const params = []

  if (query.userId || query.adminId) {
    clauses.push('operator_id = ?')
    params.push(query.userId || query.adminId)
  }
  if (query.userName || query.adminName) {
    clauses.push('COALESCE(user_name, admin_name) LIKE ?')
    params.push(`%${String(query.userName || query.adminName).trim()}%`)
  }
  if (query.role && query.role !== 'all') {
    clauses.push('role = ?')
    params.push(query.role)
  }
  if (query.action && query.action !== 'all') {
    clauses.push('action LIKE ?')
    params.push(`${query.action}%`)
  }
  if (query.module && query.module !== 'all') {
    clauses.push('module LIKE ?')
    params.push(`${query.module}%`)
  }
  if (query.startDate) {
    clauses.push('created_at >= ?')
    params.push(query.startDate)
  }
  if (query.endDate) {
    clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(query.endDate)
  }
  if (query.keyword) {
    clauses.push('(action LIKE ? OR module LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR description LIKE ? OR COALESCE(user_name, admin_name) LIKE ?)')
    const keyword = `%${String(query.keyword).trim()}%`
    params.push(keyword, keyword, keyword, keyword, keyword, keyword)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params)
  const [rows] = await pool.execute(
    `SELECT id, operator_id AS userId, COALESCE(user_name, admin_name) AS userName, role, action, module,
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
    `SELECT id, operator_id AS userId, COALESCE(user_name, admin_name) AS userName, role, action, module,
      target_type AS targetType, target_id AS targetId, description, ip,
      user_agent AS userAgent, created_at AS createdAt
     FROM audit_logs
     WHERE id = ?
     LIMIT 1`,
    [id],
  )
  return row ? mapLog(row) : null
}
