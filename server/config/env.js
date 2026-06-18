import dotenv from 'dotenv'

dotenv.config({ quiet: true })

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const databaseName = process.env.DB_NAME || 'coffee'

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may only contain letters, numbers, and underscores')
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  serverPort: Number(process.env.SERVER_PORT || 4173),
  corsOrigin: process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    name: databaseName,
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },
  jwtSecret: required('JWT_SECRET'),
})
