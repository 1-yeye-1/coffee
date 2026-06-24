import { pool } from '../db/mysql.js'
import { requireUser } from '../middlewares/auth.js'
import {
  assertPhone,
  authenticate,
  createUser,
  findUserById,
  loginByPassword,
  loginBySms,
  phoneExists,
  sendVerificationCode,
  verifyCode,
} from '../services/auth.service.js'
import { recordAudit } from '../services/audit.service.js'
import { generateCaptcha } from '../services/captcha.service.js'
import { issueBirthdayCoupon } from '../services/points.service.js'
import { signUserToken } from '../utils/jwt.js'
import { failure, success } from '../utils/response.js'

function serializeSession(user) {
  return {
    token: signUserToken(user),
    user,
  }
}

async function sendCode(req, res) {
  const data = await sendVerificationCode(req.body.phone, req.body.scene || 'login', {
    captchaId: req.body.captchaId,
    captchaCode: req.body.captchaCode,
  })
  return success(res, data, 'Verification code sent')
}

async function completeLogin(req, res, user) {
  await recordAudit({
    operatorId: user.id,
    actor: user,
    action: 'auth.login',
    module: 'auth',
    targetType: 'user',
    targetId: user.id,
    description: `User ${user.nickname || user.username} login`,
    req,
  })
  await issueBirthdayCoupon(user.id).catch((error) => console.warn(`Birthday coupon check failed: ${error.message}`))
  return success(res, serializeSession(user), 'Login successful')
}

export function registerAuthRoutes(router) {
  router.get('/api/auth/captcha', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    return success(res, await generateCaptcha())
  })

  router.post('/api/auth/send-code', sendCode)
  router.post('/api/auth/sms-code', sendCode)

  router.post('/api/auth/register', async (req, res) => {
    const phone = String(req.body.phone || '').trim()
    const password = String(req.body.password || '')
    const confirmPassword = String(req.body.confirmPassword || password)

    assertPhone(phone)
    if (password.length < 6) return failure(res, 400, 'Password must be at least 6 characters')
    if (password !== confirmPassword) return failure(res, 400, 'Passwords do not match')

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (await phoneExists(phone, connection)) {
        throw Object.assign(new Error('Phone number is already registered'), { statusCode: 409 })
      }
      await verifyCode(phone, 'register', req.body.code, connection)
      const user = await createUser({ ...req.body, phone, password }, connection)
      await recordAudit({
        operatorId: user.id,
        actor: user,
        action: 'auth.register',
        module: 'auth',
        targetType: 'user',
        targetId: user.id,
        description: `User ${user.nickname || user.username} registered`,
        req,
        connection,
      })
      await recordAudit({
        operatorId: user.id,
        actor: user,
        action: 'points.change',
        module: 'points',
        targetType: 'user',
        targetId: user.id,
        description: 'Registration reward +100',
        payload: { type: 'earn', source: 'register', points: 100 },
        req,
        connection,
      })
      await connection.commit()
      return success(res, serializeSession(user), 'Registration successful', 201)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  })

  router.post('/api/auth/login/sms', async (req, res) => {
    const user = await loginBySms(req.body)
    return completeLogin(req, res, user)
  })

  router.post('/api/auth/login/password', async (req, res) => {
    const user = await loginByPassword(req.body, { requireCaptcha: true })
    return completeLogin(req, res, user)
  })

  router.post('/api/auth/login', async (req, res) => {
    const user = await authenticate(req.body)
    return completeLogin(req, res, user)
  })

  router.get('/api/auth/me', requireUser, async (req, res) => {
    const user = await findUserById(req.user.id)
    if (!user) return failure(res, 404, 'User not found')
    return success(res, user)
  })

  router.post('/api/auth/logout', requireUser, async (req, res) => {
    await recordAudit({
      operatorId: req.user.id,
      actor: req.user,
      action: 'auth.logout',
      module: 'auth',
      targetType: 'user',
      targetId: req.user.id,
      description: `User ${req.user.nickname || req.user.username} logout`,
      req,
    })
    return success(res, {}, 'Logged out')
  })
}
