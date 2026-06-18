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
  const [rows] = await pool.execute(`SELECT id, code, name, area, capacity, x, y, status,
    created_at AS createdAt, updated_at AS updatedAt FROM seats ORDER BY code ASC`)
  return rows
}

export async function getSeatAvailability(date, timeSlot, admin = false) {
  const normalized = assertBookingDateAndTime(date, timeSlot)
  const [rows] = await pool.execute(
    `SELECT s.id, s.code, s.name, s.area, s.capacity, s.x, s.y, s.status AS baseStatus,
      b.id AS bookingId, b.booking_no AS bookingNo, b.contact_name AS contactName,
      b.phone, b.people_count AS peopleCount, b.status AS bookingStatus,
      COALESCE(u.nickname, u.username) AS nickname
     FROM seats s
     LEFT JOIN bookings b ON b.seat_id = s.id AND b.booking_date = ?
       AND COALESCE(b.time_slot, REPLACE(b.booking_time, ' ', '')) = ?
       AND b.status IN ('pending', 'confirmed')
     LEFT JOIN users u ON u.id = b.user_id
     ORDER BY s.code ASC`,
    [date, normalized],
  )
  return rows.map((row) => {
    const status = row.baseStatus === 'disabled' ? 'disabled' : row.bookingId ? 'reserved' : 'available'
    const seat = { seatId: row.id, code: row.code, name: row.name, area: row.area, capacity: row.capacity, x: row.x, y: row.y, status }
    if (admin && row.bookingId) seat.bookingInfo = {
      id: row.bookingId, bookingNo: row.bookingNo, nickname: row.nickname || row.contactName,
      phoneMasked: maskPhone(row.phone), peopleCount: row.peopleCount, status: row.bookingStatus,
    }
    return seat
  })
}

export async function updateSeatStatus(id, status, operatorId) {
  if (!['available', 'disabled'].includes(status)) throw Object.assign(new Error('座位状态无效'), { statusCode: 400 })
  const [result] = await pool.execute('UPDATE seats SET status = ? WHERE id = ?', [status, id])
  if (!result.affectedRows) return null
  await writeAudit(operatorId, 'seat.status.update', 'seats', { id, status, operatorType: 'admin' })
  const [[seat]] = await pool.execute('SELECT id, code, name, area, capacity, x, y, status FROM seats WHERE id = ?', [id])
  return seat
}
