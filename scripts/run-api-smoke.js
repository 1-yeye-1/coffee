import { spawn } from 'node:child_process'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const baseURL = String(process.env.SMOKE_API_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 4173}/api`).replace(/\/$/, '')
const database = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  name: process.env.DB_NAME || 'coffee',
}
let server

function databaseUnavailableMessage(error) {
  return [
    `MySQL 连接失败：无法连接 ${database.host}:${database.port}`,
    `当前 DB_NAME：${database.name}`,
    '请先启动 MySQL，并确认 .env 中的 DB_HOST、DB_PORT、DB_USER 和 DB_PASSWORD 正确。',
    '首次初始化请运行：npm run db:init',
    '已有数据库仅执行迁移可运行：node server/db/migrate.js',
    `原始错误：${error?.code || error?.message || '未知连接错误'}`,
  ].join('\n')
}

async function ensureDatabaseReady() {
  let pool
  try {
    const databaseModule = await import('../server/db/mysql.js')
    pool = databaseModule.pool
    await databaseModule.checkDatabaseConnection()
  } catch (error) {
    throw new Error(databaseUnavailableMessage(error))
  } finally {
    if (pool) await pool.end()
  }
}

async function isReady() {
  try { return (await fetch(`${baseURL}/health`)).ok } catch { return false }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isReady()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('API server did not become ready')
}

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/smoke-api.js'], { stdio: 'inherit', env: process.env })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`API smoke exited with code ${code}`)))
  })
}

try {
  await ensureDatabaseReady()
  if (!await isReady()) {
    server = spawn(process.execPath, ['server/index.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    server.stdout.on('data', (data) => process.stdout.write(data))
    server.stderr.on('data', (data) => process.stderr.write(data))
    await waitForServer()
  }
  await runSmoke()
} catch (error) {
  console.error(`\n${error.message}\n`)
  process.exitCode = 1
} finally {
  if (server && !server.killed) server.kill()
}
