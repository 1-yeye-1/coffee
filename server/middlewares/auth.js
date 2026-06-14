import { failure } from '../utils/response.js'
import { verifyToken } from '../utils/jwt.js'

export function requireAuth(req, res) {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) {
    failure(res, 401, '请先登录', 401)
    return false
  }

  try {
    req.user = verifyToken(token)
    return true
  } catch {
    failure(res, 401, '登录状态已失效', 401)
    return false
  }
}

export function requireAdmin(req, res) {
  if (!requireAuth(req, res)) return false
  if (req.user.role !== 'admin') {
    failure(res, 403, '无管理员权限', 403)
    return false
  }
  return true
}
