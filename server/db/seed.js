import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { books } from '../../apps/web/src/data/books.js'
import { events } from '../../apps/web/src/data/events.js'
import { seedPosts as communitySeedPosts } from '../../apps/web/src/data/posts.js'
import { products } from '../../apps/web/src/data/products.js'
import { hashPassword } from '../utils/crypto.js'
import { pool } from './mysql.js'

const seedSqlPath = fileURLToPath(new URL('../sql/seed.sql', import.meta.url))

function toMysqlTimestamp(value) {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ')
}

async function seedAdmin(connection) {
  const passwordHash = await hashPassword('admin123456')
  await connection.execute(
    `INSERT INTO admin_users
      (username, nickname, phone, password_hash, status)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      nickname = VALUES(nickname),
      phone = VALUES(phone),
      password_hash = VALUES(password_hash),
      status = VALUES(status)`,
    ['admin', '系统管理员', '13800000000', passwordHash, 'active'],
  )
  await connection.execute(
    `DELETE c FROM carts c
     INNER JOIN users u ON u.id = c.user_id
     WHERE (u.username = 'admin' OR u.phone = '13800000000') AND u.role = 'admin'`,
  )
  await connection.execute(
    `DELETE FROM users
     WHERE (username = 'admin' OR phone = '13800000000')
       AND role = 'admin'
       AND id NOT IN (SELECT DISTINCT user_id FROM orders)
       AND id NOT IN (SELECT DISTINCT user_id FROM posts WHERE user_id IS NOT NULL)
       AND id NOT IN (SELECT DISTINCT user_id FROM bookings)
       AND id NOT IN (SELECT DISTINCT user_id FROM event_registrations)`,
  )
}

async function seedUsers(connection) {
  const passwordHash = await hashPassword('user123456')
  const users = [
    { username: 'reader_chen', phone: '13900000001', nickname: '陈晨', level: '普通会员', points: 120 },
    { username: 'reader_lin', phone: '13900000002', nickname: '林知夏', level: '银卡会员', points: 680 },
    { username: 'reader_zhou', phone: '13900000003', nickname: '周屿', level: '金卡会员', points: 1280 },
    { username: 'reader_gu', phone: '13900000004', nickname: '顾言', level: '普通会员', points: 260 },
    { username: 'reader_tang', phone: '13900000005', nickname: '唐果', level: '银卡会员', points: 520 },
  ]
  const sql = `INSERT INTO users
    (username, nickname, phone, password_hash, role, status, points, level)
    VALUES (?, ?, ?, ?, 'user', 'active', ?, ?)
    ON DUPLICATE KEY UPDATE
      nickname = VALUES(nickname),
      phone = VALUES(phone),
      role = 'user',
      status = 'active',
      points = VALUES(points),
      level = VALUES(level)`

  for (const user of users) {
    await connection.execute(sql, [
      user.username,
      user.nickname,
      user.phone,
      passwordHash,
      user.points,
      user.level,
    ])
  }

  for (const user of users) {
    const [[row]] = await connection.execute('SELECT id FROM users WHERE phone = ? LIMIT 1', [user.phone])
    if (!row?.id) continue
    await connection.execute(
      `INSERT INTO user_points (user_id, points, type, source, description)
       SELECT ?, ?, 'earn', 'seed', ?
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_points WHERE user_id = ? AND source = 'seed' AND description = ? LIMIT 1
       )`,
      [row.id, user.points, '初始化会员积分', row.id, '初始化会员积分'],
    )
    await connection.execute(
      `INSERT INTO user_notifications (user_id, title, content, type)
       SELECT ?, '欢迎加入 Coffee Book', '你的普通用户账号已创建，可在会员中心查看订单、预约、积分和帖子。', 'system'
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_notifications WHERE user_id = ? AND title = '欢迎加入 Coffee Book' LIMIT 1
       )`,
      [row.id, row.id],
    )
    await connection.execute(
      `INSERT INTO user_addresses (user_id, recipient, phone, region, detail, is_default)
       SELECT ?, ?, ?, '上海市 / 黄浦区', 'Coffee Book 示例地址 1 号', 1
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_addresses WHERE user_id = ? AND is_default = 1 LIMIT 1
       )`,
      [row.id, user.nickname, user.phone, row.id],
    )
  }

  const [allUsers] = await connection.execute(
    "SELECT id, nickname, phone FROM users WHERE role = 'user' ORDER BY id",
  )
  for (const user of allUsers) {
    await connection.execute(
      `INSERT INTO user_points (user_id, points, type, source, description)
       SELECT ?, 0, 'earn', 'account-sync', '账号资料同步记录'
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_points WHERE user_id = ? LIMIT 1
       )`,
      [user.id, user.id],
    )
    await connection.execute(
      `INSERT INTO user_notifications (user_id, title, content, type)
       SELECT ?, '欢迎加入 Coffee Book', '你的普通用户账号已同步到会员中心，可查看订单、预约、积分、帖子和通知。', 'system'
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_notifications WHERE user_id = ? LIMIT 1
       )`,
      [user.id, user.id],
    )
    await connection.execute(
      `INSERT INTO user_addresses (user_id, recipient, phone, region, detail, is_default)
       SELECT ?, ?, ?, '待完善', '请在地址管理中补充详细地址', 1
       FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM user_addresses WHERE user_id = ? LIMIT 1
       )`,
      [user.id, user.nickname || 'Coffee Book 用户', user.phone || '', user.id],
    )
  }
}

