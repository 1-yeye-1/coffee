import { failure } from '../utils/response.js'

const DEFAULT_WINDOW_MS = 60 * 1000
const buckets = new Map()

function clientKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || req.ip
    || 'local'
}

export function securityHeaders(req, res, next) {
  req.app?.disable?.('x-powered-by')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  )
  next()
}

export function rateLimit({ key = 'global', limit = 60, windowMs = DEFAULT_WINDOW_MS } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const bucketKey = `${key}:${clientKey(req)}`
    const current = buckets.get(bucketKey)

    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
      return next()
    }

    current.count += 1
    if (current.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
      return failure(res, 429, '请求过于频繁，请稍后再试', 429)
    }
    return next()
  }
}
