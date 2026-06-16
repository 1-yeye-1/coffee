import { findAdminById, findUserById } from '../services/auth.service.js'
import { verifyToken } from '../utils/jwt.js'
import { failure } from '../utils/response.js'

function readToken(req) {
  const authorization = req.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

async function verifyAccount(req, res, expectedType) {
  const token = readToken(req)
  if (!token) {
    failure(res, 401, '请先登录', 401)
    return false
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    failure(res, 401, '登录状态已失效', 401)
    return false
  }

  if (payload.accountType !== expectedType) {
    failure(
      res,
      expectedType === 'admin' ? 403 : 401,
      expectedType === 'admin' ? '无管理员权限' : '请使用普通用户账号登录',
      expectedType === 'admin' ? 403 : 401,
    )
    return false
  }

  const account = expectedType === 'admin' ? await findAdminById(payload.id) : await findUserById(payload.id)
  if (!account || account.status !== 'active') {
    failure(res, 401, '账号不存在或已被禁用', 401)
    return false
  }

  if (expectedType === 'admin') req.admin = account
  req.user = account
  req.accountType = expectedType
  return true
}

export async function requireUser(req, res, next) {
  const verified = await verifyAccount(req, res, 'user')
  if (!verified) return false
  if (typeof next === 'function') return next()
  return true
}

export async function requireAdmin(req, res, next) {
  const verified = await verifyAccount(req, res, 'admin')
  if (!verified) return false
  if (typeof next === 'function') return next()
  return true
}

export async function optionalUser(req, _res) {
  const token = readToken(req)
  if (!token) return true
  try {
    const payload = verifyToken(token)
    if (payload.accountType !== 'user') return true
    const user = await findUserById(payload.id)
    if (user?.status === 'active') {
      req.user = user
      req.accountType = 'user'
    }
  } catch {
    return true
  }
  return true
}

export const requireAuth = requireUser
