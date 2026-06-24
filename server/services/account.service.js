import { pool } from '../db/mysql.js'
import { shanghaiDateString } from '../utils/date.js'
import { assertPhone, normalizePhone, phoneExists, verifyCode } from './auth.service.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'
import { createNotification, listNotifications as listUserNotifications, markAsRead } from './notifications.service.js'
import { writeAudit } from './admin.service.js'
import { getAccountOverviewStats, postCommentCountSql, postLikeCountSql } from './stats.service.js'

const userSelect = `
  id, username, nickname, email, phone, avatar, status, points, level,
  growth_value AS growthValue, DATE_FORMAT(last_checkin_date, '%Y-%m-%d') AS lastCheckinDate,
  profile_public AS profilePublic, gender, DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday, bio,
  disabled_reason AS disabledReason, booking_limit_until AS bookingLimitUntil,
  post_limit_until AS postLimitUntil,
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
  const [stats, [recentNotifications], [recentOrders], [recentBookings]] = await Promise.all([
    getAccountOverviewStats(userId),
    pool.execute('SELECT id, title, content, type, is_read AS isRead, created_at AS createdAt FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]),
    pool.execute('SELECT id, order_no AS orderNo, total_amount AS amount, status, created_at AS createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]),
    pool.execute('SELECT id, booking_no AS bookingNo, booking_date AS bookingDate, time_slot AS timeSlot, status, created_at AS createdAt FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]),
  ])
  return {
    user: mapUser(user),
    stats,
    recentNotifications: recentNotifications.map((item) => ({ ...item, isRead: Boolean(item.isRead) })),
    recentOrders: recentOrders.map((item) => ({ ...item, amount: Number(item.amount) })),
    recentBookings,
  }
}

const favoriteTypes = new Set(['book', 'product', 'post', 'event'])

function assertFavoriteType(type) {
  if (!favoriteTypes.has(type)) throw Object.assign(new Error('Invalid favorite type'), { statusCode: 400 })
}

export async function listFavorites(userId) {
  const [rows] = await pool.execute(
    `SELECT f.id, f.target_type AS targetType, f.target_id AS targetId, f.created_at AS createdAt,
      COALESCE(b.title, p.name, po.title, e.title) AS title,
      COALESCE(b.slug, p.slug, po.slug, e.slug) AS slug,
      COALESCE(b.category, p.category, po.topic, e.category) AS category,
      CASE f.target_type WHEN 'book' THEN b.author WHEN 'product' THEN p.origin
        WHEN 'post' THEN po.author WHEN 'event' THEN CONCAT(e.event_date, ' ', e.event_time) END AS meta
     FROM user_favorites f
     LEFT JOIN books b ON f.target_type = 'book' AND b.id = f.target_id
     LEFT JOIN products p ON f.target_type = 'product' AND p.id = f.target_id
     LEFT JOIN posts po ON f.target_type = 'post' AND po.id = f.target_id
     LEFT JOIN events e ON f.target_type = 'event' AND e.id = f.target_id
     WHERE f.user_id = ? ORDER BY f.created_at DESC, f.id DESC`,
    [userId],
  )
  return rows.filter((row) => row.title)
}

export async function addFavorite(userId, payload) {
  const targetType = String(payload.targetType || '').trim()
  const targetId = Number(payload.targetId)
  assertFavoriteType(targetType)
  if (!Number.isInteger(targetId) || targetId < 1) throw Object.assign(new Error('Invalid favorite target'), { statusCode: 400 })
  const table = { book: 'books', product: 'products', post: 'posts', event: 'events' }[targetType]
  const [[target]] = await pool.query(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [targetId])
  if (!target) throw Object.assign(new Error('Favorite target not found'), { statusCode: 404 })
  await pool.execute(
    `INSERT INTO user_favorites (user_id, target_type, target_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE created_at = created_at`,
    [userId, targetType, targetId],
  )
  const [rows] = await pool.execute('SELECT id, target_type AS targetType, target_id AS targetId, created_at AS createdAt FROM user_favorites WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1', [userId, targetType, targetId])
  return rows[0]
}

export async function removeFavorite(userId, favoriteId) {
  const [result] = await pool.execute('DELETE FROM user_favorites WHERE id = ? AND user_id = ?', [favoriteId, userId])
  return Number(result.affectedRows || 0) > 0
}

export async function updateProfile(userId, payload) {
  const nickname = String(payload.nickname || '').trim()
  const email = String(payload.email || '').trim() || null
  const gender = String(payload.gender || '').trim() || null
  const birthday = String(payload.birthday || '').trim() || null
  const bio = String(payload.bio || '').trim() || null
  if (!nickname) throw Object.assign(new Error('昵称必填'), { statusCode: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('邮箱格式不正确'), { statusCode: 400 })
  if (gender && !['female', 'male', 'other', 'private'].includes(gender)) throw Object.assign(new Error('性别选项无效'), { statusCode: 400 })
  if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || birthday > shanghaiDateString())) throw Object.assign(new Error('生日日期无效'), { statusCode: 400 })
  if (bio && bio.length > 500) throw Object.assign(new Error('个人简介不能超过 500 字'), { statusCode: 400 })
  await pool.execute('UPDATE users SET nickname = ?, email = ?, gender = ?, birthday = ?, bio = ? WHERE id = ? AND role = "user"', [nickname, email, gender, birthday, bio, userId])
  await writeAudit(userId, 'user.profile.update', 'account', { userId, changes: { nickname, emailChanged: payload.email !== undefined, gender, birthday, bioLength: bio?.length || 0 } })
  const [[user]] = await pool.execute(
    `SELECT ${userSelect} FROM users WHERE id = ? AND role = 'user' LIMIT 1`,
    [userId],
  )
  return mapUser(user)
}

export async function listAvatars(userId) {
  const [rows] = await pool.execute(`SELECT id, avatar_url AS avatarUrl, source,
    is_current AS isCurrent, created_at AS createdAt FROM user_avatars
    WHERE user_id = ? ORDER BY is_current DESC, created_at DESC, id DESC`, [userId])
  return rows.map((row) => ({ ...row, isCurrent: Boolean(row.isCurrent) }))
}

export async function selectAvatar(userId, avatarUrl, source = 'preset') {
  const url = String(avatarUrl || '').trim()
  if (!url) throw Object.assign(new Error('头像地址必填'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute('UPDATE user_avatars SET is_current = 0 WHERE user_id = ?', [userId])
    await connection.execute(`INSERT INTO user_avatars (user_id, avatar_url, source, is_current)
      VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE source = VALUES(source), is_current = 1`, [userId, url, source])
    await connection.execute('UPDATE users SET avatar = ? WHERE id = ? AND role = "user"', [url, userId])
    await writeAudit(userId, 'user.avatar.select', 'account', { source }, connection)
    await connection.commit()
    return listAvatars(userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function useAvatarHistory(userId, avatarId) {
  const [[avatar]] = await pool.execute('SELECT avatar_url AS avatarUrl FROM user_avatars WHERE id = ? AND user_id = ? LIMIT 1', [avatarId, userId])
  if (!avatar) throw Object.assign(new Error('历史头像不存在'), { statusCode: 404 })
  return selectAvatar(userId, avatar.avatarUrl, 'history')
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
      ${postLikeCountSql('posts')} AS likes,
      ${postCommentCountSql('posts')} AS commentsCount,
      created_at AS createdAt, updated_at AS updatedAt
     FROM posts WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId],
  )
  return rows.map((item) => ({ ...item, featured: Boolean(item.featured) }))
}

export async function changePassword(userId, payload) {
  const oldPassword = String(payload.oldPassword || '').trim()
  const newPassword = String(payload.newPassword || '').trim()
  if (!oldPassword || !newPassword) throw Object.assign(new Error('旧密码和新密码不能为空'), { statusCode: 400 })
  if (newPassword.length < 6) throw Object.assign(new Error('新密码不能少于 6 位'), { statusCode: 400 })
  if (oldPassword === newPassword) throw Object.assign(new Error('新密码不能与旧密码相同'), { statusCode: 400 })

  const [[user]] = await pool.execute(
    'SELECT id, password FROM users WHERE id = ? AND role = "user" LIMIT 1',
    [userId],
  )
  if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 })
  const valid = await verifyPassword(oldPassword, user.password)
  if (!valid) throw Object.assign(new Error('旧密码不正确'), { statusCode: 403 })

  const newHash = await hashPassword(newPassword)
  await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [newHash, userId])
  await writeAudit(userId, 'user.password.update', 'account', {})
  return { message: '密码修改成功' }
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
    `SELECT id, nickname, username, avatar, gender, bio, created_at AS createdAt,
      profile_public AS profilePublic
     FROM users WHERE id = ? AND role = 'user' AND status = 'active' LIMIT 1`,
    [userId],
  )
  if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 })
  if (!Boolean(user.profilePublic)) {
    throw Object.assign(new Error('该用户已关闭个人主页访问'), { statusCode: 403 })
  }

  const [[postsCount], [likesCount], [posts], [comments], [reviews]] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE user_id = ? AND status = 'published'", [userId]),
    pool.execute(
      `SELECT COUNT(*) AS total
       FROM post_likes pl
       INNER JOIN posts p ON p.id = pl.post_id
       WHERE p.user_id = ? AND p.status = 'published'`,
      [userId],
    ),
    pool.execute(
      `SELECT id, slug, title, topic, excerpt,
        ${postLikeCountSql('posts')} AS likes,
        ${postCommentCountSql('posts')} AS commentsCount,
        created_at AS createdAt
       FROM posts WHERE user_id = ? AND status = 'published'
       ORDER BY created_at DESC, id DESC LIMIT 20`,
      [userId],
    ),
    pool.execute(
      `SELECT c.id, c.content, c.post_id AS postId, p.slug AS postSlug, p.title AS postTitle,
        c.created_at AS createdAt
       FROM comments c
       INNER JOIN posts p ON p.id = c.post_id
       WHERE c.user_id = ? AND c.status = 'published'
       ORDER BY c.created_at DESC, c.id DESC LIMIT 10`,
      [userId],
    ),
    pool.execute(
      `SELECT r.id, r.content, r.rating, r.book_id AS bookId, r.parent_id AS parentId,
        b.slug AS bookSlug, b.title AS bookTitle, r.created_at AS createdAt, 'book' AS reviewType
       FROM book_reviews r
       LEFT JOIN books b ON b.id = r.book_id
       WHERE r.user_id = ? AND r.status = 'published' AND r.parent_id IS NULL
       ORDER BY r.created_at DESC, r.id DESC LIMIT 10`,
      [userId],
    ),
  ])

  return {
    id: user.id,
    nickname: user.nickname || user.username,
    avatar: user.avatar,
    gender: user.gender,
    bio: user.bio,
    createdAt: user.createdAt,
    postsCount: Number(postsCount[0].total),
    likesCount: Number(likesCount[0].total),
    posts,
    comments: comments || [],
    reviews: reviews || [],
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
