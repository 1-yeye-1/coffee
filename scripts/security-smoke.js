import { spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'

import { env } from '../server/config/env.js'
import { pool } from '../server/db/mysql.js'
import { hashPassword } from '../server/utils/crypto.js'
import { signAdminToken, signUserToken } from '../server/utils/jwt.js'

const baseURL = String(process.env.SECURITY_SMOKE_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 4173}/api`).replace(/\/$/, '')
const rootURL = baseURL.replace(/\/api$/, '')
const marker = `security-${Date.now()}`
const phoneA = `176${String(Date.now()).slice(-8)}`
const phoneB = `177${String(Date.now()).slice(-8)}`
let serverProcess = null
let userA = null
let userB = null
let admin = null
let orderId = null
let bookingId = null
let eventId = null
let seatId = null
let postId = null

function logPass(name) {
  console.log(`PASS ${name}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(method, path, { token, body, formData, expectedStatus, raw = false, headers = {} } = {}) {
  const requestHeaders = { ...headers }
  if (token) requestHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json'
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: requestHeaders,
    body: formData || (body === undefined ? undefined : JSON.stringify(body)),
  })
  const payload = raw ? await response.text() : await response.json().catch(() => null)
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected ${expectedStatus}, got ${response.status} ${payload?.message || payload || ''}`)
  }
  if (!expectedStatus && (!response.ok || (!raw && payload?.code !== 0))) {
    throw new Error(`${method} ${path} failed: ${response.status} ${payload?.message || payload || ''}`)
  }
  return { response, payload }
}

async function waitForHealth() {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/health`)
      if (response.ok) return true
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

async function ensureServer() {
  if (await waitForHealth()) return
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  serverProcess.stdout.on('data', (chunk) => process.stdout.write(chunk))
  serverProcess.stderr.on('data', (chunk) => process.stderr.write(chunk))
  if (!await waitForHealth()) throw new Error('API server did not become ready for security smoke')
}

async function cleanup() {
  await pool.query('DELETE FROM audit_logs WHERE description LIKE ? OR JSON_EXTRACT(payload, "$.marker") = ?', [`%${marker}%`, JSON.stringify(marker)]).catch(() => {})
  if (postId) await pool.query('DELETE FROM posts WHERE id = ?', [postId]).catch(() => {})
  await pool.query('DELETE FROM posts WHERE slug LIKE ?', [`${marker}%`]).catch(() => {})
  if (eventId) await pool.query('DELETE FROM events WHERE id = ?', [eventId]).catch(() => {})
  await pool.query('DELETE FROM events WHERE slug LIKE ?', [`${marker}%`]).catch(() => {})
  if (bookingId) await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId]).catch(() => {})
  if (orderId) await pool.query('DELETE FROM orders WHERE id = ?', [orderId]).catch(() => {})
  if (seatId) await pool.query('DELETE FROM seats WHERE id = ?', [seatId]).catch(() => {})
  const [users] = await pool.query('SELECT id FROM users WHERE phone IN (?, ?)', [phoneA, phoneB]).catch(() => [[]])
  const ids = users.map((row) => row.id)
  if (ids.length) {
    await pool.query('DELETE FROM bookings WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM orders WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM event_registrations WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM comments WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM posts WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM user_notifications WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM user_points WHERE user_id IN (?)', [ids]).catch(() => {})
    await pool.query('DELETE FROM users WHERE id IN (?)', [ids]).catch(() => {})
  }
}

