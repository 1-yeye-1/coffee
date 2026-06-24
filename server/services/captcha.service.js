import { randomBytes, randomInt, randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'

const ttlMs = 5 * 60 * 1000
const maxAttempts = 5
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function createCode(length = 5) {
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('')
}

function createSvg(code) {
  const width = 150
  const height = 48
  const background = `#${randomBytes(3).toString('hex')}`
  const lines = Array.from({ length: 7 }, () => `<line x1="${randomInt(0, width)}" y1="${randomInt(0, height)}" x2="${randomInt(0, width)}" y2="${randomInt(0, height)}" stroke="#${randomBytes(3).toString('hex')}" stroke-opacity=".45" />`).join('')
  const dots = Array.from({ length: 28 }, () => `<circle cx="${randomInt(0, width)}" cy="${randomInt(0, height)}" r="${randomInt(1, 3)}" fill="#fff" fill-opacity=".55" />`).join('')
  const letters = [...code].map((character, index) => {
    const x = 19 + index * 27
    return `<text x="${x}" y="34" transform="rotate(${randomInt(-18, 19)} ${x} 24)" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="700">${character}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="8" fill="${background}"/>${lines}${dots}${letters}</svg>`
}

export async function issueCaptcha() {
  const captchaId = randomUUID()
  const code = createCode()
  await pool.execute('DELETE FROM image_captchas WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL')
  await pool.execute(
    'INSERT INTO image_captchas (captcha_id, code_hash, expires_at) VALUES (?, ?, ?)',
    [captchaId, await hashPassword(code), new Date(Date.now() + ttlMs)],
  )
  return { captchaId, image: `data:image/svg+xml;base64,${Buffer.from(createSvg(code)).toString('base64')}`, expiresIn: ttlMs / 1000 }
}

export const generateCaptcha = issueCaptcha

export async function verifyCaptcha(id, input, connection = pool) {
  const key = String(id || '')
  const [rows] = await connection.execute(
    'SELECT id, code_hash AS codeHash, attempts FROM image_captchas WHERE captcha_id = ? AND used_at IS NULL AND expires_at >= CURRENT_TIMESTAMP FOR UPDATE',
    [key],
  )
  const challenge = rows[0]
  if (!challenge) throw Object.assign(new Error('图片验证码已过期，请刷新后重试'), { statusCode: 400 })
  const matches = await verifyPassword(String(input || '').trim().toUpperCase(), challenge.codeHash)
  if (matches) {
    await connection.execute('UPDATE image_captchas SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [challenge.id])
    return true
  }
  const attempts = Number(challenge.attempts) + 1
  await connection.execute('UPDATE image_captchas SET attempts = ?, used_at = IF(? >= ?, CURRENT_TIMESTAMP, used_at) WHERE id = ?', [attempts, attempts, maxAttempts, challenge.id])
  throw Object.assign(new Error('图片验证码错误'), { statusCode: 400 })
}
