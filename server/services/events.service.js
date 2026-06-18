import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'

const validEventStatuses = new Set(['draft', 'published', 'ongoing', 'ended', 'cancelled'])

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
    `SELECT ${columns} FROM events ${where} ORDER BY event_date ASC, id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows.map(normalize), meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function findEventBySlug(slug) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM events WHERE slug = ? AND status IN ('published', 'ongoing', 'open', 'active') LIMIT 1`, [slug])
  return normalize(rows[0])
}

export async function findEventById(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM events WHERE id = ? LIMIT 1`, [id])
  return normalize(rows[0])
}

export async function createEvent(payload) {
  assertEventStatus(payload.status || 'draft')
  const [result] = await pool.execute(
    `INSERT INTO events
      (slug, title, category, event_date, event_time, location, capacity, attendees, status,
       tone, cover_url, summary, description, speaker, agenda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.slug,
      payload.title,
      payload.category || '',
      payload.date,
      payload.time || '',
      payload.location || '',
      Number(payload.capacity) || 0,
      Number(payload.attendees) || 0,
      payload.status || 'draft',
      payload.tone || null,
      payload.coverUrl || null,
      payload.summary || null,
      payload.description || null,
      JSON.stringify(payload.speaker || null),
      JSON.stringify(payload.agenda || []),
    ],
  )
  return findEventById(result.insertId)
}

export async function updateEvent(id, payload) {
  assertEventStatus(payload.status || 'draft')
  await pool.execute(
    `UPDATE events SET slug=?, title=?, category=?, event_date=?, event_time=?, location=?,
      capacity=?, attendees=?, status=?, tone=?, cover_url=?, summary=?, description=?, speaker=?, agenda=?
     WHERE id=?`,
    [
      payload.slug,
      payload.title,
      payload.category || '',
      payload.date,
      payload.time || '',
      payload.location || '',
      Number(payload.capacity) || 0,
      Number(payload.attendees) || 0,
      payload.status || 'draft',
      payload.tone || null,
      payload.coverUrl || null,
      payload.summary || null,
      payload.description || null,
      JSON.stringify(payload.speaker || null),
      JSON.stringify(payload.agenda || []),
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
    const [events] = await connection.execute('SELECT id, capacity, attendees FROM events WHERE id = ? FOR UPDATE', [eventId])
    const event = events[0]
    if (!event) {
      await connection.rollback()
      return null
    }
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
    await connection.commit()
    return result.affectedRows > 0
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
