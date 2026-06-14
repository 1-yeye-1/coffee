import { env } from '../config/env.js'
import { failure } from '../utils/response.js'

export function handleError(error, res) {
  console.error(error)
  if (error.statusCode && error.statusCode < 500) {
    return failure(res, error.statusCode, error.message, error.statusCode)
  }
  if (error.code === 'ER_DUP_ENTRY') return failure(res, 400, 'slug 已存在', 400)
  const message = env.nodeEnv === 'production' ? '服务器内部错误' : error.message
  if (!res.writableEnded) failure(res, 500, message, 500)
}