async function seedBooks(connection) {
  const sql = `INSERT INTO books
    (slug, title, author, category, rating, stock, status, cover_tone, summary,
     description, isbn, publisher, year, pages, language, author_bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      author = VALUES(author),
      category = VALUES(category),
      rating = VALUES(rating),
      stock = VALUES(stock),
      status = VALUES(status),
      cover_tone = VALUES(cover_tone),
      summary = VALUES(summary),
      description = VALUES(description),
      isbn = VALUES(isbn),
      publisher = VALUES(publisher),
      year = VALUES(year),
      pages = VALUES(pages),
      language = VALUES(language),
      author_bio = VALUES(author_bio)`

  for (const book of books) {
    await connection.execute(sql, [
      book.slug,
      book.title,
      book.author,
      book.category,
      book.rating,
      book.stock,
      book.status,
      book.coverTone,
      book.summary,
      book.description,
      book.isbn,
      book.publisher,
      book.year,
      book.pages,
      book.language,
      book.authorBio,
    ])
  }
}

async function seedProducts(connection) {
  const sql = `INSERT INTO products
    (slug, name, category, price, original_price, stock, status, sales, flavor,
     origin, roast, description, scene, storage, tone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      category = VALUES(category),
      price = VALUES(price),
      original_price = VALUES(original_price),
      stock = VALUES(stock),
      status = VALUES(status),
      sales = VALUES(sales),
      flavor = VALUES(flavor),
      origin = VALUES(origin),
      roast = VALUES(roast),
      description = VALUES(description),
      scene = VALUES(scene),
      storage = VALUES(storage),
      tone = VALUES(tone)`

  for (const product of products) {
    await connection.execute(sql, [
      product.slug,
      product.name,
      product.category,
      product.price,
      product.originalPrice,
      product.stock,
      product.status,
      product.sales,
      JSON.stringify(product.flavor),
      product.origin,
      product.roast,
      product.description,
      product.scene,
      product.storage,
      product.tone,
    ])
  }
}

async function seedEvents(connection) {
  const sql = `INSERT INTO events
    (slug, title, category, event_date, event_time, location, capacity, attendees, status,
     tone, summary, description, speaker, agenda)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      category = VALUES(category),
      event_date = VALUES(event_date),
      event_time = VALUES(event_time),
      location = VALUES(location),
      capacity = VALUES(capacity),
      attendees = VALUES(attendees),
      status = VALUES(status),
      tone = VALUES(tone),
      summary = VALUES(summary),
      description = VALUES(description),
      speaker = VALUES(speaker),
      agenda = VALUES(agenda)`

  for (const event of events) {
    await connection.execute(sql, [
      event.slug,
      event.title,
      event.category,
      event.date,
      event.time,
      event.location,
      Number(event.capacity) || 0,
      Number(event.attendees) || 0,
      event.status || 'open',
      event.tone || null,
      event.summary || null,
      event.description || null,
      JSON.stringify(event.speaker || null),
      JSON.stringify(event.agenda || []),
    ])
  }
}

