import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { recordAudit } from './audit.service.js'

function parsePayload(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
}

function inferRisk(action = '', module = '') {
  if (/delete|batch_delete|cancel|reject|refund|risk|penalty/i.test(action)) return 'high'
  if (/export|status|update/i.test(action) || /upload|order/i.test(module)) return 'medium'
  return 'low'
}

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
    payload: row.payload ? parsePayload(row.payload) : null,
    riskLevel: inferRisk(row.action, row.module),
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

  if (query.startDate && query.endDate && String(query.startDate) > String(query.endDate)) {
    const error = new Error('开始日期不能晚于结束日期')
    error.status = 400
    throw error
  }

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
      target_type AS targetType, target_id AS targetId, description, ip, payload,
      user_agent AS userAgent, created_at AS createdAt
     FROM audit_logs ${where}
     ORDER BY created_at ASC, id ASC
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
      target_type AS targetType, target_id AS targetId, description, ip, payload,
      user_agent AS userAgent, created_at AS createdAt
     FROM audit_logs
     WHERE id = ?
     LIMIT 1`,
    [id],
  )
  return row ? mapLog(row) : null
}


function buildLogWhere(query = {}) {
  const clauses = []
  const params = []
  if (query.startDate && query.endDate && String(query.startDate) > String(query.endDate)) {
    const error = new Error('????????????')
    error.status = 400
    throw error
  }
  if (query.userId || query.adminId) { clauses.push('operator_id = ?'); params.push(query.userId || query.adminId) }
  if (query.userName || query.adminName) { clauses.push('COALESCE(user_name, admin_name) LIKE ?'); params.push(`%${String(query.userName || query.adminName).trim()}%`) }
  if (query.role && query.role !== 'all') { clauses.push('role = ?'); params.push(query.role) }
  if (query.action && query.action !== 'all') { clauses.push('action LIKE ?'); params.push(`${query.action}%`) }
  if (query.module && query.module !== 'all') { clauses.push('module LIKE ?'); params.push(`${query.module}%`) }
  if (query.targetType) { clauses.push('target_type = ?'); params.push(query.targetType) }
  if (query.targetId) { clauses.push('target_id = ?'); params.push(query.targetId) }
  if (query.ip) { clauses.push('ip LIKE ?'); params.push(`%${String(query.ip).trim()}%`) }
  if (query.startDate) { clauses.push('created_at >= ?'); params.push(query.startDate) }
  if (query.endDate) { clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(query.endDate) }
  if (query.keyword) {
    clauses.push('(action LIKE ? OR module LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR description LIKE ? OR COALESCE(user_name, admin_name) LIKE ?)')
    const keyword = `%${String(query.keyword).trim()}%`
    params.push(keyword, keyword, keyword, keyword, keyword, keyword)
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

export async function getAdminLogStats() {
  const [[row]] = await pool.execute(`SELECT
    SUM(DATE(created_at) = CURRENT_DATE) AS todayLogs,
    SUM(DATE(created_at) = CURRENT_DATE AND (action LIKE '%delete%' OR action LIKE '%cancel%' OR action LIKE '%reject%' OR action LIKE '%risk%' OR action LIKE '%penalty%')) AS dangerousToday,
    SUM(DATE(created_at) = CURRENT_DATE AND action LIKE '%fail%') AS failedToday,
    SUM(action LIKE '%delete%') AS deleteActions
    FROM audit_logs`)
  const [[admin]] = await pool.execute(`SELECT COALESCE(user_name, admin_name) AS name, COUNT(*) AS total FROM audit_logs WHERE operator_type = 'admin' GROUP BY operator_id, name ORDER BY total DESC LIMIT 1`)
  return { todayLogs: Number(row.todayLogs || 0), dangerousToday: Number(row.dangerousToday || 0), failedToday: Number(row.failedToday || 0), deleteActions: Number(row.deleteActions || 0), topAdmin: admin?.name || null, topAdminActions: Number(admin?.total || 0) }
}

export async function exportAdminLogs(query = {}, admin = null, req = null) {
  const { where, params } = buildLogWhere(query)
  const limit = Math.min(1000, Math.max(1, Number(query.limit) || 500))
  const [rows] = await pool.execute(
    `SELECT id, operator_id AS userId, COALESCE(user_name, admin_name) AS userName, role, action, module,
      target_type AS targetType, target_id AS targetId, description, ip, user_agent AS userAgent, payload, created_at AS createdAt
     FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
    params,
  )
  await logAdminAction({ admin, action: 'export', module: 'audit', targetType: 'audit_logs', description: '??????', req, payload: { filters: query, count: rows.length } })
  if (query.format === 'json') return { contentType: 'application/json; charset=utf-8', body: JSON.stringify(rows.map(mapLog), null, 2), filename: 'audit-logs.json' }
  const header = ['id', 'userName', 'role', 'action', 'module', 'targetType', 'targetId', 'description', 'ip', 'createdAt']
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const body = [header.join(','), ...rows.map((row) => header.map((key) => escape(row[key])).join(','))].join('\n')
  return { contentType: 'text/csv; charset=utf-8', body, filename: 'audit-logs.csv' }
}
