import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '../config/env.js'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(input) {
  return createHmac('sha256', env.jwtSecret).update(input).digest('base64url')
}

function signPayload(payload) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const body = encode({ ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS })
  const input = `${header}.${body}`
  return `${input}.${sign(input)}`
}

export function signUserToken(user) {
  return signPayload({
    id: user.id,
    phone: user.phone,
    accountType: 'user',
  })
}

export function signAdminToken(admin) {
  return signPayload({
    id: admin.id,
    username: admin.username,
    phone: admin.phone,
    accountType: 'admin',
  })
}

export const signToken = signUserToken

export function verifyToken(token) {
  const [header, payload, signature] = String(token || '').split('.')
  if (!header || !payload || !signature) throw new Error('Invalid token')

  const expected = Buffer.from(sign(`${header}.${payload}`))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid token')
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }
  return decoded
}
