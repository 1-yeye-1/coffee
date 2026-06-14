import { pool } from '../server/db/mysql.js'

const baseURL = String(process.env.SMOKE_API_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 4173}/api`).replace(/\/$/, '')
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin'
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123456'
const stamp = Date.now()
const smokeUser = `smoke_${stamp}`
const smokeOtherUser = `smoke_other_${stamp}`
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
    throw new Error(`${method} ${path} expected ${expectedStatus}, got ${response.status}`)
  }
  if (!expectedStatus && (!response.ok || payload?.code !== 0)) {
    throw new Error(`${method} ${path} failed: ${response.status} ${payload?.message || ''}`)
  }
  return { response, payload }
}

async function cleanup() {
  const usernames = [smokeUser, smokeOtherUser]
  const [users] = await pool.query('SELECT id FROM users WHERE username IN (?)', [usernames])
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

  const adminLogin = await request('POST', '/auth/login', {
    body: { username: adminUsername, password: adminPassword },
  })
  const adminToken = adminLogin.payload.data.token
  assert(adminToken, 'admin token missing')
  logPass('admin login')

  const me = await request('GET', '/auth/me', { token: adminToken })
  assert(me.payload.data.role === 'admin', 'auth/me should return admin')
  logPass('auth/me')

  const books = await request('GET', '/books?page=1&pageSize=3')
  assert(books.payload.data.length > 0, 'books list empty')
  logPass('books list')

  const products = await request('GET', '/products?page=1&pageSize=5')
  const product = products.payload.data.find((item) => Number(item.stock) > 1)
  assert(product, 'no product with stock for smoke test')
  logPass('products list')

  await request('GET', '/admin/dashboard', { token: adminToken })
  logPass('admin dashboard')

  await request('POST', '/auth/register', {
    body: {
      username: smokeUser,
      password: 'smoke123456',
      email: `${smokeUser}@example.local`,
      nickname: 'Smoke User',
    },
  })
  const userLogin = await request('POST', '/auth/login', {
    body: { username: smokeUser, password: 'smoke123456' },
  })
  const userToken = userLogin.payload.data.token
  const forbidden = await request('GET', '/admin/dashboard', { token: userToken, expectedStatus: 403 })
  assert(forbidden.payload.code === 403, 'normal user should receive 403')
  logPass('normal user admin 403')

  const addCart = await request('POST', '/cart/items', {
    token: userToken,
    body: { productId: product.id, quantity: 1 },
  })
  const cartItem = addCart.payload.data.items.find((item) => Number(item.productId) === Number(product.id))
  assert(cartItem, 'cart item missing after add')
  await request('PATCH', `/cart/items/${cartItem.id}`, {
    token: userToken,
    body: { quantity: 1 },
  })
  logPass('cart basic flow')

  const order = await request('POST', '/orders', {
    token: userToken,
    body: { deliveryType: 'pickup', pickupStore: 'Smoke Store', paymentMethod: 'wechat' },
  })
  assert(order.payload.data.id, 'order id missing')
  await request('PATCH', `/orders/${order.payload.data.id}/cancel`, { token: userToken })
  logPass('order basic flow')

  const events = await request('GET', '/events?page=1&pageSize=3')
  assert(events.payload.data.length > 0, 'events list empty')
  logPass('events list')

  const posts = await request('GET', '/posts?page=1&pageSize=3')
  assert(Array.isArray(posts.payload.data), 'posts response invalid')
  logPass('posts list')

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
