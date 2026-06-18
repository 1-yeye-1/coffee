import { pool } from '../db/mysql.js'
import { assertPhone, normalizePhone, phoneExists, verifyCode } from './auth.service.js'
import { createNotification, listNotifications as listUserNotifications, markAsRead } from './notifications.service.js'
import { writeAudit } from './admin.service.js'

const userSelect = `
  id, username, nickname, email, phone, avatar, status, points, level,
  profile_public AS profilePublic,
  created_at AS createdAt, updated_at AS updatedAt
`

const currentPhoneVerifications = new Map()

export function maskPhone(phone) {
  const value = String(phone || '')
  return value.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function mapUser(row) {
  if (!row) return null
  return {
    ...row,
    profilePublic: row.profilePublic === undefined ? true : Boolean(row.profilePublic),
    phoneMasked: maskPhone(row.phone),
  }
}

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
    user: mapUser(user),
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
  return mapUser(user)
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
    phone: maskPhone(user?.phone || ''),
    passwordUpdatedAt: user?.passwordUpdatedAt || null,
    loginProtection: true,
    smsVerification: Boolean(user?.phone),
  }
}

export async function updatePrivacy(userId, payload) {
  const profilePublic = payload.profilePublic ? 1 : 0
  await pool.execute('UPDATE users SET profile_public = ? WHERE id = ? AND role = "user"', [profilePublic, userId])
  await writeAudit(userId, 'user.privacy.update', 'account', { profilePublic: Boolean(profilePublic) })
  const [[user]] = await pool.execute(
    `SELECT ${userSelect} FROM users WHERE id = ? AND role = 'user' LIMIT 1`,
    [userId],
  )
  return mapUser(user)
}

export async function getPublicProfile(userId) {
  const [[user]] = await pool.execute(
    `SELECT id, nickname, username, avatar, created_at AS createdAt,
      profile_public AS profilePublic
     FROM users WHERE id = ? AND role = 'user' AND status = 'active' LIMIT 1`,
    [userId],
  )
  if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 })
  if (!Boolean(user.profilePublic)) {
    throw Object.assign(new Error('该用户已关闭个人主页访问'), { statusCode: 403 })
  }

  const [[postsCount], [likesCount], [posts]] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE user_id = ? AND status = 'published'", [userId]),
    pool.execute(
      `SELECT COUNT(*) AS total
       FROM post_likes pl
       INNER JOIN posts p ON p.id = pl.post_id
       WHERE p.user_id = ? AND p.status = 'published'`,
      [userId],
    ),
    pool.execute(
      `SELECT id, slug, title, topic, excerpt, likes_count AS likes,
        comments_count AS commentsCount, created_at AS createdAt
       FROM posts WHERE user_id = ? AND status = 'published'
       ORDER BY created_at DESC, id DESC LIMIT 20`,
      [userId],
    ),
  ])

  return {
    id: user.id,
    nickname: user.nickname || user.username,
    avatar: user.avatar,
    createdAt: user.createdAt,
    postsCount: Number(postsCount[0].total),
    likesCount: Number(likesCount[0].total),
    posts,
  }
}

export async function verifyCurrentPhone(userId, code) {
  const [[user]] = await pool.execute('SELECT phone FROM users WHERE id = ? AND role = "user" LIMIT 1', [userId])
  if (!user?.phone) throw Object.assign(new Error('当前账号未绑定手机号'), { statusCode: 400 })
  await verifyCode(user.phone, 'change_phone_old', code)
  currentPhoneVerifications.set(Number(userId), Date.now() + 10 * 60 * 1000)
  await writeAudit(userId, 'user.phone.verify_current', 'account', { userId })
  return { verified: true, expiresIn: 600 }
}

export async function changePhone(userId, payload) {
  const newPhone = normalizePhone(payload.newPhone)
  assertPhone(newPhone)
  const verifiedUntil = currentPhoneVerifications.get(Number(userId)) || 0
  if (verifiedUntil < Date.now()) {
    throw Object.assign(new Error('请先完成当前手机号验证'), { statusCode: 400 })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[user]] = await connection.execute(
      'SELECT phone FROM users WHERE id = ? AND role = "user" LIMIT 1 FOR UPDATE',
      [userId],
    )
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 })
    if (newPhone === user.phone) throw Object.assign(new Error('新手机号不能与当前手机号相同'), { statusCode: 400 })
    if (await phoneExists(newPhone, connection)) throw Object.assign(new Error('该手机号已被其他账号绑定'), { statusCode: 409 })

    await verifyCode(newPhone, 'change_phone_new', payload.newPhoneCode, connection)
    await connection.execute('UPDATE users SET phone = ? WHERE id = ? AND role = "user"', [newPhone, userId])
    await writeAudit(userId, 'user.phone.change', 'account', { userId }, connection)
    await createNotification({
      userId,
      title: '手机号已成功更换',
      content: '你的手机号已成功更换，请妥善保管账号安全。',
      type: 'system',
    }, connection)
    await connection.commit()
    currentPhoneVerifications.delete(Number(userId))
    const [[updated]] = await pool.execute(`SELECT ${userSelect} FROM users WHERE id = ? LIMIT 1`, [userId])
    return mapUser(updated)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