async function setupData() {
  const passwordHash = await hashPassword('SecuritySmoke123!')
  const [userAResult] = await pool.execute(
    `INSERT INTO users (username, nickname, phone, email, password_hash, role, status, points, level)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', 0, '普通会员')`,
    [`${marker}-a`, `${marker}-用户A`, phoneA, `${marker}-a@example.test`, passwordHash],
  )
  const [userBResult] = await pool.execute(
    `INSERT INTO users (username, nickname, phone, email, password_hash, role, status, points, level)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', 0, '普通会员')`,
    [`${marker}-b`, `${marker}-用户B`, phoneB, `${marker}-b@example.test`, passwordHash],
  )
  userA = { id: userAResult.insertId, phone: phoneA, status: 'active' }
  userB = { id: userBResult.insertId, phone: phoneB, status: 'active' }

  const [[adminRow]] = await pool.execute("SELECT id, username, phone, status FROM admin_users WHERE status = 'active' ORDER BY id LIMIT 1")
  assert(adminRow, 'active admin account is required for security smoke')
  admin = adminRow

  const [[space]] = await pool.execute("SELECT id FROM spaces WHERE status = 'active' ORDER BY id LIMIT 1")
  assert(space, 'active space is required for security smoke')

  const [seatResult] = await pool.execute(
    `INSERT INTO seats (code, name, area, capacity, x, y, width, height, status, sort_order, maintenance_reason)
     VALUES (?, ?, 'security', 2, 0, 0, 64, 52, 'maintenance', 9999, 'security smoke')`,
    [`SEC-${Date.now()}`, `${marker}-seat`],
  )
  seatId = seatResult.insertId

  const [bookingResult] = await pool.execute(
    `INSERT INTO bookings (booking_no, user_id, space_id, seat_id, booking_date, booking_time, time_slot, seat, people_count, contact_name, phone, status)
     VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), '10:00-11:00', '10:00-11:00', 'SEC', 1, 'Security User B', ?, 'confirmed')`,
    [`SEC-BK-${Date.now()}`, userB.id, space.id, seatId, phoneB],
  )
  bookingId = bookingResult.insertId

  const [orderResult] = await pool.execute(
    `INSERT INTO orders (order_no, user_id, delivery_type, payment_method, total_amount, status, receiver_name, receiver_phone)
     VALUES (?, ?, 'pickup', 'wechat', 10.00, 'cancelled', 'Security User B', ?)`,
    [`SEC-ORDER-${Date.now()}`, userB.id, phoneB],
  )
  orderId = orderResult.insertId

  const [eventResult] = await pool.execute(
    `INSERT INTO events (slug, title, category, event_date, event_time, location, capacity, attendees, status, summary)
     VALUES (?, ?, 'security', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), '10:00', 'Security Room', 0, 0, 'published', 'security smoke')`,
    [`${marker}-event`, `${marker}-full-event`],
  )
  eventId = eventResult.insertId
}

function userToken(user) {
  return signUserToken(user)
}

function adminToken() {
  return signAdminToken(admin)
}

function dangerousForm(filename, mime = 'application/octet-stream') {
  const form = new FormData()
  form.append('file', new Blob(['<?php echo "blocked"; ?>'], { type: mime }), filename)
  return form
}

function assertNoVHtml() {
  try {
    const output = execFileSync('rg', ['-n', 'v-html|innerHTML|outerHTML|insertAdjacentHTML', 'apps/web/src', 'apps/admin/src'], { encoding: 'utf8' })
    throw new Error(`dangerous frontend HTML rendering found:\n${output}`)
  } catch (error) {
    if (error.status === 1) return
    throw error
  }
}

