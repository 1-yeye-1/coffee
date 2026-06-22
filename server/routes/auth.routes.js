import { pool } from '../db/mysql.js'
import { requireUser } from '../middlewares/auth.js'
import {
  assertPhone,
  authenticate,
  createUser,
  findUserById,
  phoneExists,
  sendVerificationCode,
  verifyCode,
} from '../services/auth.service.js'
import { signUserToken } from '../utils/jwt.js'
import { failure, success } from '../utils/response.js'
import { issueCaptcha } from '../services/captcha.service.js'

function serializeSession(user) {
  return {
    token: signUserToken(user),
    user,
  }
}

async function sendCode(req, res) {
  const data = await sendVerificationCode(req.body.phone, req.body.scene || 'login')
  return success(res, data, '验证码已发送')
}

export function registerAuthRoutes(router) {
  router.get('/api/auth/captcha', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    return success(res, await issueCaptcha())
  })

  router.post('/api/auth/send-code', sendCode)
  router.post('/api/auth/sms-code', sendCode)

  router.post('/api/auth/register', async (req, res) => {
    const phone = String(req.body.phone || '').trim()
    const password = String(req.body.password || '')
    const confirmPassword = String(req.body.confirmPassword || password)

    assertPhone(phone)
    if (password.length < 6) return failure(res, 400, '密码至少需要 6 位')
    if (password !== confirmPassword) return failure(res, 400, '两次输入的密码不一致')

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (await phoneExists(phone, connection)) {
        throw Object.assign(new Error('该手机号已注册'), { statusCode: 409 })
      }
      await verifyCode(phone, 'register', req.body.code, connection)
      const user = await createUser({ ...req.body, phone, password }, connection)
      await connection.commit()
      return success(res, serializeSession(user), '注册成功', 201)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  })

  router.post('/api/auth/login', async (req, res) => {
    const user = await authenticate(req.body)
    return success(res, serializeSession(user), '登录成功')
  })

  router.get('/api/auth/me', requireUser, async (req, res) => {
    const user = await findUserById(req.user.id)
    if (!user) return failure(res, 404, '用户不存在', 404)
    return success(res, user)
  })

  router.post('/api/auth/logout', requireUser, async (_req, res) => {
    return success(res, {}, '已退出登录')
  })
}
