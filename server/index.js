import { createServer } from 'node:http'

import { env } from './config/env.js'
import { checkDatabaseConnection, pool } from './db/mysql.js'
import { applyCors } from './middlewares/cors.js'
import { handleError } from './middlewares/error.js'
import { createRouter } from './routes/index.js'
import { failure, success } from './utils/response.js'

const router = createRouter()

function attachResponseHelpers(res) {
  res.json = (statusCode, payload) => {
    if (res.writableEnded) return
    const body = JSON.stringify(payload)
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
  }
}

async function readJsonBody(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return {}
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 1024 * 1024) throw new Error('请求体不能超过 1MB')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('请求 JSON 格式不正确')
    error.statusCode = 400
    throw error
  }
}

const server = createServer(async (req, res) => {
  attachResponseHelpers(res)
  if (applyCors(req, res)) return

  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)
    req.pathname = url.pathname
    req.query = Object.fromEntries(url.searchParams.entries())
    req.body = await readJsonBody(req)

    if (req.method === 'GET' && req.pathname === '/api/health') {
      return success(res, { database: env.db.name })
    }

    if (req.method === 'GET' && req.pathname === '/api') {
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
    }

    const handled = await router.handle(req, res)
    if (!handled) failure(res, 404, '接口不存在', 404)
  } catch (error) {
    if (error.statusCode === 400) return failure(res, 400, error.message)
    handleError(error, res)
  }
})

async function start() {
  await checkDatabaseConnection()
  server.listen(env.serverPort, '127.0.0.1', () => {
    console.log(`Coffee Book API running at http://127.0.0.1:${env.serverPort}/api`)
  })
}

async function shutdown() {
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