async function main() {
  await ensureServer()
  await cleanup()
  await setupData()

  const tokenA = userToken(userA)
  const tokenB = userToken(userB)
  const admToken = adminToken()

  const health = await request('GET', '/health')
  assert(health.response.headers.get('x-content-type-options') === 'nosniff', 'missing X-Content-Type-Options')
  assert(health.response.headers.get('x-frame-options') === 'DENY', 'missing X-Frame-Options')
  assert(Boolean(health.response.headers.get('content-security-policy')), 'missing Content-Security-Policy')
  logPass('security headers')

  const corsDenied = await request('GET', '/health', { expectedStatus: 403, headers: { Origin: 'https://evil.example' } })
  assert(corsDenied.payload?.message?.includes('CORS'), 'CORS denial message missing')
  logPass('cors rejects untrusted origin')

  await request('GET', '/account/overview', { expectedStatus: 401 })
  logPass('unauthenticated user endpoint rejected')

  await request('GET', '/admin/dashboard', { token: tokenA, expectedStatus: 403 })
  logPass('ordinary user cannot access admin API')

  await request('GET', `/orders/${orderId}`, { token: tokenA, expectedStatus: 404 })
  logPass('ordinary user cannot view another user order')

  await request('DELETE', `/bookings/${bookingId}`, { token: tokenA, expectedStatus: 404 })
  const [[bookingAfter]] = await pool.execute('SELECT status FROM bookings WHERE id = ?', [bookingId])
  assert(bookingAfter.status === 'confirmed', 'other user booking was modified')
  logPass('ordinary user cannot cancel another user booking')

  await request('PATCH', '/account/profile', { token: tokenA, body: { id: userB.id, nickname: `${marker}-changed` } })
  const [[otherUser]] = await pool.execute('SELECT nickname FROM users WHERE id = ?', [userB.id])
  assert(otherUser.nickname !== `${marker}-changed`, 'profile update changed another user')
  logPass('ordinary user cannot modify another user profile')

  await request('POST', '/auth/login', {
    body: { username: "' OR '1'='1", password: "' OR '1'='1" },
    expectedStatus: 401,
  })
  await request('GET', "/products?keyword=' OR 1=1 --")
  logPass('sql injection payloads do not bypass auth or crash public search')

  assertNoVHtml()
  const postCreate = await request('POST', '/posts', {
    token: tokenA,
    body: { title: '<img src=x onerror=alert(1)>', content: '<script>alert(1)</script>' },
  })
  postId = postCreate.payload.data.id
  assert(postCreate.payload.data.title.includes('<img'), 'xss payload storage test did not exercise content path')
  logPass('xss rendering surface avoids unsafe frontend HTML APIs')

  for (const [filename, mime] of [
    ['shell.php', 'application/x-php'],
    ['script.js', 'application/javascript'],
    ['page.html', 'text/html'],
    ['image.svg', 'image/svg+xml'],
    ['avatar.php.jpg', 'image/jpeg'],
  ]) {
    await request('POST', '/upload/avatar', { token: tokenA, formData: dangerousForm(filename, mime), expectedStatus: 400 })
  }
  logPass('dangerous upload extensions rejected')

  await request('DELETE', '/upload/files/%2e%2e%2f.env', { token: admToken, expectedStatus: 404 })
  logPass('path traversal upload delete rejected')

  await pool.execute('UPDATE users SET booking_limit_until = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?', [userA.id])
  await request('POST', '/bookings', {
    token: tokenA,
    body: { date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), timeSlot: '12:00-13:00', seatId, peopleCount: 1 },
    expectedStatus: 403,
  })
  await pool.execute('UPDATE users SET booking_limit_until = NULL WHERE id = ?', [userA.id])
  logPass('booking risk limit enforced server-side')

  await pool.execute('UPDATE users SET post_limit_until = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?', [userA.id])
  await request('POST', '/posts', {
    token: tokenA,
    body: { title: `${marker}-blocked-post`, content: 'blocked by risk control' },
    expectedStatus: 403,
  })
  await pool.execute('UPDATE users SET post_limit_until = NULL WHERE id = ?', [userA.id])
  logPass('community post risk limit enforced server-side')

  await request('POST', '/bookings', {
    token: tokenA,
    body: { date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), timeSlot: '14:30-16:00', seatId, peopleCount: 1 },
    expectedStatus: 409,
  })
  logPass('maintenance seat cannot be booked')

  await request('POST', `/events/${eventId}/register`, { token: tokenA, expectedStatus: 409 })
  logPass('full event cannot be over-registered')

  await request('PATCH', `/orders/${orderId}/complete`, { token: tokenB, expectedStatus: 400 })
  logPass('cancelled order cannot illegally transition')

  await request('GET', `/admin/events/${eventId}/registrations/export`, { token: tokenA, expectedStatus: 403, raw: false })
  logPass('ordinary user cannot access admin export')

  const missing = await fetch(`${rootURL}/.env`)
  assert([404, 403].includes(missing.status), '.env should not be served statically')
  logPass('.env not statically exposed')

  const notFound = await request('GET', '/__security_missing__', { expectedStatus: 404 })
  assert(!/stack|at\s+\w+\s+\(/i.test(JSON.stringify(notFound.payload)), 'error response leaked stack')
  logPass('error response does not expose stack')

  const [[audit]] = await pool.execute(
    "SELECT id FROM audit_logs WHERE operator_id = ? AND action = 'post.create' ORDER BY id DESC LIMIT 1",
    [userA.id],
  )
  assert(audit, 'post create audit log missing')
  logPass('critical action audit log exists')

  await cleanup()
  console.log('Security smoke passed')
}

main()
  .catch(async (error) => {
    console.error(`Security smoke failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup().catch(() => {})
    await pool.end().catch(() => {})
    if (serverProcess) serverProcess.kill('SIGTERM')
  })
