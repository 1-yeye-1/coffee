import { randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { createNotification } from './notifications.service.js'

const spaceColumns = `
  id, slug, name, location, description, capacity, status,
  created_at AS createdAt, updated_at AS updatedAt
`

const bookingColumns = `
  b.id, b.booking_no AS bookingNo, b.user_id AS userId, b.space_id AS spaceId, s.slug AS spaceSlug,
  s.name AS space, b.slot_id AS slotId, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS date,
  b.booking_time AS time, b.seat, b.contact_name AS contactName, b.phone, b.note, b.status,
  b.created_at AS createdAt, b.updated_at AS updatedAt
`

export async function listSpaces() {
  const [rows] = await pool.execute(`SELECT ${spaceColumns} FROM spaces WHERE status = 'active' ORDER BY id ASC`)
  return rows
}

export async function findSpaceBySlug(slug) {
  const [rows] = await pool.execute(`SELECT ${spaceColumns} FROM spaces WHERE slug = ? LIMIT 1`, [slug])
  return rows[0] || null
}

export async function listSpaceSlots(slug) {
  const [rows] = await pool.execute(
    `SELECT bs.id, bs.space_id AS spaceId, DATE_FORMAT(bs.slot_date, '%Y-%m-%d') AS date,
      bs.slot_time AS time, bs.capacity, bs.status,
      GREATEST(bs.capacity - COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END), 0) AS remaining
     FROM booking_slots bs
     INNER JOIN spaces s ON s.id = bs.space_id
     LEFT JOIN bookings b ON b.slot_id = bs.id
     WHERE s.slug = ? AND bs.slot_date >= CURRENT_DATE
     GROUP BY bs.id
     ORDER BY bs.slot_date ASC, bs.id ASC`,
    [slug],
  )
  return rows
}

export async function listBookings(query = {}, admin = false, userId = null) {
  const { page, pageSize, offset } = parsePagination(query)
  const clauses = []
  const params = []
  if (!admin) {
    clauses.push('b.user_id = ?')
    params.push(userId)
  }
  if (query.status) {
    clauses.push('b.status = ?')
    params.push(query.status)
  }
  if (query.phone) {
    clauses.push('b.phone LIKE ?')
    params.push(`%${query.phone}%`)
  }
  if (query.date) {
    clauses.push('b.booking_date = ?')
    params.push(query.date)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM bookings b ${where}`, params)
  const [rows] = await pool.query(
    `SELECT ${bookingColumns} FROM bookings b
     INNER JOIN spaces s ON s.id = b.space_id
     ${where}
     ORDER BY b.booking_date DESC, b.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows, meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function createBooking(payload, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [spaces] = await connection.execute('SELECT id FROM spaces WHERE slug = ? AND status = ? LIMIT 1', [
      payload.spaceSlug || 'city-reading-room',
      'active',
    ])
    const space = spaces[0]
    if (!space) {
      const error = new Error('空间不存在')
      error.statusCode = 404
      throw error
    }
    const [slots] = await connection.execute(
      `SELECT id, capacity FROM booking_slots
       WHERE space_id = ? AND slot_date = ? AND slot_time = ? AND status = 'open'
       LIMIT 1 FOR UPDATE`,
      [space.id, payload.date, payload.time],
    )
    const slot = slots[0]
    if (!slot) {
      const error = new Error('预约时段不存在')
      error.statusCode = 404
      throw error
    }
    const [reserved] = await connection.execute(
      `SELECT COUNT(*) AS total FROM bookings WHERE slot_id = ? AND status = 'confirmed'`,
      [slot.id],
    )
    if (Number(reserved[0].total) >= Number(slot.capacity)) {
      const error = new Error('该时段预约已满')
      error.statusCode = 409
      throw error
    }
    const bookingNo = `BK${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`
    const [result] = await connection.execute(
      `INSERT INTO bookings
        (booking_no, user_id, space_id, slot_id, booking_date, booking_time, seat, contact_name, phone, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        bookingNo,
        userId,
        space.id,
        slot.id,
        payload.date,
        payload.time,
        payload.seat || null,
        payload.contactName,
        payload.phone,
        payload.note || null,
      ],
    )
    await writeAudit(userId, 'booking.create', 'bookings', { id: result.insertId, bookingNo }, connection)
    await createNotification({
      userId,
      title: '预约成功',
      content: `你已成功预约 ${payload.date} ${payload.time} 的 Coffee Book 空间。`,
      type: 'booking',
      relatedId: result.insertId,
      relatedType: 'booking',
    }, connection)
    await connection.commit()
    const [rows] = await pool.execute(
      `SELECT ${bookingColumns} FROM bookings b INNER JOIN spaces s ON s.id = b.space_id WHERE b.id = ? LIMIT 1`,
      [result.insertId],
    )
    return rows[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function cancelBooking(id, userId, admin = false) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const params = admin ? [id] : [id, userId]
    const [result] = await connection.execute(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = ? ${admin ? '' : 'AND user_id = ?'} AND status <> 'cancelled'`,
      params,
    )
    await writeAudit(userId, 'booking.cancel', 'bookings', { id }, connection)
    await connection.commit()
    return result.affectedRows > 0
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function updateBookingStatus(id, status, operatorId) {
  const [[before]] = await pool.execute('SELECT user_id AS userId FROM bookings WHERE id = ? LIMIT 1', [id])
  await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id])
  await writeAudit(operatorId, 'booking.status.update', 'bookings', { id, status })
  if (before?.userId) {
    await createNotification({
      userId: before.userId,
      title: '预约状态已更新',
      content: `你的预约状态已更新为：${status === 'confirmed' ? '已确认' : status === 'cancelled' ? '已取消' : status === 'arrived' ? '已到店' : status}。`,
      type: 'booking',
      relatedId: id,
      relatedType: 'booking',
    })
  }
  const [rows] = await pool.execute(
    `SELECT ${bookingColumns} FROM bookings b INNER JOIN spaces s ON s.id = b.space_id WHERE b.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] || null
}
