import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { createNotification } from './notifications.service.js'

const validEventStatuses = new Set(['draft', 'published', 'ongoing', 'ended', 'cancelled'])

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
       ON DUPLICATE KEY UPDATE status = 'registered', updated_at = CURRENT_TIMESTAMP`,
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
      `UPDATE event_registrations SET status = 'cancelled'
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