async function seedCommunityPosts(connection) {
  const [seedUsers] = await connection.execute(
    `SELECT id FROM users
     WHERE phone IN ('13900000001', '13900000002', '13900000003', '13900000004')
     ORDER BY FIELD(phone, '13900000001', '13900000002', '13900000003', '13900000004')`,
  )
  const postSql = `INSERT INTO posts
    (slug, user_id, title, author, avatar, topic, excerpt, content, status, featured, likes_count, comments_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      title = VALUES(title),
      author = VALUES(author),
      avatar = VALUES(avatar),
      topic = VALUES(topic),
      excerpt = VALUES(excerpt),
      content = VALUES(content),
      status = VALUES(status),
      featured = VALUES(featured),
      likes_count = VALUES(likes_count),
      comments_count = VALUES(comments_count)`
  const commentSql = `INSERT INTO comments (post_id, author, content, status, created_at)
    SELECT ?, ?, ?, ?, ?
    FROM DUAL
    WHERE NOT EXISTS (
      SELECT 1 FROM comments WHERE post_id = ? AND author = ? AND content = ? LIMIT 1
    )`

  for (const [index, post] of communitySeedPosts.entries()) {
    await connection.execute(postSql, [
      post.slug,
      seedUsers[index]?.id || null,
      post.title,
      post.author,
      post.avatar,
      post.topic,
      post.excerpt,
      post.content,
      index === 3 ? 'pending' : 'published',
      index === 0 ? 1 : 0,
      Number(post.likes) || 0,
      post.comments.length,
      toMysqlTimestamp(post.createdAt),
    ])
    const [rows] = await connection.execute('SELECT id FROM posts WHERE slug = ? LIMIT 1', [post.slug])
    const postId = rows[0]?.id
    for (const comment of post.comments) {
      await connection.execute(commentSql, [
        postId,
        comment.author,
        comment.content,
        'published',
        toMysqlTimestamp(comment.createdAt),
        postId,
        comment.author,
        comment.content,
      ])
    }
  }
}

async function seedSpaces(connection) {
  const spaces = [
    {
      slug: 'city-reading-room',
      name: 'Coffee Book 城市阅读店',
      location: '二层窗景阅读区',
      description: '适合安静阅读、轻办公和小型会面。',
      capacity: 12,
    },
    {
      slug: 'riverside-terrace',
      name: 'Coffee Book 江畔店',
      location: '露台空间',
      description: '适合傍晚阅读和小型文化交流。',
      capacity: 10,
    },
  ]
  const spaceSql = `INSERT INTO spaces (slug, name, location, description, capacity, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      location = VALUES(location),
      description = VALUES(description),
      capacity = VALUES(capacity),
      status = VALUES(status)`
  const slotSql = `INSERT INTO booking_slots (space_id, slot_date, slot_time, capacity, status)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), status = VALUES(status)`
  const times = ['10:00 - 12:00', '13:00 - 15:00', '15:30 - 17:30', '18:00 - 20:00']

  for (const space of spaces) {
    await connection.execute(spaceSql, [
      space.slug,
      space.name,
      space.location,
      space.description,
      space.capacity,
      'active',
    ])
    const [rows] = await connection.execute('SELECT id FROM spaces WHERE slug = ? LIMIT 1', [space.slug])
    const spaceId = rows[0]?.id
    for (let index = 1; index <= 7; index += 1) {
      const date = new Date()
      date.setDate(date.getDate() + index)
      const slotDate = date.toISOString().slice(0, 10)
      for (const time of times) {
        await connection.execute(slotSql, [spaceId, slotDate, time, space.capacity, 'open'])
      }
    }
  }
}

async function seed() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await seedAdmin(connection)
    await seedUsers(connection)
    await seedBooks(connection)
    await seedProducts(connection)
    await seedEvents(connection)
    await seedCommunityPosts(connection)
    await seedSpaces(connection)
    const seedSql = await readFile(seedSqlPath, 'utf8')
    await connection.query(seedSql)
    await connection.commit()
    console.log(`Database seed completed: 1 admin, 5 users, ${books.length} books, ${products.length} products, ${events.length} events, ${communitySeedPosts.length} posts`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

seed().catch((error) => {
  console.error('Database seed failed:', error.message)
  process.exitCode = 1
})
