import mysql from 'mysql2/promise'

import { env } from '../config/env.js'

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
})

export async function checkDatabaseConnection() {
  const connection = await pool.getConnection()
  try {
    await connection.ping()
  } finally {
    connection.release()
  }
}
