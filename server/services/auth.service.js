import { randomInt } from 'node:crypto'

import { env } from '../config/env.js'
import { pool } from '../db/mysql.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'
import { createNotification } from './notifications.service.js'

const userColumns = `
  id, username, nickname, email, phone, avatar, role, status, points, level,
  profile_public AS profilePublic,
  created_at AS createdAt, updated_at AS updatedAt
`
const adminColumns = `
  id, username, phone, nickname, avatar, status, last_login_at AS lastLoginAt,
  created_at AS createdAt, updated_at AS updatedAt
`
const phonePattern = /^1\d{10}$/
const codeScenes = new Set(['login', 'register', 'change_phone_old', 'change_phone_new', 'booking_guest'])

export function normalizePhone(phone) {
  return String(phone || '').trim()
}

export function assertPhone(phone) {
  if (!phonePattern.test(normalizePhone(phone))) {
    throw Object.assign(new Error('请输入 11 位中国大陆手机号'), { statusCode: 400 })
  }
}

export async function findUserByIdentifier(identifier, connection = pool) {
  const value = String(identifier || '').trim()
  const [rows] = await connection.execute(
    `SELECT ${userColumns}, password_hash AS passwordHash
     FROM users WHERE username = ? OR phone = ? LIMIT 1`,
    [value, value],
  )
  return rows[0] || null
}

export async function findUserById(id) {
  const [rows] = await pool.execute(`SELECT ${userColumns} FROM users WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function findAdminById(id) {
  const [rows] = await pool.execute(`SELECT ${adminColumns} FROM admin_users WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function findAdminByIdentifier(identifier, connection = pool) {
  const value = String(identifier || '').trim()
  const [rows] = await connection.execute(
    `SELECT ${adminColumns}, password_hash AS passwordHash
     FROM admin_users WHERE username = ? OR phone = ? LIMIT 1`,
    [value, value],
  )
  return rows[0] || null
}

export async function phoneExists(phone, connection = pool) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE phone = ? LIMIT 1', [normalizePhone(phone)])
  return Boolean(rows[0])
}

export async function createUser(payload, connection = pool) {
  const phone = normalizePhone(payload.phone)
  const username = String(payload.username || phone).trim()
  const nickname = String(payload.nickname || `用户${phone.slice(-4)}`).trim()
  const passwordHash = await hashPassword(payload.password)
  const [result] = await connection.execute(
    `INSERT INTO users (username, nickname, phone, email, password_hash, role, status, points, level)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', 100, '普通会员')`,
    [username, nickname, phone, payload.email || null, passwordHash],
  )
  const userId = result.insertId
  await connection.execute(
    `INSERT INTO user_points (user_id, points, type, source, description)
     VALUES (?, 100, 'earn', 'register', '注册欢迎积分')`,
    [userId],
  )
  await createNotification({
    userId,
    title: '欢迎加入 Coffee Book',
    content: '欢迎来到 Coffee Book，在这里探索咖啡、阅读与生活方式。',
    type: 'system',
  }, connection)
  const [rows] = await connection.execute(`SELECT ${userColumns} FROM users WHERE id = ?`, [userId])
  return rows[0]
}

export async function sendVerificationCode(phone, scene = 'login') {
  const normalizedPhone = normalizePhone(phone)
  assertPhone(normalizedPhone)
  if (!codeScenes.has(scene)) throw Object.assign(new Error('验证码场景无效'), { statusCode: 400 })

  const [[latest]] = await pool.execute(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, CURRENT_TIMESTAMP) AS secondsAgo
     FROM verification_codes WHERE phone = ? AND scene = ? ORDER BY id DESC LIMIT 1`,
    [normalizedPhone, scene],
  )
  if (latest && Number(latest.secondsAgo) < 60) {
    throw Object.assign(new Error('验证码发送过于频繁，请稍后再试'), { statusCode: 429 })
  }

  const [[daily]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM verification_codes
     WHERE phone = ? AND scene = ? AND DATE(created_at) = CURRENT_DATE`,
    [normalizedPhone, scene],
  )
  if (Number(daily.total) >= 10) {
    throw Object.assign(new Error('今日验证码发送次数已达上限'), { statusCode: 429 })
  }

  const code = String(randomInt(100000, 1000000))
  const codeHash = await hashPassword(code)
  await pool.execute(
    `INSERT INTO verification_codes (phone, scene, code_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE))`,
    [normalizedPhone, scene, codeHash],
  )

  if (env.nodeEnv !== 'production') {
    const sceneLabel = scene === 'login'
      ? '登录'
      : scene === 'register'
        ? '注册'
        : scene === 'change_phone_old'
          ? '当前手机号验证'
          : scene === 'booking_guest' ? '游客预约' : '新手机号验证'
    console.log(`[DEV SMS CODE] 手机号 ${normalizedPhone} 的${sceneLabel}验证码是：${code}`)
  }

  return {
    phone: normalizedPhone,
    scene,
    expiresIn: 300,
    cooldown: 60,
  }
}

export async function verifyCode(phone, scene, code, connection = pool) {
  const normalizedPhone = normalizePhone(phone)
  assertPhone(normalizedPhone)
  if (!String(code || '').trim()) throw Object.assign(new Error('请输入验证码'), { statusCode: 400 })

  const [rows] = await connection.execute(
    `SELECT id, code_hash AS codeHash FROM verification_codes
     WHERE phone = ? AND scene = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY id DESC LIMIT 1`,
    [normalizedPhone, scene],
  )
  const record = rows[0]
  if (!record || !await verifyPassword(String(code).trim(), record.codeHash)) {
    throw Object.assign(new Error('验证码无效或已过期'), { statusCode: 400 })
  }
  await connection.execute('UPDATE verification_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id])
}

export async function authenticate(payload) {
  const identifier = String(payload.phone || payload.username || '').trim()
  if (!identifier) throw Object.assign(new Error('请输入手机号或用户名'), { statusCode: 400 })

  const user = await findUserByIdentifier(identifier)
  if (!user) throw Object.assign(new Error('账号不存在'), { statusCode: 401 })
  if (user.status !== 'active') throw Object.assign(new Error('账号不存在或已被禁用'), { statusCode: 401 })

  if (payload.code) {
    if (!user.phone) throw Object.assign(new Error('该账号未绑定手机号'), { statusCode: 400 })
    await verifyCode(user.phone, 'login', payload.code)
  } else if (!payload.password || !await verifyPassword(payload.password, user.passwordHash)) {
    throw Object.assign(new Error('手机号、用户名或密码错误'), { statusCode: 401 })
  }

  const { passwordHash, ...safeUser } = user
  return safeUser
}

export async function authenticateAdmin(payload) {
  const identifier = String(payload.username || payload.phone || '').trim()
  const password = String(payload.password || '')
  if (!identifier || !password) throw Object.assign(new Error('请输入管理员账号和密码'), { statusCode: 400 })

  const admin = await findAdminByIdentifier(identifier)
  if (!admin || !await verifyPassword(password, admin.passwordHash)) {
    throw Object.assign(new Error('当前账号不是管理员或密码错误'), { statusCode: 401 })
  }
  if (admin.status !== 'active') throw Object.assign(new Error('管理员账号已被禁用'), { statusCode: 403 })
  await pool.execute('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [admin.id])

  const { passwordHash, ...safeAdmin } = admin
  return safeAdmin
}
