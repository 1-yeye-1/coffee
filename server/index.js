import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { checkDatabaseConnection, pool } from './db/mysql.js'
import { handleError } from './middlewares/error.js'
import { createRouter } from './routes/index.js'
import { failure, success } from './utils/response.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('CORS 来源不允许'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')))

app.get('/api/health', (_req, res) => {
  return success(res, { database: env.db.name })
})

app.get('/api', (_req, res) => {
  return success(res, {
    name: 'Coffee Book API',
    message: '后端接口服务运行正常，请访问 /api/health 或具体业务接口。',
    endpoints: [
      '/api/health',
      '/api/auth/send-code',
      '/api/auth/login',
      '/api/admin/auth/login',
      '/api/books',
      '/api/products',
      '/api/events',
      '/api/posts',
      '/api/spaces',
      '/api/admin/dashboard',
    ],
  })
})

app.use(createRouter())

app.use((req, res) => {
  return failure(res, 404, '接口不存在', 404)
})

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return failure(res, 400, '请求 JSON 格式不正确', 400)
  }
  if (error.message === 'CORS 来源不允许') {
    return failure(res, 403, 'CORS 来源不允许', 403)
  }
  return handleError(error, res)
})

let server

async function start() {
  await checkDatabaseConnection()
  server = app.listen(env.serverPort, '127.0.0.1', () => {
    console.log(`Coffee Book API running at http://127.0.0.1:${env.serverPort}/api`)
  })
}

async function shutdown() {
  if (!server) {
    await pool.end()
    process.exit(0)
  }
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((error) => {
  console.error('Server failed to start:', error.message)
  process.exitCode = 1
})
