import { requireUser } from '../middlewares/auth.js'
import {
  changePhone,
  getAccountOverview,
  getPublicProfile,
  getSecuritySettings,
  listAddresses,
  listMyPosts,
  listPointRecords,
  saveAddress,
  updatePrivacy,
  updateProfile,
  verifyCurrentPhone,
} from '../services/account.service.js'
import { success } from '../utils/response.js'

export function registerAccountRoutes(router) {
  router.get('/api/account/overview', requireUser, async (req, res) => {
    return success(res, await getAccountOverview(req.user.id))
  })

  router.patch('/api/account/profile', requireUser, async (req, res) => {
    return success(res, await updateProfile(req.user.id, req.body), '个人资料已保存')
  })

  router.patch('/api/account/privacy', requireUser, async (req, res) => {
    return success(res, await updatePrivacy(req.user.id, req.body), '隐私设置已保存')
  })

  router.get('/api/account/security', requireUser, async (req, res) => {
    return success(res, await getSecuritySettings(req.user.id))
  })

  router.post('/api/account/security/verify-current-phone', requireUser, async (req, res) => {
    return success(res, await verifyCurrentPhone(req.user.id, req.body.code), '当前手机号验证通过')
  })

  router.patch('/api/account/security/phone', requireUser, async (req, res) => {
    return success(res, await changePhone(req.user.id, req.body), '手机号更换成功，请妥善保管账号安全')
  })

  router.get('/api/account/points', requireUser, async (req, res) => {
    return success(res, await listPointRecords(req.user.id))
  })

  router.get('/api/account/addresses', requireUser, async (req, res) => {
    return success(res, await listAddresses(req.user.id))
  })

  router.post('/api/account/addresses', requireUser, async (req, res) => {
    return success(res, await saveAddress(req.user.id, req.body), '地址已保存', 201)
  })

  router.put('/api/account/addresses/:id', requireUser, async (req, res) => {
    return success(res, await saveAddress(req.user.id, { ...req.body, id: req.params.id }), '地址已保存')
  })

  router.get('/api/account/posts', requireUser, async (req, res) => {
    return success(res, await listMyPosts(req.user.id))
  })

  router.get('/api/users/:id/profile', async (req, res) => {
    return success(res, await getPublicProfile(req.params.id))
  })
}
