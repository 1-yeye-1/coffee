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

async function request(method, path, { token, body, formData, expectedStatus } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: formData || (body === undefined ? undefined : JSON.stringify(body)),
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
  await pool.query("DELETE FROM image_captchas WHERE created_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL")
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

  await request('GET', '/auth/me', { token: 'invalid.smoke.token', expectedStatus: 401 })
  logPass('invalid token rejected')

  const presetAvatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#6f4e37"/></svg>')}`
  await request('POST', '/users/me/avatar/select', { token: userToken, body: { avatarUrl: presetAvatar } })
  const avatars = await request('GET', '/users/me/avatars', { token: userToken })
  assert(avatars.payload.data.length === 1 && avatars.payload.data[0].isCurrent, 'avatar history/current state invalid')
  await request('POST', `/users/me/avatar/history/${avatars.payload.data[0].id}/use`, { token: userToken })
  logPass('avatar preset and history flow')

  const notifications = await request('GET', '/account/notifications', { token: userToken })
  assert(Array.isArray(notifications.payload.data), 'notifications should return list')
  const unreadNotifications = await request('GET', '/account/notifications/unread-count', { token: userToken })
  assert(Number.isFinite(Number(unreadNotifications.payload.data.count)), 'notification unread count invalid')
  await request('PATCH', '/account/notifications/read-all', { token: userToken })
  const unreadAfterReadAll = await request('GET', '/account/notifications/unread-count', { token: userToken })
  assert(Number(unreadAfterReadAll.payload.data.count) === 0, 'notifications should be read after read-all')
  logPass('notifications list count and read-all')

  const books = await request('GET', '/books?page=1&pageSize=3')
  assert(books.payload.data.length > 0, 'books list empty')
  logPass('books list')

  const products = await request('GET', '/products?page=1&pageSize=5')
  const product = products.payload.data.find((item) => Number(item.stock) > 1)
  assert(product, 'no product with stock for smoke test')
  logPass('products list')

  for (const resource of ['books', 'products', 'users', 'orders', 'bookings', 'posts']) {
    const result = await request('GET', `/admin/${resource}?page=1&pageSize=3`, { token: adminToken })
    assert(Array.isArray(result.payload.data), `admin ${resource} list invalid`)
  }
  logPass('admin core resource lists')

  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const validUpload = new FormData()
  validUpload.append('file', new Blob([pngBytes], { type: 'image/png' }), 'smoke.png')
  const uploaded = await request('POST', '/upload/community', { token: userToken, formData: validUpload })
  assert(uploaded.payload.data.file?.id, 'valid upload record missing')
  assert(uploaded.payload.data.url, 'valid upload URL missing')

  const forgedUpload = new FormData()
  forgedUpload.append('file', new Blob(['not-a-real-png'], { type: 'image/png' }), 'forged.png')
  const forged = await request('POST', '/upload/community', { token: userToken, formData: forgedUpload, expectedStatus: 400 })
  assert(/类型|内容|文件/.test(forged.payload.message), 'forged upload error message unclear')
  logPass('upload signature validation')

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
  const duplicatePay = await request('PATCH', `/orders/${buyNow.payload.data.id}/pay`, { token: userToken })
  assert(duplicatePay.payload.data.status === 'pending_review', 'duplicate payment submission must be idempotent')
  const confirmPayment = await request('PATCH', `/admin/orders/${buyNow.payload.data.id}/confirm-payment`, { token: adminToken })
  assert(confirmPayment.payload.data.status === 'paid', 'admin confirm should mark paid')
  logPass('buy-now payment review flow')

  const posts = await request('GET', '/posts?page=1&pageSize=3')
  const post = posts.payload.data[0]
  assert(post, 'posts list empty')
  const submittedPost = await request('POST', '/posts', {
    token: userToken,
    body: {
      title: `Smoke community ${stamp}`,
      content: '社区审核同步测试内容',
      mediaUrl: uploaded.payload.data.url,
      mediaType: 'image',
    },
  })
  createdPostSlugs.push(submittedPost.payload.data.slug)
  assert(submittedPost.payload.data.id && submittedPost.payload.data.slug && submittedPost.payload.data.createdAt, 'new post insertion payload incomplete')
  assert(submittedPost.payload.data.mediaUrl === uploaded.payload.data.url && submittedPost.payload.data.mediaType === 'image', 'new post gallery media missing')
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  let moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.reviewStatus === 'pending', 'admin should see pending posts')
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/status`, { token: adminToken, body: { status: 'rejected', reason: 'smoke reject' } })
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.reviewStatus === 'rejected', 'admin should see rejected posts')
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/status`, { token: adminToken, body: { status: 'published' } })
  const publishedPost = await request('GET', `/posts/${submittedPost.payload.data.id}`)
  assert(publishedPost.payload.data.mediaUrl === uploaded.payload.data.url && publishedPost.payload.data.mediaType === 'image', 'published post gallery data missing')
  const publicPostList = await request('GET', '/posts?page=1&pageSize=100')
  assert(publicPostList.payload.data.some((item) => Number(item.id) === Number(submittedPost.payload.data.id) && item.mediaUrl === uploaded.payload.data.url), 'new published post missing from public list')
  const postFavorite = await request('POST', '/users/me/favorites', {
    token: userToken,
    body: { targetType: 'post', targetId: submittedPost.payload.data.id },
  })
  const postFavorites = await request('GET', '/users/me/favorites', { token: userToken })
  assert(postFavorites.payload.data.some((item) => Number(item.id) === Number(postFavorite.payload.data.id) && item.targetType === 'post'), 'community bookmark add/list failed')
  await request('DELETE', `/users/me/favorites/${postFavorite.payload.data.id}`, { token: userToken })
  const moderationCommentPost = await request('POST', `/posts/${submittedPost.payload.data.id}/comments`, {
    token: userToken,
    body: { content: `moderation comment ${stamp}` },
  })
  const moderationComment = moderationCommentPost.payload.data.comments.find((item) => item.content === `moderation comment ${stamp}`)
  assert(moderationComment?.id && moderationComment.status === 'published' && moderationComment.createdAt, 'comment reveal data incomplete')
  const commentDetail = await request('GET', `/posts/${submittedPost.payload.data.id}`)
  assert(commentDetail.payload.data.comments.some((item) => Number(item.id) === Number(moderationComment.id) && item.content === moderationComment.content), 'published comment missing from post detail')
  const commentReport = await request('POST', `/posts/${submittedPost.payload.data.id}/reports`, {
    token: userToken,
    body: { commentId: moderationComment.id, reason: 'spam', description: '评论审核联动测试' },
  })
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.comments.find((item) => Number(item.id) === Number(moderationComment.id))?.status === 'pending', 'reported comment should become pending')
  await request('PATCH', `/admin/reports/${commentReport.payload.data.id}`, { token: adminToken, body: { action: 'dismiss', note: 'smoke dismiss' } })
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.comments.find((item) => Number(item.id) === Number(moderationComment.id))?.status === 'published', 'dismissed comment report should restore status')
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/comments/${moderationComment.id}/status`, { token: adminToken, body: { status: 'hidden', reason: 'smoke hide' } })
  let publicModeratedPost = await request('GET', `/posts/${submittedPost.payload.data.id}`)
  assert(!publicModeratedPost.payload.data.comments.some((item) => Number(item.id) === Number(moderationComment.id)), 'hidden comment leaked to frontend')
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.comments.find((item) => Number(item.id) === Number(moderationComment.id))?.status === 'hidden', 'admin should see hidden comments')
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/comments/${moderationComment.id}/status`, { token: adminToken, body: { status: 'published', reason: 'smoke restore' } })
  publicModeratedPost = await request('GET', `/posts/${submittedPost.payload.data.id}`)
  assert(publicModeratedPost.payload.data.comments.some((item) => Number(item.id) === Number(moderationComment.id)), 'restored comment missing from frontend')
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/comments/${moderationComment.id}/status`, { token: adminToken, body: { status: 'deleted', reason: 'smoke delete' } })
  publicModeratedPost = await request('GET', `/posts/${submittedPost.payload.data.id}`)
  assert(!publicModeratedPost.payload.data.comments.some((item) => Number(item.id) === Number(moderationComment.id)), 'deleted comment leaked to frontend')
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.comments.find((item) => Number(item.id) === Number(moderationComment.id))?.status === 'deleted', 'admin should see deleted comments')
  const postReport = await request('POST', `/posts/${submittedPost.payload.data.id}/reports`, {
    token: userToken,
    body: { reason: 'review', description: '帖子审核联动测试' },
  })
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  moderationDetail = await request('GET', `/admin/posts/${submittedPost.payload.data.id}/moderation`, { token: adminToken })
  assert(moderationDetail.payload.data.reviewStatus === 'reported' && moderationDetail.payload.data.reports.some((item) => Number(item.id) === Number(postReport.payload.data.id)), 'reported post moderation detail invalid')
  await request('PATCH', `/admin/reports/${postReport.payload.data.id}`, { token: adminToken, body: { action: 'dismiss', note: 'smoke restore' } })
  await request('GET', `/posts/${submittedPost.payload.data.id}`)
  await request('PATCH', `/admin/posts/${submittedPost.payload.data.id}/status`, { token: adminToken, body: { status: 'hidden' } })
  await request('GET', `/posts/${submittedPost.payload.data.id}`, { expectedStatus: 404 })
  logPass('community moderation and report synchronization')
  const unauthLike = await request('POST', `/posts/${post.id}/like`, { expectedStatus: 401 })
  assert(unauthLike.payload.code === 401, 'unauth like should return 401')
  await request('POST', `/posts/${post.id}/like`, { token: userToken })
  const postLikes = await request('GET', `/posts/${post.id}/likes`)
  assert(postLikes.payload.data.items.some((item) => item.nickname === 'Smoke User'), 'post like users missing')
  logPass('community like, bookmark, gallery, new post and comment data')
  await request('DELETE', `/upload/files/${uploaded.payload.data.file.id}`, { token: adminToken })

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
  const seatList = await request('GET', '/seats')
  assert(seatList.payload.data.length > 0, 'seat list empty')
  assert(seatList.payload.data.every((seat) => seat.id && seat.code && seat.name && Number.isFinite(Number(seat.capacity))
    && Number.isFinite(Number(seat.x)) && Number.isFinite(Number(seat.y)) && ['available', 'maintenance'].includes(seat.status)), 'seat tooltip fields incomplete')
  const availability = await request('GET', `/seats/availability?date=${bookingDate}&timeSlot=09%3A00-11%3A00`)
  assert(availability.payload.data.every((seat) => seat.seatId && seat.code && seat.name && 'area' in seat
    && Number.isFinite(Number(seat.capacity)) && Number.isFinite(Number(seat.x)) && Number.isFinite(Number(seat.y))
    && ['available', 'reserved', 'maintenance'].includes(seat.status)), 'seat availability tooltip fields incomplete')
  const freeSeats = availability.payload.data.filter((item) => item.status === 'available')
  assert(freeSeats.length >= 2, 'not enough available seats')
  const memberBooking = await request('POST', '/bookings', { token: userToken, body: { date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[0].seatId, peopleCount: 1, contactName: 'Wrong Name', phone: '13800138000' } })
  assert(memberBooking.payload.data.bookingNo && memberBooking.payload.data.date === bookingDate
    && memberBooking.payload.data.timeSlot === '09:00-11:00' && memberBooking.payload.data.seatCode === freeSeats[0].code
    && memberBooking.payload.data.createdAt, 'member reservation card fields incomplete')
  await request('POST', '/bookings', { token: userToken, body: { date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[0].seatId, peopleCount: 1 }, expectedStatus: 409 })
  const myBookings = await request('GET', '/bookings/my', { token: userToken })
  assert(myBookings.payload.data.length && myBookings.payload.data.every((item) => item.phone === smokePhone), 'member booking must use token user phone')
  const occupied = await request('GET', `/seats/availability?date=${bookingDate}&timeSlot=09%3A00-11%3A00`)
  assert(occupied.payload.data.find((item) => item.seatId === freeSeats[0].seatId)?.status === 'reserved', 'seat should be reserved')
  logPass('member seat booking flow')

  const captcha = await request('GET', '/auth/captcha')
  assert(captcha.payload.data.captchaId && captcha.payload.data.image.startsWith('data:image/svg+xml;base64,'), 'dynamic captcha payload invalid')
  const guestCode = 'A7K9P'
  const { hashPassword: hashGuestCode } = await import('../server/utils/crypto.js')
  await pool.query('UPDATE image_captchas SET code_hash = ? WHERE captcha_id = ?', [await hashGuestCode(guestCode), captcha.payload.data.captchaId])
  const guestBooking = await request('POST', '/bookings/guest', { body: { phone: guestPhone, captchaId: captcha.payload.data.captchaId, captchaCode: guestCode, name: '游客测试', date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[1].seatId, peopleCount: 1 } })
  assert(guestBooking.payload.data.accountCreated === true, 'guest account should be created')
  assert(guestBooking.payload.data.user?.nickname && guestBooking.payload.data.booking?.bookingNo
    && guestBooking.payload.data.booking.date === bookingDate && guestBooking.payload.data.booking.timeSlot === '09:00-11:00'
    && guestBooking.payload.data.booking.seatCode === freeSeats[1].code && guestBooking.payload.data.booking.createdAt, 'guest reservation card fields incomplete')
  await request('POST', '/bookings/guest', { body: { phone: guestPhone, captchaId: captcha.payload.data.captchaId, captchaCode: guestCode, name: '游客测试', date: bookingDate, timeSlot: '09:00-11:00', seatId: freeSeats[1].seatId, peopleCount: 1 }, expectedStatus: 400 })
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
  assert(disabledSeat.payload.data.status === 'maintenance', 'seat maintenance status failed')
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
