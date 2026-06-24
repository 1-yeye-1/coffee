import { failure } from '../utils/response.js'

export function handleError(error, res) {
  if (res.headersSent) return undefined
  if (error.statusCode && error.statusCode < 500) {
    return failure(res, error.statusCode, error.message, error.statusCode)
  }
  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE' ? '上传文件大小超过限制' : '文件上传失败'
    return failure(res, 400, message, 400)
  }
  if (error.code === 'ER_DUP_ENTRY') return failure(res, 400, '记录已存在', 400)
  console.error(error)
  return failure(res, 500, '服务器内部错误', 500)
}
