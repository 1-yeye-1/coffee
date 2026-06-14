import {
  authenticate,
  createUser,
  emailExists,
  findUserById,
  usernameExists,
} from '../services/auth.service.js'
import { requireAuth } from '../middlewares/auth.js'
import { signToken } from '../utils/jwt.js'
import { failure, success } from '../utils/response.js'
import { isEmail, normalizeOptional, requiredString } from '../utils/validator.js'

export function registerAuthRoutes(router) {
  router.post('/api/auth/register', async (req, res) => {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')
    const nickname = normalizeOptional(req.body.nickname)
    const email = normalizeOptional(req.body.email)
    const phone = normalizeOptional(req.body.phone)

    if (!requiredString(username)) return failure(res, 400, 'username 必填')
    if (!requiredString(password)) return failure(res, 400, 'password 必填')
    if (password.length < 6) return failure(res, 400, 'password 长度至少 6 位')
    if (!isEmail(email)) return failure(res, 400, 'email 格式不正确')
    if (await usernameExists(username)) return failure(res, 400, 'username 已存在')
    if (await emailExists(email)) return failure(res, 400, 'email 已存在')

    try {
      const user = await createUser({ username, password, nickname, email, phone })
      return success(res, user, '注册成功', 201)
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return failure(res, 400, '账号信息已存在')
      throw error
    }
  })

  router.post('/api/auth/login', async (req, res) => {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')
    if (!username || !password) return failure(res, 400, '请输入账号和密码')

    const user = await authenticate(username, password)
    if (!user) return failure(res, 400, '账号或密码错误')
    if (user.status === 'disabled') return failure(res, 403, '账号已被禁用', 403)

    return success(res, { token: signToken(user), user })
  })

  router.get('/api/auth/me', requireAuth, async (req, res) => {
    const user = await findUserById(req.user.id)
    if (!user) return failure(res, 404, '用户不存在', 404)
    return success(res, user)
  })

  router.post('/api/auth/logout', requireAuth, async (_req, res) => success(res))
}
