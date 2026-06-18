import { randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { createNotification } from './notifications.service.js'
import { createUser, findUserByIdentifier, normalizePhone, verifyCode } from './auth.service.js'
import { assertBookingDateAndTime } from './seats.service.js'

const spaceColumns = `
  id, slug, name, location, description, capacity, status,
  created_at AS createdAt, updated_at AS updatedAt
`

const bookingColumns = `
  b.id, b.booking_no AS bookingNo, b.user_id AS userId, b.space_id AS spaceId, s.slug AS spaceSlug,
  s.name AS space, b.slot_id AS slotId, b.seat_id AS seatId, st.code AS seatCode, st.name AS seatName,
  DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS date,
  COALESCE(b.time_slot, REPLACE(b.booking_time, ' ', '')) AS timeSlot, b.booking_time AS time,
  b.seat, b.people_count AS peopleCount, b.contact_name AS contactName, b.phone, b.note, b.status,
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
     LEFT JOIN seats st ON st.id = b.seat_id
     ${where}
     ORDER BY b.booking_date DESC, b.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows, meta: { page, pageSize, total: Number(countRows[0].total) } }
}

async function insertBooking(payload, userId, connection) {
    const timeSlot = assertBookingDateAndTime(payload.date, payload.timeSlot || payload.time)
    const peopleCount = Number(payload.peopleCount || 1)
    if (!Number.isInteger(peopleCount) || peopleCount < 1) throw Object.assign(new Error('请选择预约人数'), { statusCode: 400 })
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
    let seatId = Number(payload.seatId || 0)
    if (!seatId && payload.seat) {
      const [[legacySeat]] = await connection.execute('SELECT id FROM seats WHERE code = ? LIMIT 1', [payload.seat])
      seatId = Number(legacySeat?.id || 0)
    }
    if (!seatId) throw Object.assign(new Error('请选择座位'), { statusCode: 400 })
    const [[seat]] = await connection.execute('SELECT id, code, capacity, status FROM seats WHERE id = ? FOR UPDATE', [seatId])
    if (!seat) throw Object.assign(new Error('座位不存在'), { statusCode: 404 })
    if (seat.status === 'disabled') throw Object.assign(new Error('该座位已停用'), { statusCode: 409 })
    if (peopleCount > Number(seat.capacity)) throw Object.assign(new Error('预约人数超过座位容量'), { statusCode: 400 })
    const [reserved] = await connection.execute(`SELECT id FROM bookings
      WHERE seat_id = ? AND booking_date = ? AND COALESCE(time_slot, REPLACE(booking_time, ' ', '')) = ?
      AND status IN ('pending', 'confirmed') LIMIT 1 FOR UPDATE`, [seatId, payload.date, timeSlot])
    if (reserved.length) throw Object.assign(new Error('该座位在当前时段已被预约'), { statusCode: 409 })
    const bookingNo = `BK${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`
    const [result] = await connection.execute(
      `INSERT INTO bookings
        (booking_no, user_id, space_id, slot_id, seat_id, booking_date, booking_time, time_slot, seat, people_count, contact_name, phone, note, status)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        bookingNo,
        userId,
        space.id,
        seatId,
        payload.date,
        timeSlot,
        timeSlot,
        seat.code,
        peopleCount,
        payload.contactName,
        payload.phone,
        payload.note || null,
      ],
    )
    await writeAudit(userId, 'booking.create', 'bookings', { id: result.insertId, bookingNo, seatId, timeSlot }, connection)
    await createNotification({
      userId,
      title: '预约成功',
      content: `你已成功预约 ${payload.date} ${timeSlot} 的 Coffee Book 座位 ${seat.code}。`,
      type: 'booking',
      relatedId: result.insertId,
      relatedType: 'booking',
    }, connection)
    const [rows] = await connection.execute(
      `SELECT ${bookingColumns} FROM bookings b INNER JOIN spaces s ON s.id = b.space_id LEFT JOIN seats st ON st.id = b.seat_id WHERE b.id = ? LIMIT 1`,
      [result.insertId],
    )
    return rows[0]
}

export async function createBooking(payload, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[user]] = await connection.execute('SELECT phone, COALESCE(nickname, username) AS name FROM users WHERE id = ? AND status = ? LIMIT 1', [userId, 'active'])
    if (!user) throw Object.assign(new Error('当前用户不存在'), { statusCode: 404 })
    const booking = await insertBooking({ ...payload, phone: user.phone, contactName: user.name }, userId, connection)
    await connection.commit()
    return booking
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function createGuestBooking(payload) {
  const phone = normalizePhone(payload.phone)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await verifyCode(phone, 'booking_guest', payload.code, connection)
    let user = await findUserByIdentifier(phone, connection)
    let created = false
    if (!user) {
      user = await createUser({ phone, username: phone, nickname: `咖啡访客${phone.slice(-4)}`, password: randomUUID() }, connection)
      created = true
    }
    const booking = await insertBooking({ ...payload, contactName: payload.name || payload.contactName, phone }, user.id, connection)
    await connection.commit()
    return { booking, accountCreated: created, user: { id: user.id, nickname: user.nickname } }
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
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    throw Object.assign(new Error('预约状态无效'), { statusCode: 400 })
  }
  const [[before]] = await pool.execute('SELECT user_id AS userId FROM bookings WHERE id = ? LIMIT 1', [id])
  await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id])
  await writeAudit(operatorId, 'booking.status.update', 'bookings', { id, status })
  if (before?.userId) {
    await createNotification({
      userId: before.userId,
      title: '预约状态已更新',
      content: `你的预约状态已更新为：${status === 'pending' ? '待确认' : status === 'confirmed' ? '已确认' : status === 'cancelled' ? '已取消' : status === 'completed' ? '已完成' : status}。`,
      type: 'booking',
      relatedId: id,
      relatedType: 'booking',
    })
  }
  const [rows] = await pool.execute(
    `SELECT ${bookingColumns} FROM bookings b INNER JOIN spaces s ON s.id = b.space_id LEFT JOIN seats st ON st.id = b.seat_id WHERE b.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] || null
}
