import { requireUser } from '../middlewares/auth.js'
import {
  getAccountOverview,
  getSecuritySettings,
  listAddresses,
  listMyPosts,
  listNotifications,
  listPointRecords,
  markNotificationRead,
  saveAddress,
  updateProfile,
} from '../services/account.service.js'
import { success } from '../utils/response.js'

export function registerAccountRoutes(router) {
  router.get('/api/account/overview', requireUser, async (req, res) => {
    return success(res, await getAccountOverview(req.user.id))
  })

  router.patch('/api/account/profile', requireUser, async (req, res) => {
    return success(res, await updateProfile(req.user.id, req.body), '个人资料已保存')
  })

  router.get('/api/account/security', requireUser, async (req, res) => {
    return success(res, await getSecuritySettings(req.user.id))
  })

  router.get('/api/account/points', requireUser, async (req, res) => {
    return success(res, await listPointRecords(req.user.id))
  })

  router.get('/api/account/notifications', requireUser, async (req, res) => {
    return success(res, await listNotifications(req.user.id))
  })

  router.patch('/api/account/notifications/:id/read', requireUser, async (req, res) => {
    return success(res, await markNotificationRead(req.user.id, req.params.id), '通知已标记为已读')
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
}
