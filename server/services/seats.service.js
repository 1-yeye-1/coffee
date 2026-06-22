import { pool } from '../db/mysql.js'
import { maskPhone } from './account.service.js'
import { writeAudit } from './admin.service.js'

export const allowedTimeSlots = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00']

export function normalizeTimeSlot(value) {
  return String(value || '').replace(/\s+/g, '')
}

export function assertBookingDateAndTime(date, timeSlot) {
  const value = String(date || '')
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today) {
    throw Object.assign(new Error('预约日期不能早于今天'), { statusCode: 400 })
  }
  const normalized = normalizeTimeSlot(timeSlot)
  if (!allowedTimeSlots.includes(normalized)) {
    throw Object.assign(new Error('预约时间段无效'), { statusCode: 400 })
  }
  return normalized
}

export async function listSeats() {
  const [rows] = await pool.execute(`SELECT id, code, name, area, capacity, x, y, width, height, status,
    sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
    FROM seats ORDER BY sort_order ASC, code ASC`)
  return rows
}

export async function getSeatAvailability(date, timeSlot, admin = false) {
  const normalized = assertBookingDateAndTime(date, timeSlot)
  const [rows] = await pool.execute(
    `SELECT s.id, s.code, s.name, s.area, s.capacity, s.x, s.y, s.width, s.height,
      s.sort_order AS sortOrder, s.status AS baseStatus,
      b.id AS bookingId, b.booking_no AS bookingNo, b.contact_name AS contactName,
      b.phone, b.people_count AS peopleCount, b.status AS bookingStatus,
      COALESCE(u.nickname, u.username) AS nickname
     FROM seats s
     LEFT JOIN bookings b ON b.seat_id = s.id AND b.booking_date = ?
       AND COALESCE(b.time_slot, REPLACE(b.booking_time, ' ', '')) = ?
       AND b.status IN ('pending', 'confirmed')
     LEFT JOIN users u ON u.id = b.user_id
     ORDER BY s.sort_order ASC, s.code ASC`,
    [date, normalized],
  )
  return rows.map((row) => {
    const status = ['disabled', 'maintenance'].includes(row.baseStatus) ? 'maintenance' : row.bookingId ? 'reserved' : 'available'
    const seat = { seatId: row.id, code: row.code, name: row.name, area: row.area, capacity: row.capacity, x: row.x, y: row.y, width: row.width, height: row.height, sortOrder: row.sortOrder, status }
    if (admin && row.bookingId) seat.bookingInfo = {
      id: row.bookingId, bookingNo: row.bookingNo, nickname: row.nickname || row.contactName,
      phoneMasked: maskPhone(row.phone), peopleCount: row.peopleCount, status: row.bookingStatus,
    }
    return seat
  })
}

function normalizeSeat(payload) {
  const seat = {
    code: String(payload.code || '').trim().toUpperCase(),
    name: String(payload.name || '').trim(),
    area: String(payload.area || '').trim() || null,
    capacity: Number(payload.capacity), x: Number(payload.x), y: Number(payload.y),
    width: Number(payload.width || 64), height: Number(payload.height || 52),
    sortOrder: Number(payload.sortOrder || 0), status: payload.status === 'disabled' ? 'maintenance' : payload.status || 'available',
  }
  if (!seat.code || !seat.name) throw Object.assign(new Error('座位编号和名称必填'), { statusCode: 400 })
  if (!Number.isInteger(seat.capacity) || seat.capacity < 1) throw Object.assign(new Error('座位容量无效'), { statusCode: 400 })
  if (![seat.x, seat.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw Object.assign(new Error('座位坐标必须在 0 到 100 之间'), { statusCode: 400 })
  if (!['available', 'maintenance'].includes(seat.status)) throw Object.assign(new Error('座位状态无效'), { statusCode: 400 })
  return seat
}

export async function createSeat(payload, operatorId) {
  const seat = normalizeSeat(payload)
  const [result] = await pool.execute(`INSERT INTO seats
    (code, name, area, capacity, x, y, width, height, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [seat.code, seat.name, seat.area, seat.capacity, seat.x, seat.y, seat.width, seat.height, seat.status, seat.sortOrder])
  await writeAudit(operatorId, 'seat.create', 'seats', { id: result.insertId, operatorType: 'admin' })
  return (await listSeats()).find((item) => Number(item.id) === Number(result.insertId))
}

export async function updateSeat(id, payload, operatorId) {
  const seat = normalizeSeat(payload)
  const [result] = await pool.execute(`UPDATE seats SET code=?, name=?, area=?, capacity=?, x=?, y=?, width=?, height=?, status=?, sort_order=? WHERE id=?`,
    [seat.code, seat.name, seat.area, seat.capacity, seat.x, seat.y, seat.width, seat.height, seat.status, seat.sortOrder, id])
  if (!result.affectedRows) return null
  await writeAudit(operatorId, 'seat.update', 'seats', { id, operatorType: 'admin' })
  return (await listSeats()).find((item) => Number(item.id) === Number(id))
}

export async function deleteSeat(id, operatorId) {
  const [[future]] = await pool.execute(`SELECT COUNT(*) AS total FROM bookings
    WHERE seat_id = ? AND booking_date >= CURRENT_DATE AND status IN ('pending', 'confirmed')`, [id])
  if (Number(future.total)) throw Object.assign(new Error('该座位存在未来预约，请改为停用'), { statusCode: 409 })
  const [result] = await pool.execute('DELETE FROM seats WHERE id = ?', [id])
  if (!result.affectedRows) return false
  await writeAudit(operatorId, 'seat.delete', 'seats', { id, operatorType: 'admin' })
  return true
}

export async function updateSeatStatus(id, status, operatorId) {
  const normalizedStatus = status === 'disabled' ? 'maintenance' : status
  if (!['available', 'maintenance'].includes(normalizedStatus)) throw Object.assign(new Error('座位状态无效'), { statusCode: 400 })
  const [result] = await pool.execute('UPDATE seats SET status = ? WHERE id = ?', [normalizedStatus, id])
  if (!result.affectedRows) return null
  await writeAudit(operatorId, 'seat.status.update', 'seats', { id, status: normalizedStatus, operatorType: 'admin' })
  const [[seat]] = await pool.execute('SELECT id, code, name, area, capacity, x, y, width, height, status, sort_order AS sortOrder FROM seats WHERE id = ?', [id])
  return seat
}
