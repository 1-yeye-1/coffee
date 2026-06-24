import { hashPassword } from '../utils/crypto.js'
import { pool } from './mysql.js'

const demoUsers = [
  { username: 'demo_reader_latte', phone: '13988001001', nickname: '宋拿铁', level: '普通会员', points: 220, growth: 220, avatar: '/uploads/demo/avatar-latte.svg' },
  { username: 'demo_reader_silver', phone: '13988001002', nickname: '许银匙', level: '银卡会员', points: 860, growth: 860, avatar: '/uploads/demo/avatar-silver.svg' },
  { username: 'demo_reader_gold', phone: '13988001003', nickname: '林金橙', level: '金卡会员', points: 1880, growth: 1880, avatar: '/uploads/demo/avatar-gold.svg' },
  { username: 'demo_reader_black', phone: '13988001004', nickname: '周黑金', level: '黑金会员', points: 3600, growth: 3600, avatar: '/uploads/demo/avatar-black.svg' },
]

const today = (offset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const stamp = (offset = 0, hour = 10) => `${today(offset)} ${String(hour).padStart(2, '0')}:00:00`
const one = async (connection, sql, params = []) => (await connection.execute(sql, params))[0][0] || null

async function seedUsers(connection) {
  const passwordHash = await hashPassword('demo123456')
  for (const user of demoUsers) {
    await connection.execute(
      `INSERT INTO users
        (username, nickname, phone, email, password_hash, avatar, role, status, points, level, growth_value, last_checkin_date, profile_public, bio)
       VALUES (?, ?, ?, ?, ?, ?, 'user', 'active', ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), email = VALUES(email), avatar = VALUES(avatar),
        points = VALUES(points), level = VALUES(level), growth_value = VALUES(growth_value),
        last_checkin_date = VALUES(last_checkin_date), bio = VALUES(bio)`,
      [user.username, user.nickname, user.phone, `${user.username}@demo.coffee-book.test`, passwordHash, user.avatar, user.points, user.level, user.growth, today(), `${user.level}演示账号。`],
    )
    const row = await one(connection, 'SELECT id FROM users WHERE phone = ? LIMIT 1', [user.phone])
    await connection.execute(
      `INSERT INTO user_points (user_id, points, type, source, description, created_at)
       SELECT ?, ?, 'earn', 'demo_seed', ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM user_points WHERE user_id = ? AND source = 'demo_seed' LIMIT 1)`,
      [row.id, user.points, `${user.level}演示初始积分`, stamp(-3), row.id],
    )
    await connection.execute(
      `INSERT INTO user_points (user_id, points, type, source, description, created_at)
       SELECT ?, 10, 'earn', 'daily_checkin', '演示每日签到奖励', ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM user_points WHERE user_id = ? AND source = 'daily_checkin' AND description = '演示每日签到奖励' LIMIT 1)`,
      [row.id, stamp(0, 9), row.id],
    )
    await connection.execute(
      `INSERT INTO user_avatars (user_id, avatar_url, source, is_current)
       VALUES (?, ?, 'demo', 1) ON DUPLICATE KEY UPDATE is_current = 1`,
      [row.id, user.avatar],
    )
  }
  const [rows] = await connection.execute(`SELECT id, phone, nickname FROM users WHERE phone IN (${demoUsers.map(() => '?').join(',')}) ORDER BY phone`, demoUsers.map((user) => user.phone))
  return rows
}

async function seedOrders(connection, users, products) {
  for (const [index, user] of users.entries()) {
    const product = products[index % products.length]
    const quantity = index % 2 + 1
    const total = Number(product.price) * quantity
    const orderNo = `DEMO-ORDER-${index + 1}`
    await connection.execute(
      `INSERT INTO orders (order_no, user_id, source, receiver_name, receiver_phone, delivery_type, pickup_store,
        payment_method, subtotal_amount, total_amount, status, note, created_at, paid_at)
       VALUES (?, ?, 'demo', ?, ?, 'pickup', 'Coffee Book 城市阅读店', 'wechat', ?, ?, 'completed', '演示订单', ?, ?)
       ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = VALUES(status)`,
      [orderNo, user.id, user.nickname, user.phone, total, total, stamp(-index - 1, 11), stamp(-index - 1, 11)],
    )
    const order = await one(connection, 'SELECT id FROM orders WHERE order_no = ? LIMIT 1', [orderNo])
    await connection.execute(
      `INSERT INTO order_items (order_id, product_id, product_name, product_category, price, quantity, subtotal)
       SELECT ?, ?, ?, ?, ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = ? AND product_id = ? LIMIT 1)`,
      [order.id, product.id, product.name, product.category, product.price, quantity, total, order.id, product.id],
    )
    await connection.execute(
      `INSERT INTO payments (payment_no, order_id, user_id, amount, method, status, paid_at, created_at)
       VALUES (?, ?, ?, ?, 'wechat', 'paid', ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [`DEMO-PAY-${index + 1}`, order.id, user.id, total, stamp(-index - 1, 11), stamp(-index - 1, 11)],
    )
  }
}

async function seedBookings(connection, users, space, seats) {
  for (const [index, user] of users.entries()) {
    const seat = seats[index % seats.length]
    await connection.execute(
      `INSERT INTO bookings (booking_no, user_id, space_id, seat_id, booking_date, booking_time, time_slot,
        people_count, seat, contact_name, phone, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, '14:00', '14:00-16:00', ?, ?, ?, ?, '演示预约：阅读与咖啡时段', 'confirmed', ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)`,
      [`DEMO-BOOKING-${index + 1}`, user.id, space.id, seat.id, today(index + 1), Math.min(Number(seat.capacity || 1), index + 1), seat.code, user.nickname, user.phone, stamp(-index, 12)],
    )
  }
}

async function seedEvents(connection, users, events) {
  for (const [index, user] of users.entries()) {
    const event = events[index % events.length]
    await connection.execute(
      `INSERT INTO event_registrations (event_id, user_id, status, created_at)
       VALUES (?, ?, 'registered', ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [event.id, user.id, stamp(-index, 15)],
    )
  }
  await connection.execute(
    `UPDATE events e SET attendees = (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered')
     WHERE e.id IN (${events.map(() => '?').join(',')})`,
    events.map((event) => event.id),
  )
}

async function seedCommunity(connection, users) {
  const posts = [
    ['demo-reading-window-seat', users[0], '阅读笔记', '靠窗座位读完一本短篇集', '今天在靠窗区读完一本短篇集，雨声和手冲咖啡刚好把节奏放慢。', '/uploads/demo/community-window.webp'],
    ['demo-coffee-flavor-note', users[1], '咖啡风味', '今天的浅烘像一束橙花', '入口是柑橘和蜂蜜，冷下来之后有一点红茶尾韵，适合配散文。', '/uploads/demo/community-coffee.webp'],
    ['demo-quiet-corner', users[2], '城市空间', '安静角落适合写周计划', '安静角落的灯光很稳，适合把下周阅读和工作安排慢慢写清楚。', null],
  ]
  for (const [slug, user, topic, title, content, media] of posts) {
    await connection.execute(
      `INSERT INTO posts (slug, user_id, title, author, avatar, topic, excerpt, content, media_url, media_type, status, featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), media_url = VALUES(media_url)`,
      [slug, user.id, title, user.nickname, user.nickname.slice(0, 1), topic, content.slice(0, 72), content, media, media ? 'image' : null, slug === 'demo-reading-window-seat' ? 1 : 0, stamp(-2 + posts.findIndex((item) => item[0] === slug), 16)],
    )
  }
  const [demoPosts] = await connection.execute("SELECT id FROM posts WHERE slug LIKE 'demo-%' ORDER BY id")
  for (const [index, post] of demoPosts.entries()) {
    const commenter = users[(index + 1) % users.length]
    const replier = users[(index + 2) % users.length]
    const text = '这个分享很有画面感，我也想去这个位置坐坐。'
    await connection.execute(
      `INSERT INTO comments (post_id, user_id, author, content, status, created_at)
       SELECT ?, ?, ?, ?, 'published', ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id = ? AND user_id = ? AND content = ? LIMIT 1)`,
      [post.id, commenter.id, commenter.nickname, text, stamp(-1, 17), post.id, commenter.id, text],
    )
    const parent = await one(connection, 'SELECT id FROM comments WHERE post_id = ? AND user_id = ? AND content = ? LIMIT 1', [post.id, commenter.id, text])
    await connection.execute(
      `INSERT INTO comments (post_id, user_id, parent_id, author, content, status, created_at)
       SELECT ?, ?, ?, ?, '下次可以一起约读书会。', 'published', ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id = ? AND user_id = ? AND parent_id = ? LIMIT 1)`,
      [post.id, replier.id, parent.id, replier.nickname, stamp(0, 10), post.id, replier.id, parent.id],
    )
    for (const user of users) {
      await connection.execute('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [post.id, user.id])
      await connection.execute("INSERT IGNORE INTO comment_likes (target_type, comment_id, user_id) VALUES ('community_comment', ?, ?)", [parent.id, user.id])
    }
    await connection.execute(
      `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?),
        comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'published') WHERE id = ?`,
      [post.id, post.id, post.id],
    )
  }
}

async function seedReviews(connection, users, products, books) {
  for (const [index, product] of products.entries()) {
    const user = users[index % users.length]
    const content = `演示评价：${product.name} 风味稳定，适合下午阅读。`
    await connection.execute(
      `INSERT INTO product_reviews (product_id, user_id, rating, content, status, created_at)
       SELECT ?, ?, 5, ?, 'published', ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE product_id = ? AND user_id = ? AND content = ? LIMIT 1)`,
      [product.id, user.id, content, stamp(-index, 13), product.id, user.id, content],
    )
    const review = await one(connection, 'SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ? AND content = ? LIMIT 1', [product.id, user.id, content])
    await connection.execute("INSERT IGNORE INTO comment_likes (target_type, comment_id, user_id) VALUES ('product_review', ?, ?)", [review.id, users[(index + 1) % users.length].id])
  }
  for (const [index, book] of books.entries()) {
    const user = users[index % users.length]
    await connection.execute(
      `INSERT INTO book_reservations (reservation_no, user_id, book_id, status, location_label, reserved_at)
       VALUES (?, ?, ?, 'confirmed', 'Coffee Book 演示书架', ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [`DEMO-BOOK-${index + 1}`, user.id, book.id, stamp(-index, 12)],
    )
    const reservation = await one(connection, 'SELECT id FROM book_reservations WHERE reservation_no = ? LIMIT 1', [`DEMO-BOOK-${index + 1}`])
    const content = `演示读后感：${book.title} 很适合在咖啡馆慢慢读。`
    await connection.execute(
      `INSERT INTO book_reviews (book_id, user_id, reservation_id, rating, content, status, created_at)
       SELECT ?, ?, ?, 5, ?, 'published', ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM book_reviews WHERE book_id = ? AND user_id = ? AND content = ? LIMIT 1)`,
      [book.id, user.id, reservation.id, content, stamp(-index, 14), book.id, user.id, content],
    )
    const review = await one(connection, 'SELECT id FROM book_reviews WHERE book_id = ? AND user_id = ? AND content = ? LIMIT 1', [book.id, user.id, content])
    await connection.execute("INSERT IGNORE INTO comment_likes (target_type, comment_id, user_id) VALUES ('book_review', ?, ?)", [review.id, users[(index + 2) % users.length].id])
  }
}

async function seedCouponsAndNotifications(connection, users, products, books, events) {
  const coupon = await one(connection, "SELECT id, code, points_cost AS pointsCost, valid_days AS validDays FROM coupons WHERE status = 'active' ORDER BY points_cost ASC, id ASC LIMIT 1")
  for (const [index, user] of users.entries()) {
    if (coupon) {
      await connection.execute(
        `INSERT INTO user_coupons (user_id, coupon_id, coupon_code, request_key, source, points_cost, expires_at)
         VALUES (?, ?, ?, ?, 'points', ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))
         ON DUPLICATE KEY UPDATE status = status`,
        [user.id, coupon.id, `DEMO-${coupon.code}-${user.id}`, `demo-coupon-${user.id}`, coupon.pointsCost || 0, coupon.validDays || 30],
      )
    }
    const notices = [
      ['演示订单已完成', '你的演示订单已完成，可在订单中心查看。', 'order', products[index % products.length]?.id],
      ['演示预约提醒', '明天有一个咖啡书屋座位预约。', 'booking', null],
      ['演示活动报名成功', '你已报名 Coffee Book 活动。', 'event', events[index % events.length]?.id],
      ['演示积分到账', '每日签到积分与成长值已到账。', 'points', null],
      ['演示图书预约', '你预约的图书已保留在演示书架。', 'book', books[index % books.length]?.id],
    ]
    for (const [title, content, relatedType, relatedId] of notices) {
      await connection.execute(
        `INSERT INTO user_notifications (user_id, title, content, type, related_id, related_type, created_at)
         SELECT ?, ?, ?, 'system', ?, ?, ? FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = ? AND title = ? LIMIT 1)`,
        [user.id, title, content, relatedId || null, relatedType, stamp(-index, 18), user.id, title],
      )
    }
  }
}

async function main() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const users = await seedUsers(connection)
    const [products] = await connection.execute("SELECT id, name, category, price FROM products WHERE status = 'active' ORDER BY id LIMIT 4")
    const [books] = await connection.execute("SELECT id, title FROM books WHERE status = 'available' ORDER BY id LIMIT 4")
    const [events] = await connection.execute("SELECT id, title FROM events WHERE status IN ('published', 'ongoing', 'open') ORDER BY event_date ASC, id ASC LIMIT 4")
    const space = await one(connection, "SELECT id FROM spaces WHERE status = 'active' ORDER BY id LIMIT 1")
    const [seats] = await connection.execute("SELECT id, code, capacity FROM seats WHERE status = 'available' ORDER BY id LIMIT 4")
    if (users.length < 4 || !products.length || !books.length || !events.length || !space || !seats.length) throw new Error('演示数据依赖不足，请先运行 npm run db:seed')
    await seedOrders(connection, users, products)
    await seedBookings(connection, users, space, seats)
    await seedEvents(connection, users, events)
    await seedCommunity(connection, users)
    await seedReviews(connection, users, products, books)
    await seedCouponsAndNotifications(connection, users, products, books, events)
    await connection.execute(
      `INSERT INTO audit_logs (operator_type, action, module, description, created_at)
       SELECT 'admin', 'demo.seed', 'seed', 'Release demo data seeded', CURRENT_TIMESTAMP FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'demo.seed' LIMIT 1)`,
    )
    await connection.commit()
    console.log(`Demo seed completed: ${users.length} users, orders/bookings/events/posts/reviews/likes/coupons/notifications`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Demo seed failed:', error.message)
  process.exitCode = 1
})
