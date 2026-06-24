import { randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { recordAudit } from './audit.service.js'
import { createNotification } from './notifications.service.js'
import { createUser, findUserByIdentifier, normalizePhone } from './auth.service.js'
import { verifyCaptcha } from './captcha.service.js'
import { assertBookingDateAndTime, parseTimeSlotParts } from './seats.service.js'

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
  b.cancel_reason AS cancelReason, b.cancelled_at AS cancelledAt, b.completed_at AS completedAt,
  b.no_show_at AS noShowAt, b.status_updated_by AS statusUpdatedBy,
  COALESCE(u.nickname, u.username) AS userName, u.email AS userEmail,
  st.area AS seatArea, st.capacity AS seatCapacity,
  b.created_at AS createdAt, b.updated_at AS updatedAt
`

const adminBookingStatuses = new Set(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
const statusText = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
  no_show: '已爽约',
}
const transitions = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['completed', 'cancelled', 'no_show']),
  cancelled: new Set(),
  completed: new Set(),
  no_show: new Set(),
}

function formatLimitTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', { hour12: false })
}

async function assertUserCanBook(userId, connection) {
  const [[user]] = await connection.execute(
    'SELECT status, disabled_reason AS disabledReason, booking_limit_until AS bookingLimitUntil FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  if (!user || user.status !== 'active') {
    throw Object.assign(new Error(user?.disabledReason || '当前账号不可预约'), { statusCode: 403 })
  }
  if (user.bookingLimitUntil && new Date(user.bookingLimitUntil).getTime() > Date.now()) {
    throw Object.assign(new Error(`账号已被限制预约，恢复时间为 ${formatLimitTime(user.bookingLimitUntil)}`), { statusCode: 403 })
  }
}

function parseAuditPayload(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
}

function splitTimeSlot(value) {
  const { start, end } = parseTimeSlotParts(value)
  return { startTime: start || '', endTime: end || '' }
}

function mapBooking(row) {
  if (!row) return null
  return { ...row, ...splitTimeSlot(row.timeSlot || row.time), statusText: statusText[row.status] || row.status }
}

function assertAdminStatusTransition(current, next, reason = '') {
  if (!adminBookingStatuses.has(next)) throw Object.assign(new Error('预约状态无效'), { statusCode: 400 })
  if (current === next) throw Object.assign(new Error('预约已经是该状态'), { statusCode: 409 })
  if (!transitions[current]?.has(next)) {
    throw Object.assign(new Error(`预约状态不允许从${statusText[current] || current}变更为${statusText[next] || next}`), { statusCode: 409 })
  }
  if (next === 'cancelled' && !String(reason || '').trim()) {
    throw Object.assign(new Error('取消预约必须填写取消原因'), { statusCode: 400 })
  }
}

async function getBookingById(id, connection = pool, lock = false) {
  const sql = `SELECT ${bookingColumns} FROM bookings b
     INNER JOIN spaces s ON s.id = b.space_id
     LEFT JOIN seats st ON st.id = b.seat_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`
  const [rows] = await connection.execute(sql, [id])
  return mapBooking(rows[0])
}

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
  if (query.status && query.status !== 'all') {
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
     LEFT JOIN users u ON u.id = b.user_id
     ${where}
     ORDER BY b.booking_date ASC, b.id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows.map(mapBooking), meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function getBookingDetail(id) {
  const booking = await getBookingById(id)
  if (!booking) return null
  const [logs] = await pool.execute(
    `SELECT id, operator_id AS operatorId, operator_type AS operatorType,
      COALESCE(admin_name, user_name) AS operatorName, action, module,
      target_type AS targetType, target_id AS targetId, description, payload,
      created_at AS createdAt
     FROM audit_logs
     WHERE target_type = 'booking' AND target_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 30`,
    [String(id)],
  )
  return {
    ...booking,
    operationLogs: logs.map((log) => ({ ...log, payload: parseAuditPayload(log.payload) })),
  }
}

export async function getBookingAdminStats(query = {}) {
  const today = new Date()
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const date = String(query.date || todayText)
  const timeSlot = query.timeSlot ? String(query.timeSlot) : ''
  const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  const usageParams = timeSlot
    ? [date, splitTimeSlot(timeSlot).endTime, splitTimeSlot(timeSlot).startTime]
    : [todayText, nowTime, nowTime]
  const [[counts]] = await pool.execute(
    `SELECT
      SUM(CASE WHEN booking_date = CURRENT_DATE THEN 1 ELSE 0 END) AS todayBookings,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN booking_date = CURRENT_DATE AND status = 'cancelled' THEN 1 ELSE 0 END) AS todayCancelled,
      SUM(CASE WHEN booking_date = CURRENT_DATE AND status = 'confirmed'
        AND SUBSTRING_INDEX(COALESCE(time_slot, REPLACE(booking_time, ' ', '')), '-', 1) <= DATE_FORMAT(NOW(), '%H:%i')
        AND SUBSTRING_INDEX(COALESCE(time_slot, REPLACE(booking_time, ' ', '')), '-', -1) > DATE_FORMAT(NOW(), '%H:%i')
      THEN 1 ELSE 0 END) AS currentUsing
     FROM bookings`,
  )
  const [[seatCounts]] = await pool.execute(
    `SELECT
      SUM(CASE WHEN s.status IN ('disabled','maintenance') THEN 1 ELSE 0 END) AS maintenance,
      SUM(CASE WHEN s.status NOT IN ('disabled','maintenance') THEN 1 ELSE 0 END) AS usable,
      SUM(CASE WHEN s.status NOT IN ('disabled','maintenance') AND b.id IS NOT NULL THEN 1 ELSE 0 END) AS reserved
     FROM seats s
     LEFT JOIN bookings b ON b.seat_id = s.id AND b.booking_date = ?
       AND SUBSTRING_INDEX(COALESCE(b.time_slot, REPLACE(b.booking_time, ' ', '')), '-', 1) < ?
       AND SUBSTRING_INDEX(COALESCE(b.time_slot, REPLACE(b.booking_time, ' ', '')), '-', -1) > ?
       AND b.status IN ('pending', 'confirmed')`,
    usageParams,
  )
  const usable = Number(seatCounts.usable || 0)
  const reserved = Number(seatCounts.reserved || 0)
  return {
    todayBookings: Number(counts.todayBookings || 0),
    pending: Number(counts.pending || 0),
    currentUsing: Number(counts.currentUsing || 0),
    todayCancelled: Number(counts.todayCancelled || 0),
    seatUsageRate: usable ? Math.round((reserved / usable) * 100) : 0,
    seats: {
      available: Math.max(usable - reserved, 0),
      reserved,
      maintenance: Number(seatCounts.maintenance || 0),
      total: usable + Number(seatCounts.maintenance || 0),
    },
  }
}

async function insertBooking(payload, userId, connection) {
    await assertUserCanBook(userId, connection)
    const timeSlot = assertBookingDateAndTime(payload.date, payload.timeSlot || payload.time)
    const { start, end } = parseTimeSlotParts(timeSlot)
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
    if (['disabled', 'maintenance'].includes(seat.status)) throw Object.assign(new Error('该座位正在维护'), { statusCode: 409 })
    if (peopleCount > Number(seat.capacity)) throw Object.assign(new Error('预约人数超过座位容量'), { statusCode: 400 })
    const [reserved] = await connection.execute(`SELECT id FROM bookings
      WHERE seat_id = ? AND booking_date = ?
      AND SUBSTRING_INDEX(COALESCE(time_slot, REPLACE(booking_time, ' ', '')), '-', 1) < ?
      AND SUBSTRING_INDEX(COALESCE(time_slot, REPLACE(booking_time, ' ', '')), '-', -1) > ?
      AND status IN ('pending', 'confirmed') LIMIT 1 FOR UPDATE`, [seatId, payload.date, end, start])
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
    return getBookingById(result.insertId, connection)
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
  await verifyCaptcha(payload.captchaId, payload.captchaCode)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
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
      `UPDATE bookings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
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
  return updateBookingStatusAdmin(id, { status }, { id: operatorId })
}

