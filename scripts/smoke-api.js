import { pool } from '../server/db/mysql.js'

import { env } from '../server/config/env.js'

const baseURL = String(process.env.SMOKE_API_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 4173}/api`).replace(/\/$/, '')
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin'
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123456'
const stamp = Date.now()
const smokePhone = `139${String(stamp).slice(-8)}`
const guestPhone = `181${String(stamp + 1).slice(-8)}`
const createdPostSlugs = []
const createdSeatIds = []
const createdEventIds = []

function logPass(name) {
  console.log(`PASS ${name}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(method, path, { token, body, expectedStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected ${expectedStatus}, got ${response.status} ${payload?.message || ''}`)
  }
  if (!expectedStatus && (!response.ok || payload?.code !== 0)) {
    throw new Error(`${method} ${path} failed: ${response.status} ${payload?.message || ''}`)
  }
  return { response, payload }
}

async function cleanup() {
  await pool.query('DELETE FROM verification_codes WHERE phone IN (?, ?)', [smokePhone, guestPhone])
  if (createdPostSlugs.length) await pool.query('DELETE FROM posts WHERE slug IN (?)', [createdPostSlugs])
  if (createdSeatIds.length) await pool.query('DELETE FROM seats WHERE id IN (?)', [createdSeatIds])
  if (createdEventIds.length) await pool.query('DELETE FROM events WHERE id IN (?)', [createdEventIds])
  const [users] = await pool.query('SELECT id FROM users WHERE phone IN (?, ?)', [smokePhone, guestPhone])
  const userIds = users.map((row) => row.id)
  if (userIds.length) {
    const [orders] = await pool.query('SELECT id FROM orders WHERE user_id IN (?)', [userIds])
    const orderIds = orders.map((row) => row.id)
    if (orderIds.length) await pool.query('DELETE FROM orders WHERE id IN (?)', [orderIds])
    await pool.query('DELETE FROM bookings WHERE user_id IN (?)', [userIds])
    await pool.query('DELETE FROM post_likes WHERE user_id IN (?)', [userIds])
    await pool.query('DELETE FROM event_registrations WHERE user_id IN (?)', [userIds])
    await pool.query('DELETE FROM carts WHERE user_id IN (?)', [userIds])
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds])
  }
}

async function main() {
  await cleanup()

  const health = await request('GET', '/health')
  assert(health.payload.data.database === env.db.name, `health database should be ${env.db.name}`)
  logPass('health')

  const [admins] = await pool.query('SELECT id, username, status FROM admin_users WHERE username = ?', [adminUsername])
  assert(admins[0]?.status === 'active', 'default admin should exist in admin_users')
  logPass('admin_users default admin')

  const [mixedAdmins] = await pool.query("SELECT id FROM users WHERE (username = 'admin' OR phone = '13800000000') AND role = 'admin'")
  assert(mixedAdmins.length === 0, 'users table should not contain backend admin accounts')
  logPass('users admin separated')

  const frontAdminLogin = await request('POST', '/auth/login', {
    body: { username: adminUsername, password: adminPassword },
    expectedStatus: 401,
  })
  assert(frontAdminLogin.payload.code === 401, 'frontend login should not accept backend admin')
  logPass('frontend rejects admin login')

  const adminLogin = await request('POST', '/admin/auth/login', {
    body: { username: adminUsername, password: adminPassword },
  })
  const adminToken = adminLogin.payload.data.token
  assert(adminToken && adminLogin.payload.data.admin.username === adminUsername, 'admin token missing')
  logPass('admin login')

  const adminMe = await request('GET', '/admin/auth/me', { token: adminToken })
  assert(adminMe.payload.data.username === adminUsername, 'admin/auth/me should return admin')
  logPass('admin/auth/me')

  await request('GET', '/admin/dashboard', { token: adminToken })
  logPass('admin dashboard')

  const dashboardSummary = await request('GET', '/admin/dashboard/summary', { token: adminToken })
  assert(Number.isFinite(dashboardSummary.payload.data.users), 'dashboard summary must be database aggregates')
  const dashboardTrends = await request('GET', '/admin/dashboard/trends', { token: adminToken })
  assert(dashboardTrends.payload.data.orders.length === 7, 'dashboard trends must contain seven database-backed days')
  const dashboardRecent = await request('GET', '/admin/dashboard/recent', { token: adminToken })
  assert(Array.isArray(dashboardRecent.payload.data.orders), 'dashboard recent orders missing')
  const finance = await request('GET', '/admin/dashboard/finance', { token: adminToken })
  assert(Array.isArray(finance.payload.data.trends) && Number.isFinite(finance.payload.data.summary.totalSales), 'finance aggregation invalid')
  logPass('dashboard and finance database aggregates')

  const adminSearch = await request('GET', '/admin/search?keyword=小王子', { token: adminToken })
  assert(Array.isArray(adminSearch.payload.data.books), 'admin search books missing')
  logPass('admin realtime search')

  const adminOrdersDenied = await request('GET', '/orders', { token: adminToken, expectedStatus: 401 })
  assert([401, 403].includes(adminOrdersDenied.payload.code), 'admin token should not access user orders')
  logPass('admin token blocked from user orders')

  const registerCode = await request('POST', '/auth/send-code', {
    body: { phone: smokePhone, scene: 'register' },
  })
  assert(!registerCode.payload.data.devCode, 'verification code must not be returned to frontend')
  const smokeCode = '123456'
  const { hashPassword } = await import('../server/utils/crypto.js')
  await pool.query(
    `UPDATE verification_codes SET code_hash = ?
     WHERE phone = ? AND scene = 'register'
     ORDER BY id DESC LIMIT 1`,
    [await hashPassword(smokeCode), smokePhone],
  )
  logPass('send register code')

  const register = await request('POST', '/auth/register', {
    body: {
      phone: smokePhone,
      password: 'smoke123456',
      confirmPassword: 'smoke123456',
      code: smokeCode,
      nickname: 'Smoke User',
    },
  })
  assert(register.payload.data.token, 'register token missing')
  logPass('phone register')

  const userLogin = await request('POST', '/auth/login', {
    body: { phone: smokePhone, password: 'smoke123456' },
  })
  const userToken = userLogin.payload.data.token
  assert(userToken, 'user token missing')
  logPass('phone login')

  const adminUserLogin = await request('POST', '/admin/auth/login', {
    body: { phone: smokePhone, password: 'smoke123456' },
    expectedStatus: 401,
  })
  assert(adminUserLogin.payload.code === 401, 'backend login should not accept normal user')
  logPass('admin login rejects user')

  const forbidden = await request('GET', '/admin/dashboard', { token: userToken, expectedStatus: 403 })
  assert(forbidden.payload.code === 403, 'normal user should receive 403 for admin dashboard')
  logPass('user token blocked from admin')

  const me = await request('GET', '/auth/me', { token: userToken })
  assert(me.payload.data.phone === smokePhone, 'auth/me should return normal user')
  logPass('auth/me')

  const presetAvatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#6f4e37"/></svg>')}`
  await request('POST', '/users/me/avatar/select', { token: userToken, body: { avatarUrl: presetAvatar } })
  const avatars = await request('GET', '/users/me/avatars', { token: userToken })
  assert(avatars.payload.data.length === 1 && avatars.payload.data[0].isCurrent, 'avatar history/current state invalid')
  await request('POST', `/users/me/avatar/history/${avatars.payload.data[0].id}/use`, { token: userToken })
  logPass('avatar preset and history flow')

  const notifications = await request('GET', '/account/notifications', { token: userToken })
  assert(Array.isArray(notifications.payload.data), 'notifications should return list')
  logPass('notifications list')

  const books = await request('GET', '/books?page=1&pageSize=3')
  assert(books.payload.data.length > 0, 'books list empty')
  logPass('books list')

  const products = await request('GET', '/products?page=1&pageSize=5')
  const product = products.payload.data.find((item) => Number(item.stock) > 1)
  assert(product, 'no product with stock for smoke test')
  logPass('products list')

  const recommendations = await request('GET', `/products/recommendations?limit=3&exclude=${product.id}`)
  assert(recommendations.payload.data.every((item) => Number(item.id) !== Number(product.id) && item.status === 'active' && Number(item.stock) > 0), 'product recommendations invalid')
  logPass('product recommendations')

  const overview = await request('GET', '/users/me/overview', { token: userToken })
  assert(overview.payload.data.user.phone === smokePhone && Number.isFinite(overview.payload.data.stats.favorites), 'member overview must use current user')
  const points = await request('GET', '/users/me/points', { token: userToken })
  assert(Array.isArray(points.payload.data), 'points records must come from database')
  logPass('member overview and points')

  const favoriteCreated = await request('POST', '/users/me/favorites', {
    token: userToken, body: { targetType: 'product', targetId: product.id },
  })
  let favorites = await request('GET', '/users/me/favorites', { token: userToken })
  assert(favorites.payload.data.some((item) => Number(item.id) === Number(favoriteCreated.payload.data.id)), 'favorite add/list failed')
  await request('DELETE', `/users/me/favorites/${favoriteCreated.payload.data.id}`, { token: userToken })
  favorites = await request('GET', '/users/me/favorites', { token: userToken })
  assert(!favorites.payload.data.some((item) => Number(item.id) === Number(favoriteCreated.payload.data.id)), 'favorite removal failed')
  logPass('favorite add list remove')

  const addCart = await request('POST', '/cart/items', {
    token: userToken,
    body: { productId: product.id, quantity: 1 },
  })
  const cartItem = addCart.payload.data.items.find((item) => Number(item.productId) === Number(product.id))
  assert(cartItem, 'cart item missing after add')
  await request('PATCH', `/cart/items/${cartItem.id}`, { token: userToken, body: { quantity: 1 } })
  logPass('user cart flow')

  const order = await request('POST', '/orders', {
    token: userToken,
    body: { deliveryType: 'pickup', pickupStore: 'Smoke Store', paymentMethod: 'wechat' },
  })
  assert(order.payload.data.id, 'order id missing')
  await request('PATCH', `/orders/${order.payload.data.id}/cancel`, { token: userToken })
  logPass('user order flow')

  const buyNow = await request('POST', '/orders/buy-now', {
    token: userToken,
    body: { productId: product.id, quantity: 1, deliveryType: 'pickup', pickupStore: 'Smoke Store', paymentMethod: 'wechat' },
  })
  assert(buyNow.payload.data.source === 'buy_now', 'buy-now order source invalid')
  const pay = await request('PATCH', `/orders/${buyNow.payload.data.id}/pay`, { token: userToken })
  assert(pay.payload.data.status === 'pending_review', 'paid order should wait for review')
  const confirmPayment = await request('PATCH', `/admin/orders/${buyNow.payload.data.id}/confirm-payment`, { token: adminToken })
  assert(confirmPayment.payload.data.status === 'paid', 'admin confirm should mark paid')
  logPass('buy-now payment review flow')

  const posts = await request('GET', '/posts?page=1&pageSize=3')
  const post = posts.payload.data[0]
  assert(post, 'posts list empty')
  const submittedPost = await request('POST', '/posts', { token: userToken, body: { title: `Smoke community ${stamp}`, content: '社区审核同步测试内容' } })
  createdPostSlugs.push(submittedPost.payload.data.slug)
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/status`, { token: adminToken, body: { status: 'published' } })
  await request('GET', `/posts/${submittedPost.payload.data.id}`)
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/status`, { token: adminToken, body: { status: 'hidden' } })
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  logPass('community moderation synchronization')
  const unauthLike = await request('POST', `/posts/${post.id}/like`, { expectedStatus: 401 })
  assert(unauthLike.payload.code === 401, 'unauth like should return 401')
  await request('POST', `/posts/${post.id}/like`, { token: userToken })
  const postLikes = await request('GET', `/posts/${post.id}/likes`)
  assert(postLikes.payload.data.items.some((item) => item.nickname === 'Smoke User'), 'post like users missing')
  logPass('post like permission flow')

  await request('POST', `/posts/${post.id}/comments`, { token: userToken, body: { content: `anonymous smoke ${stamp}`, isAnonymous: true } })
  const publicPost = await request('GET', `/posts/${post.id}`)
  const anonymousComment = publicPost.payload.data.comments.find((item) => item.content === `anonymous smoke ${stamp}`)
  assert(anonymousComment?.author === '匿名用户' && anonymousComment.user === null, 'anonymous comment leaked public identity')
  const adminPosts = await request('GET', `/admin/posts?page=1&pageSize=100`, { token: adminToken })
  const adminComment = adminPosts.payload.data.find((item) => Number(item.id) === Number(post.id))?.comments.find((item) => item.content === `anonymous smoke ${stamp}`)
  assert(adminComment?.user?.id, 'admin should see anonymous comment owner')
  logPass('anonymous comment privacy flow')

  const events = await request('GET', '/events?page=1&pageSize=3')
  assert(events.payload.data.length > 0, 'events list empty')
  logPass('events list')

  const tomorrow = new Date(Date.now() + 86400000)
  const eventDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const smokeEvent = await request('POST', '/admin/events', { token: adminToken, body: { slug: `smoke-event-${stamp}`, title: 'Smoke Event', category: 'Smoke', date: eventDate, time: '10:00', location: 'Smoke Room', capacity: 2, attendees: 0, status: 'published' } })
  createdEventIds.push(smokeEvent.payload.data.id)
  await request('POST', `/events/${smokeEvent.payload.data.id}/register`, { token: userToken })
  let registrationList = await request('GET', '/events/me/registrations', { token: userToken })
  assert(registrationList.payload.data.find((item) => Number(item.eventId) === Number(smokeEvent.payload.data.id))?.registrationStatus === 'registered', 'event registration missing')
  await request('DELETE', `/events/${smokeEvent.payload.data.id}/register`, { token: userToken })
  await request('POST', `/events/${smokeEvent.payload.data.id}/register`, { token: userToken })
  const [[eventCount]] = await pool.query('SELECT attendees FROM events WHERE id = ?', [smokeEvent.payload.data.id])
  assert(Number(eventCount.attendees) === 1, 'event re-registration count invalid')
  logPass('event register cancel re-register flow')

  const spaces = await request('GET', '/spaces')
  assert(spaces.payload.data.length > 0, 'spaces list empty')
  logPass('spaces list')

  const bookingNow = new Date()
  const bookingDate = `${bookingNow.getFullYear()}-${String(bookingNow.getMonth() + 1).padStart(2, '0')}-${String(bookingNow.getDate()).padStart(2, '0')}`
  const availability = await request('GET', `/seats/availability?date=${bookingDate}&timeSlot=09%3A00-11%3A00`)
  const freeSeats = availability.payload.data.filter((item) => item.status === 'available')
  assert(freeSeats.length >= 2, 'not enough available seats')
  await request('POST', '/bookings', { token: userToken, body: { date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[0].seatId, peopleCount: 1, contactName: 'Wrong Name', phone: '13800138000' } })
  const myBookings = await request('GET', '/bookings/my', { token: userToken })
  assert(myBookings.payload.data.length && myBookings.payload.data.every((item) => item.phone === smokePhone), 'member booking must use token user phone')
  const occupied = await request('GET', `/seats/availability?date=${bookingDate}&timeSlot=09%3A00-11%3A00`)
  assert(occupied.payload.data.find((item) => item.seatId === freeSeats[0].seatId)?.status === 'reserved', 'seat should be reserved')
  logPass('member seat booking flow')

  await request('POST', '/auth/send-code', { body: { phone: guestPhone, scene: 'booking_guest' } })
  const guestCode = '654321'
  const { hashPassword: hashGuestCode } = await import('../server/utils/crypto.js')
  await pool.query(`UPDATE verification_codes SET code_hash = ? WHERE phone = ? AND scene = 'booking_guest' ORDER BY id DESC LIMIT 1`, [await hashGuestCode(guestCode), guestPhone])
  const guestBooking = await request('POST', '/bookings/guest', { body: { phone: guestPhone, code: guestCode, name: '游客测试', date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[1].seatId, peopleCount: 1 } })
  assert(guestBooking.payload.data.accountCreated === true, 'guest account should be created')
  await request('POST', '/auth/send-code', { body: { phone: guestPhone, scene: 'login' } })
  const guestLoginCode = '654322'
  await pool.query(`UPDATE verification_codes SET code_hash = ? WHERE phone = ? AND scene = 'login' ORDER BY id DESC LIMIT 1`, [await hashGuestCode(guestLoginCode), guestPhone])
  const guestLogin = await request('POST', '/auth/login', { body: { phone: guestPhone, code: guestLoginCode } })
  const guestFavorites = await request('GET', '/users/me/favorites', { token: guestLogin.payload.data.token })
  assert(!guestFavorites.payload.data.some((item) => Number(item.id) === Number(favoriteCreated.payload.data.id)), 'user B can see user A favorites')
  const guestBookings = await request('GET', '/bookings/my', { token: guestLogin.payload.data.token })
  assert(guestBookings.payload.data.length && guestBookings.payload.data.every((item) => item.phone === guestPhone), 'guest account booking association invalid')
  assert(!guestBookings.payload.data.some((item) => item.phone === smokePhone), 'user B can see user A bookings')
  logPass('guest verification booking flow')

  const usage = await request('GET', `/admin/seats/usage?date=${bookingDate}&timeSlot=09%3A00-11%3A00`, { token: adminToken })
  assert(usage.payload.data.some((item) => item.bookingInfo?.phoneMasked), 'admin seat usage missing booking info')
  logPass('admin seat usage')

  const createdSeat = await request('POST', '/admin/seats', { token: adminToken, body: { code: `Z${String(stamp).slice(-5)}`, name: 'Smoke Seat', area: 'Smoke Area', capacity: 2, x: 40, y: 60, width: 70, height: 55, sortOrder: 999, status: 'available' } })
  createdSeatIds.push(createdSeat.payload.data.id)
  const editedSeat = await request('PATCH', `/admin/seats/${createdSeat.payload.data.id}`, { token: adminToken, body: { ...createdSeat.payload.data, name: 'Smoke Seat Edited', x: 45, y: 65, status: 'available' } })
  assert(editedSeat.payload.data.name === 'Smoke Seat Edited' && Number(editedSeat.payload.data.x) === 45, 'seat edit not persisted')
  const disabledSeat = await request('PATCH', `/admin/seats/${createdSeat.payload.data.id}/status`, { token: adminToken, body: { status: 'disabled' } })
  assert(disabledSeat.payload.data.status === 'disabled', 'seat disable failed')
  await request('DELETE', `/admin/seats/${createdSeat.payload.data.id}`, { token: adminToken })
  createdSeatIds.splice(createdSeatIds.indexOf(createdSeat.payload.data.id), 1)
  logPass('admin seat CRUD flow')

  const notFound = await request('GET', '/does-not-exist', { expectedStatus: 404 })
  assert(notFound.payload.code === 404 && notFound.payload.data === null, '404 payload should keep unified format')
  logPass('404 response')

  const badJsonResponse = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"phone":',
  })
  const badJson = await badJsonResponse.json()
  assert(badJsonResponse.status === 400 && badJson.code === 400 && badJson.data === null, 'bad JSON should keep unified error format')
  logPass('error response format')
}

main()
  .then(async () => {
    await cleanup()
    await pool.end()
    console.log('Smoke API passed')
  })
  .catch(async (error) => {
    console.error(`Smoke API failed: ${error.message}`)
    try {
      await cleanup()
    } finally {
      await pool.end()
    }
    process.exit(1)
  })
