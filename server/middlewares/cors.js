import { env } from '../config/env.js'

const allowedOrigins = new Set(
  env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

export function applyCors(req, res) {
  const origin = req.headers.origin
  if (allowedOrigins.has('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return true
  }
  return false
}
