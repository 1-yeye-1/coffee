import { pool } from '../db/mysql.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'

const publicColumns = `
  id, username, nickname, email, phone, avatar, role, status, points, level,
  created_at AS createdAt, updated_at AS updatedAt
`

export async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    `SELECT ${publicColumns}, password_hash AS passwordHash
     FROM users WHERE username = ? LIMIT 1`,
    [username],
  )
  return rows[0] || null
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT ${publicColumns} FROM users WHERE id = ? LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

export async function usernameExists(username) {
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username],
  )
  return rows.length > 0
}

export async function emailExists(email) {
  if (!email) return false
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  )
  return rows.length > 0
}

export async function createUser({ username, password, nickname, email, phone }) {
  const passwordHash = await hashPassword(password)
  const [result] = await pool.execute(
    `INSERT INTO users (username, nickname, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [username, nickname, email, phone, passwordHash],
  )
  return findUserById(result.insertId)
}

export async function authenticate(username, password) {
  const user = await findUserByUsername(username)
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null
  const { passwordHash, ...safeUser } = user
  return safeUser
}
