import { pool } from '../server/db/mysql.js'

const baseURL = String(process.env.SMOKE_API_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 4173}/api`).replace(/\/$/, '')
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin'
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123456'
const stamp = Date.now()
const smokePhone = `139${String(stamp).slice(-8)}`
const createdPostSlugs = []

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
  await pool.query('DELETE FROM verification_codes WHERE phone = ?', [smokePhone])
  const [users] = await pool.query('SELECT id FROM users WHERE phone = ?', [smokePhone])
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
  if (createdPostSlugs.length) await pool.query('DELETE FROM posts WHERE slug IN (?)', [createdPostSlugs])
}

async function main() {
  await cleanup()

  const health = await request('GET', '/health')
  assert(health.payload.data.database === 'coffee', 'health database should be coffee')
  logPass('health')

  const [admins] = await pool.query('SELECT id, username, status FROM admin_users WHERE username = ?', [adminUsername])
  assert(admins[0]?.status === 'active', 'default admin should exist in admin_users')
  logPass('admin_users default admin')

  const [mixedAdmins] = await pool.query("SELECT id FROM users WHERE (username = 'admin' OR phone = '13800000000') AND role = 'admin' AND status = 'active'")
  assert(mixedAdmins.length === 0, 'users table should not contain active backend admin')
  logPass('users admin disabled')

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

  const adminOrdersDenied = await request('GET', '/orders', { token: adminToken, expectedStatus: 401 })
  assert([401, 403].includes(adminOrdersDenied.payload.code), 'admin token should not access user orders')
  logPass('admin token blocked from user orders')

  const registerCode = await request('POST', '/auth/send-code', {
    body: { phone: smokePhone, scene: 'register' },
  })
  assert(registerCode.payload.data.devCode, 'dev verification code missing')
  logPass('send register code')

  const register = await request('POST', '/auth/register', {
    body: {
      phone: smokePhone,
      password: 'smoke123456',
      confirmPassword: 'smoke123456',
      code: registerCode.payload.data.devCode,
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

  const books = await request('GET', '/books?page=1&pageSize=3')
  assert(books.payload.data.length > 0, 'books list empty')
  logPass('books list')

  const products = await request('GET', '/products?page=1&pageSize=5')
  const product = products.payload.data.find((item) => Number(item.stock) > 1)
  assert(product, 'no product with stock for smoke test')
  logPass('products list')

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
  const unauthLike = await request('POST', `/posts/${post.id}/like`, { expectedStatus: 401 })
  assert(unauthLike.payload.code === 401, 'unauth like should return 401')
  await request('POST', `/posts/${post.id}/like`, { token: userToken })
  logPass('post like permission flow')

  const events = await request('GET', '/events?page=1&pageSize=3')
  assert(events.payload.data.length > 0, 'events list empty')
  logPass('events list')

  const spaces = await request('GET', '/spaces')
  assert(spaces.payload.data.length > 0, 'spaces list empty')
  logPass('spaces list')
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
