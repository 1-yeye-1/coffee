import { pool } from '../db/mysql.js'
import { listNotifications as listUserNotifications, markAsRead } from './notifications.service.js'
import { writeAudit } from './admin.service.js'

const userSelect = `
  id, username, nickname, email, phone, avatar, status, points, level,
  created_at AS createdAt, updated_at AS updatedAt
`

export async function getAccountOverview(userId) {
  const [[user]] = await pool.execute(
    `SELECT ${userSelect} FROM users WHERE id = ? AND role = 'user' LIMIT 1`,
    [userId],
  )
  const [[orders], [bookings], [posts], [unread], [addresses]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM posts WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM user_notifications WHERE user_id = ? AND is_read = 0', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?', [userId]),
  ])
  return {
    user,
    stats: {
      orders: Number(orders[0].total),
      bookings: Number(bookings[0].total),
      posts: Number(posts[0].total),
      unreadNotifications: Number(unread[0].total),
      addresses: Number(addresses[0].total),
    },
  }
}

export async function updateProfile(userId, payload) {
  const nickname = String(payload.nickname || '').trim()
  const email = String(payload.email || '').trim() || null
  if (!nickname) throw Object.assign(new Error('昵称必填'), { statusCode: 400 })
  await pool.execute('UPDATE users SET nickname = ?, email = ? WHERE id = ? AND role = "user"', [nickname, email, userId])
  await writeAudit(userId, 'user.profile.update', 'account', { userId })
  const [[user]] = await pool.execute(
    `SELECT ${userSelect} FROM users WHERE id = ? AND role = 'user' LIMIT 1`,
    [userId],
  )
  return user
}

export async function listPointRecords(userId) {
  const [rows] = await pool.execute(
    `SELECT id, points, type, source, description, created_at AS createdAt
     FROM user_points WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId],
  )
  return rows
}

export async function listNotifications(userId) {
  return (await listUserNotifications(userId, { page: 1, pageSize: 100 })).items
}

export async function markNotificationRead(userId, id) {
  await markAsRead(userId, id)
  return listNotifications(userId)
}

export async function listAddresses(userId) {
  const [rows] = await pool.execute(
    `SELECT id, recipient, phone, region, detail, is_default AS isDefault,
      created_at AS createdAt, updated_at AS updatedAt
     FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`,
    [userId],
  )
  return rows.map((item) => ({ ...item, isDefault: Boolean(item.isDefault) }))
}

export async function saveAddress(userId, payload) {
  const id = payload.id ? Number(payload.id) : null
  const recipient = String(payload.recipient || '').trim()
  const phone = String(payload.phone || '').trim()
  const region = String(payload.region || '').trim()
  const detail = String(payload.detail || '').trim()
  const isDefault = payload.isDefault ? 1 : 0
  if (!recipient || !phone || !region || !detail) {
    throw Object.assign(new Error('地址信息不完整'), { statusCode: 400 })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    if (isDefault) await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId])
    if (id) {
      await connection.execute(
        `UPDATE user_addresses SET recipient = ?, phone = ?, region = ?, detail = ?, is_default = ?
         WHERE id = ? AND user_id = ?`,
        [recipient, phone, region, detail, isDefault, id, userId],
      )
    } else {
      await connection.execute(
        `INSERT INTO user_addresses (user_id, recipient, phone, region, detail, is_default)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, recipient, phone, region, detail, isDefault],
      )
    }
    await writeAudit(userId, 'user.address.save', 'account', { id }, connection)
    await connection.commit()
    return listAddresses(userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function listMyPosts(userId) {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, topic, excerpt, status, featured,
      likes_count AS likes, comments_count AS commentsCount,
      created_at AS createdAt, updated_at AS updatedAt
     FROM posts WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId],
  )
  return rows.map((item) => ({ ...item, featured: Boolean(item.featured) }))
}

export async function getSecuritySettings(userId) {
  const [[user]] = await pool.execute(
    'SELECT id, phone, updated_at AS passwordUpdatedAt FROM users WHERE id = ? AND role = "user" LIMIT 1',
    [userId],
  )
  return {
    phone: user?.phone || '',
    passwordUpdatedAt: user?.passwordUpdatedAt || null,
    loginProtection: true,
    smsVerification: Boolean(user?.phone),
  }
}
