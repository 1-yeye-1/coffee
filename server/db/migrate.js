import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

import { env } from '../config/env.js'

const schemaPath = fileURLToPath(new URL('../sql/schema.sql', import.meta.url))

async function migrate() {
  const sql = await readFile(schemaPath, 'utf8')
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    charset: 'utf8mb4',
    multipleStatements: true,
  })

  try {
    await connection.query(sql)
    console.log('Database migration completed: coffee (schema.sql)')
  } finally {
    await connection.end()
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error.message)
  process.exitCode = 1
})
