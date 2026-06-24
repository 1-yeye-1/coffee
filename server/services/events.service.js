import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { createNotification } from './notifications.service.js'

const validEventStatuses = new Set(['draft', 'published', 'ongoing', 'ended', 'cancelled'])
const validRegistrationStatuses = new Set(['registered', 'cancelled', 'attended', 'absent'])

function csvEscape(value) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function registrationCheckinStatus(status) {
  if (status === 'attended') return 'attended'
  if (status === 'absent') return 'absent'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
}

function slugify(value, fallback = 'event') {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

async function uniqueEventSlug(base, excludeId = null) {
  const root = slugify(base)
  let slug = root
  let index = 2
  while (true) {
    const params = [slug]
    let clause = ''
    if (excludeId) {
      clause = 'AND id <> ?'
      params.push(excludeId)
    }
    const [[row]] = await pool.execute(`SELECT id FROM events WHERE slug = ? ${clause} LIMIT 1`, params)
    if (!row) return slug
    slug = `${root}-${index++}`
  }
}

function assertEventStatus(status) {
  if (!validEventStatuses.has(status)) throw Object.assign(new Error('活动状态无效'), { statusCode: 400 })
}

const columns = `
  id, slug, title, category, DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
  event_time AS time, location, capacity, attendees, status, tone, summary,
  cover_url AS coverUrl, description, speaker, agenda, created_at AS createdAt, updated_at AS updatedAt
`

function normalize(row) {
  if (!row) return null
  return {
    ...row,
    speaker: typeof row.speaker === 'string' ? JSON.parse(row.speaker || 'null') : row.speaker,
    agenda: typeof row.agenda === 'string' ? JSON.parse(row.agenda || '[]') : row.agenda,
  }
}

function normalizeRegistration(row) {
  if (!row) return null
  return {
    registrationId: row.registrationId,
    eventId: row.eventId,
    userId: row.userId,
    nickname: row.nickname,
    phone: row.phone,
    email: row.email,
    status: row.status,
    checkinStatus: row.checkinStatus || registrationCheckinStatus(row.status),
    registeredAt: row.registeredAt,
    cancelledAt: row.cancelledAt,
    attendedAt: row.attendedAt,
    absentAt: row.absentAt,
  }
}

function buildFilters(query = {}, admin = false) {
  const clauses = []
  const params = []
  if (!admin) clauses.push("status IN ('published', 'ongoing', 'open', 'active')")
  if (query.category && query.category !== 'all') {
    clauses.push('category = ?')
    params.push(query.category)
  }
  if (query.status) {
    clauses.push('status = ?')
    params.push(query.status)
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

export async function listEvents(query = {}, admin = false) {
  const { page, pageSize, offset } = parsePagination(query)
  const { where, params } = buildFilters(query, admin)
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM events ${where}`, params)
  const [rows] = await pool.query(
    `SELECT ${columns} FROM events ${where}
     ORDER BY CASE
       WHEN status IN ('published','ongoing','open','active') AND event_date >= CURRENT_DATE AND attendees < capacity THEN 0
       ELSE 1 END ASC,
       CASE WHEN event_date >= CURRENT_DATE THEN event_date END ASC,
       event_date DESC, id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows.map(normalize), meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function findEventBySlug(slug) {
  const identifier = String(slug || '').trim()
  const byId = /^\d+$/.test(identifier)
  const [rows] = await pool.execute(`SELECT ${columns} FROM events WHERE ${byId ? 'id' : 'slug'} = ? AND status IN ('published', 'ongoing', 'open', 'active') LIMIT 1`, [identifier])
  return normalize(rows[0])
}

export async function findEventById(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM events WHERE id = ? LIMIT 1`, [id])
  return normalize(rows[0])
}

export async function createEvent(payload) {
  assertEventStatus(payload.status || 'draft')
  const next = { ...payload, slug: payload.slug || await uniqueEventSlug(payload.title) }
  const [result] = await pool.execute(
    `INSERT INTO events
      (slug, title, category, event_date, event_time, location, capacity, attendees, status,
       tone, cover_url, summary, description, speaker, agenda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      next.slug,
      next.title,
      next.category || '',
      next.date,
      next.time || '',
      next.location || '',
      Number(next.capacity) || 0,
      Number(next.attendees) || 0,
      next.status || 'draft',
      next.tone || null,
      next.coverUrl || null,
      next.summary || null,
      next.description || null,
      JSON.stringify(next.speaker || null),
      JSON.stringify(next.agenda || []),
    ],
  )
  return findEventById(result.insertId)
}

export async function updateEvent(id, payload) {
  const current = await findEventById(id)
  if (!current) return null
  const next = { ...current, ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) }
  next.slug = current.slug || payload.slug || await uniqueEventSlug(next.title, id)
  assertEventStatus(next.status || 'draft')
  await pool.execute(
    `UPDATE events SET slug=?, title=?, category=?, event_date=?, event_time=?, location=?,
      capacity=?, attendees=?, status=?, tone=?, cover_url=?, summary=?, description=?, speaker=?, agenda=?
     WHERE id=?`,
    [
      next.slug,
      next.title,
      next.category || '',
      next.date,
      next.time || '',
      next.location || '',
      Number(next.capacity) || 0,
      Number(next.attendees) || 0,
      next.status || 'draft',
      next.tone || null,
      next.coverUrl || null,
      next.summary || null,
      next.description || null,
      JSON.stringify(next.speaker || null),
      JSON.stringify(next.agenda || []),
      id,
    ],
  )
  return findEventById(id)
}

export async function deleteEvent(id) {
  const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [id])
  return result.affectedRows > 0
}

export async function registerEvent(eventId, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [events] = await connection.execute('SELECT id, title, event_date AS eventDate, capacity, attendees, status FROM events WHERE id = ? FOR UPDATE', [eventId])
    const event = events[0]
    if (!event) {
      await connection.rollback()
      return null
    }
    if (!['published', 'ongoing', 'open', 'active'].includes(event.status) || new Date(event.eventDate) < new Date(new Date().toDateString())) {
      throw Object.assign(new Error('活动当前不可报名'), { statusCode: 409 })
    }
    const [[registration]] = await connection.execute('SELECT status FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1', [eventId, userId])
    if (registration?.status === 'registered') throw Object.assign(new Error('你已报名该活动'), { statusCode: 409 })
    if (Number(event.attendees) >= Number(event.capacity)) {
      const error = new Error('活动名额已满')
      error.statusCode = 409
      throw error
    }
    await connection.execute(
      `INSERT INTO event_registrations (event_id, user_id, status)
       VALUES (?, ?, 'registered')
       ON DUPLICATE KEY UPDATE status = 'registered', registered_at = CURRENT_TIMESTAMP,
         cancelled_at = NULL, attended_at = NULL, absent_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      [eventId, userId],
    )
    await connection.execute(
      `UPDATE events SET attendees = (
        SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'registered'
      ) WHERE id = ?`,
      [eventId, eventId],
    )
    await writeAudit(userId, 'event.register', 'events', { eventId }, connection)
    await createNotification({ userId, title: registration ? '重新报名成功' : '活动报名成功', content: `你已报名活动《${event.title}》。`, type: 'event', relatedId: eventId, relatedType: 'event' }, connection)
    await connection.commit()
    return findEventById(eventId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function cancelEventRegistration(eventId, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      `UPDATE event_registrations SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
       WHERE event_id = ? AND user_id = ? AND status = 'registered'`,
      [eventId, userId],
    )
    await connection.execute(
      `UPDATE events SET attendees = (
        SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'registered'
      ) WHERE id = ?`,
      [eventId, eventId],
    )
    await writeAudit(userId, 'event.unregister', 'events', { eventId }, connection)
    if (result.affectedRows) await createNotification({ userId, title: '活动报名已取消', content: '活动名额已释放，你仍可在报名开放期间重新报名。', type: 'event', relatedId: eventId, relatedType: 'event' }, connection)
    await connection.commit()
    return result.affectedRows > 0
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function buildRegistrationFilters(eventId, query = {}) {
  const clauses = ['er.event_id = ?']
  const params = [eventId]
  const keyword = String(query.keyword || '').trim()
  const status = String(query.status || '').trim()
  const checkinStatus = String(query.checkinStatus || query.checkin || '').trim()

  if (keyword) {
    clauses.push('(u.nickname LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)')
    const like = `%${keyword}%`
    params.push(like, like, like, like)
  }
  if (status && status !== 'all') {
    clauses.push('er.status = ?')
    params.push(status)
  }
  if (checkinStatus && checkinStatus !== 'all') {
    if (checkinStatus === 'pending') clauses.push("er.status = 'registered'")
    else if (['attended', 'absent', 'cancelled'].includes(checkinStatus)) {
      clauses.push('er.status = ?')
      params.push(checkinStatus)
    }
  }
  return { where: `WHERE ${clauses.join(' AND ')}`, params }
}

const registrationColumns = `
  er.id AS registrationId, er.event_id AS eventId, er.user_id AS userId,
  COALESCE(u.nickname, u.username, CONCAT('用户', er.user_id)) AS nickname,
  u.phone, u.email, er.status,
  CASE
    WHEN er.status = 'attended' THEN 'attended'
    WHEN er.status = 'absent' THEN 'absent'
    WHEN er.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END AS checkinStatus,
  COALESCE(er.registered_at, er.created_at) AS registeredAt,
  er.cancelled_at AS cancelledAt, er.attended_at AS attendedAt, er.absent_at AS absentAt
`

export async function listAdminEventRegistrations(eventId, query = {}) {
  const event = await findEventById(eventId)
  if (!event) return null
  const { page, pageSize, offset } = parsePagination(query, 10)
  const { where, params } = buildRegistrationFilters(eventId, query)
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM event_registrations er INNER JOIN users u ON u.id = er.user_id ${where}`,
    params,
  )
  const [rows] = await pool.query(
    `SELECT ${registrationColumns}
     FROM event_registrations er INNER JOIN users u ON u.id = er.user_id
     ${where}
     ORDER BY er.updated_at DESC, er.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { event, items: rows.map(normalizeRegistration), meta: { page, pageSize, total: Number(total) } }
}

export async function updateAdminEventRegistrationStatus(eventId, registrationId, payload = {}, operatorId = null) {
  const status = String(payload.status || '').trim()
  const reason = String(payload.reason || '').trim()
  if (!validRegistrationStatuses.has(status)) throw Object.assign(new Error('报名状态无效'), { statusCode: 400 })
  if (status === 'cancelled' && !reason) throw Object.assign(new Error('取消报名必须填写原因'), { statusCode: 400 })

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[event]] = await connection.execute(
      'SELECT id, title, status, event_date AS eventDate FROM events WHERE id = ? FOR UPDATE',
      [eventId],
    )
    if (!event) {
      await connection.rollback()
      return null
    }
    const [[registration]] = await connection.execute(
      `SELECT er.id, er.event_id AS eventId, er.user_id AS userId, er.status,
        COALESCE(u.nickname, u.username) AS nickname
       FROM event_registrations er INNER JOIN users u ON u.id = er.user_id
       WHERE er.id = ? AND er.event_id = ? FOR UPDATE`,
      [registrationId, eventId],
    )
    if (!registration) throw Object.assign(new Error('报名记录不存在或不属于该活动'), { statusCode: 404 })
    if (event.status === 'cancelled' && status !== 'cancelled') throw Object.assign(new Error('活动已取消，只能取消报名记录'), { statusCode: 409 })
    if (event.status === 'ended' && status === 'registered') throw Object.assign(new Error('活动已结束，不能恢复为已报名'), { statusCode: 409 })

    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const params = [status]
    if (status === 'registered') updates.push('registered_at = CURRENT_TIMESTAMP', 'cancelled_at = NULL', 'attended_at = NULL', 'absent_at = NULL')
    if (status === 'cancelled') updates.push('cancelled_at = CURRENT_TIMESTAMP')
    if (status === 'attended') updates.push('attended_at = CURRENT_TIMESTAMP', 'absent_at = NULL')
    if (status === 'absent') updates.push('absent_at = CURRENT_TIMESTAMP', 'attended_at = NULL')
    params.push(registrationId, eventId)
    await connection.execute(`UPDATE event_registrations SET ${updates.join(', ')} WHERE id = ? AND event_id = ?`, params)
    await connection.execute(
      `UPDATE events SET attendees = (
        SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'registered'
      ) WHERE id = ?`,
      [eventId, eventId],
    )
    await writeAudit(operatorId, 'event.registration.status.update', 'events', {
      id: eventId,
      eventId,
      registrationId,
      userId: registration.userId,
      from: registration.status,
      status,
      reason: reason || null,
      operatorType: 'admin',
    }, connection)
    if (['cancelled', 'attended', 'absent'].includes(status)) {
      const title = status === 'cancelled' ? '活动报名已取消' : status === 'attended' ? '活动签到已确认' : '活动缺席已记录'
      const content = status === 'cancelled'
        ? `你报名的活动《${event.title}》已由管理员取消。原因：${reason}`
        : `你报名的活动《${event.title}》状态已更新为 ${status === 'attended' ? '已参加' : '缺席'}${reason ? `。备注：${reason}` : ''}`
      await createNotification({ userId: registration.userId, title, content, type: 'event', relatedId: eventId, relatedType: 'event' }, connection)
    }
    await connection.commit()
    return listAdminEventRegistrations(eventId, { page: 1, pageSize: 1, keyword: registration.nickname })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function exportAdminEventRegistrations(eventId, query = {}, operatorId = null) {
  const event = await findEventById(eventId)
  if (!event) return null
  const { where, params } = buildRegistrationFilters(eventId, query)
  const [rows] = await pool.execute(
    `SELECT ${registrationColumns}, e.title AS eventTitle
     FROM event_registrations er
     INNER JOIN events e ON e.id = er.event_id
     INNER JOIN users u ON u.id = er.user_id
     ${where}
     ORDER BY er.updated_at DESC, er.id DESC`,
    params,
  )
  await writeAudit(operatorId, 'event.registration.export', 'events', {
    id: eventId,
    eventId,
    filters: query,
    count: rows.length,
    operatorType: 'admin',
  })
  const headers = ['活动名称', '用户昵称', '手机号', '邮箱', '报名状态', '签到状态', '报名时间']
  const lines = [headers.map(csvEscape).join(',')]
  rows.forEach((row) => {
    lines.push([
      row.eventTitle,
      row.nickname,
      row.phone,
      row.email,
      row.status,
      row.checkinStatus,
      row.registeredAt,
    ].map(csvEscape).join(','))
  })
  return `\uFEFF${lines.join('\n')}`
}

export async function listMyEventRegistrations(userId) {
  const [rows] = await pool.execute(`SELECT er.id AS registrationId, er.event_id AS eventId,
    er.status AS registrationStatus, er.created_at AS registeredAt, er.updated_at AS registrationUpdatedAt,
    e.id, e.slug, e.title, e.category, DATE_FORMAT(e.event_date, '%Y-%m-%d') AS date,
    e.event_time AS time, e.location, e.capacity, e.attendees, e.status, e.tone,
    e.summary, e.cover_url AS coverUrl, e.description, e.speaker, e.agenda
    FROM event_registrations er INNER JOIN events e ON e.id = er.event_id
    WHERE er.user_id = ? ORDER BY er.updated_at DESC, er.id DESC`, [userId])
  return rows.map(normalize)
}