export async function updateBookingStatusAdmin(id, payload, admin = {}, req = null) {
  const nextStatus = String(payload.status || '').trim()
  const reason = String(payload.reason || '').trim()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const before = await getBookingById(id, connection, true)
    if (!before) {
      await connection.rollback()
      return null
    }
    assertAdminStatusTransition(before.status, nextStatus, reason)
    const sets = ['status = ?', 'status_updated_by = ?']
    const params = [nextStatus, admin.id || null]
    if (nextStatus === 'cancelled') {
      sets.push('cancel_reason = ?', 'cancelled_at = CURRENT_TIMESTAMP')
      params.push(reason)
    }
    if (nextStatus === 'completed') sets.push('completed_at = CURRENT_TIMESTAMP')
    if (nextStatus === 'no_show') sets.push('no_show_at = CURRENT_TIMESTAMP')
    params.push(id)
    await connection.execute(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`, params)
    const after = await getBookingById(id, connection)
    const auditPayload = {
      id: Number(id),
      bookingNo: before.bookingNo,
      fromStatus: before.status,
      toStatus: nextStatus,
      userId: before.userId,
      userName: before.userName || before.contactName,
      seatId: before.seatId,
      seatCode: before.seatCode || before.seat,
      date: before.date,
      timeSlot: before.timeSlot,
      reason: reason || null,
      changedAt: new Date().toISOString(),
    }
    await recordAudit({
      operatorId: admin.id,
      operatorType: 'admin',
      actor: admin,
      action: nextStatus === 'cancelled' ? 'booking.cancel' : nextStatus === 'no_show' ? 'booking.no_show' : 'booking.status.update',
      module: 'booking',
      targetType: 'booking',
      targetId: id,
      description: `后台将预约 ${before.bookingNo} 从${statusText[before.status] || before.status}改为${statusText[nextStatus] || nextStatus}${reason ? `，原因：${reason}` : ''}`,
      payload: auditPayload,
      req,
      connection,
    })
    if (nextStatus === 'cancelled') {
      await createNotification({
        userId: before.userId,
        title: '预约已取消',
        content: `你的预约 ${before.bookingNo}（${before.date} ${before.timeSlot}）已被后台取消。原因：${reason}`,
        type: 'booking',
        relatedId: id,
        relatedType: 'booking',
      }, connection)
    } else {
      await createNotification({
        userId: before.userId,
        title: '预约状态已更新',
        content: `你的预约 ${before.bookingNo} 状态已更新为：${statusText[nextStatus] || nextStatus}。`,
        type: 'booking',
        relatedId: id,
        relatedType: 'booking',
      }, connection)
    }
    await connection.commit()
    return after
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function batchUpdateBookingStatus(ids = [], payload, admin = {}, req = null) {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter(Boolean))]
  if (!uniqueIds.length) throw Object.assign(new Error('请选择预约'), { statusCode: 400 })
  const results = []
  const errors = []
  for (const id of uniqueIds) {
    try {
      results.push(await updateBookingStatusAdmin(id, payload, admin, req))
    } catch (error) {
      errors.push({ id, message: error.message })
    }
  }
  return { updated: results.filter(Boolean), errors }
}
