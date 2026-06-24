import fs from 'node:fs/promises'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { assertPathInsideUploads } from '../utils/upload.js'

const scenesRequiringUser = new Set(['avatar', 'community', 'review'])
const scenesAllowingNullUser = new Set(['product', 'book', 'event', 'banner', 'system'])

function mapUploadFile(row) {
  return {
    id: row.id,
    userId: row.userId,
    scene: row.scene,
    fileType: row.fileType,
    originalName: row.originalName,
    storedName: row.storedName,
    mimeType: row.mimeType,
    size: Number(row.size),
    url: row.url,
    createdAt: row.createdAt,
  }
}

function createUploadError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

function normalizeUserId(userId) {
  if (userId === null || userId === undefined || userId === '') return null
  const normalized = Number(userId)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
}

async function userExists(userId, connection) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId])
  return Boolean(rows[0])
}

async function resolveUploadUserId(userId, scene, connection) {
  const normalizedUserId = normalizeUserId(userId)

  if (scenesRequiringUser.has(scene)) {
    if (!normalizedUserId) throw createUploadError('请先登录后再上传文件', 401)
    if (!await userExists(normalizedUserId, connection)) {
      throw createUploadError('上传用户不存在或登录已失效', 400)
    }
    return normalizedUserId
  }

  if (scenesAllowingNullUser.has(scene)) {
    if (!normalizedUserId) return null
    return await userExists(normalizedUserId, connection) ? normalizedUserId : null
  }

  throw createUploadError('上传场景无效', 400)
}

export async function createUploadFile(userId, meta, connection = pool) {
  const uploadUserId = await resolveUploadUserId(userId, meta.scene, connection)
  const [result] = await connection.execute(
    `INSERT INTO upload_files
      (user_id, scene, file_type, original_name, stored_name, mime_type, size, url, storage_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uploadUserId,
      meta.scene,
      meta.fileType,
      meta.originalName,
      meta.storedName,
      meta.mimeType,
      meta.size,
      meta.url,
      meta.storagePath,
    ],
  )
  return {
    id: result.insertId,
    scene: meta.scene,
    fileType: meta.fileType,
    mimeType: meta.mimeType,
    size: meta.size,
  }
}

export async function saveAvatarUpload(userId, meta) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const file = await createUploadFile(userId, meta, connection)
    await connection.execute('UPDATE user_avatars SET is_current = 0 WHERE user_id = ?', [userId])
    await connection.execute(`INSERT INTO user_avatars (user_id, avatar_url, source, is_current)
      VALUES (?, ?, 'upload', 1) ON DUPLICATE KEY UPDATE source = 'upload', is_current = 1`, [userId, meta.url])
    await connection.execute('UPDATE users SET avatar = ? WHERE id = ?', [meta.url, userId])
    await connection.commit()
    return { url: meta.url, file }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function saveCommunityUpload(userId, meta) {
  const file = await createUploadFile(userId, meta)
  return { url: meta.url, file }
}

export const saveProductUpload = saveCommunityUpload
export const saveReviewUpload = saveCommunityUpload
export const saveBookUpload = saveCommunityUpload
export const saveEventUpload = saveCommunityUpload

export async function listUploadFiles(query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 20)
  const clauses = []
  const params = []

  if (query.scene && query.scene !== 'all') {
    clauses.push('scene = ?')
    params.push(query.scene)
  }
  if (query.fileType && query.fileType !== 'all') {
    clauses.push('file_type = ?')
    params.push(query.fileType)
  }
  if (query.userId) {
    clauses.push('user_id = ?')
    params.push(query.userId)
  }
  if (query.startDate) {
    clauses.push('created_at >= ?')
    params.push(query.startDate)
  }
  if (query.endDate) {
    clauses.push('created_at <= ?')
    params.push(query.endDate)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM upload_files ${where}`, params)
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, scene, file_type AS fileType, original_name AS originalName,
      stored_name AS storedName, mime_type AS mimeType, size, url, created_at AS createdAt
     FROM upload_files ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    params,
  )

  return {
    items: rows.map(mapUploadFile),
    meta: { page, pageSize, total: Number(total) },
  }
}

export async function deleteUploadFile(id) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[file]] = await connection.execute(
      'SELECT id, storage_path AS storagePath FROM upload_files WHERE id = ? LIMIT 1',
      [id],
    )
    if (!file) {
      await connection.rollback()
      return false
    }

    await connection.execute('DELETE FROM upload_files WHERE id = ?', [id])
    await connection.commit()

    if (file.storagePath) {
      const safePath = assertPathInsideUploads(file.storagePath)
      await fs.unlink(safePath).catch((error) => {
        if (error.code !== 'ENOENT') console.warn(`删除上传文件失败: ${error.message}`)
      })
    }
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
