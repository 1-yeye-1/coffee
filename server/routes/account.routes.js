import { requireUser } from '../middlewares/auth.js'
import {
  changePassword,
  changePhone,
  getAccountOverview,
  getPublicProfile,
  getSecuritySettings,
  listAddresses,
  listAvatars,
  listMyPosts,
  listPointRecords,
  listFavorites,
  addFavorite,
  removeFavorite,
  saveAddress,
  selectAvatar,
  updatePrivacy,
  updateProfile,
  useAvatarHistory,
  verifyCurrentPhone,
} from '../services/account.service.js'
import { dbSuccess, failure, success } from '../utils/response.js'
import { dailyCheckin, getPointsCenter, redeemCoupon } from '../services/points.service.js'

export function registerAccountRoutes(router) {
  router.get('/api/account/overview', requireUser, async (req, res) => {
    return dbSuccess(res, await getAccountOverview(req.user.id))
  })

  router.get('/api/users/me/overview', requireUser, async (req, res) => dbSuccess(res, await getAccountOverview(req.user.id)))
  router.get('/api/users/me/points', requireUser, async (req, res) => dbSuccess(res, await listPointRecords(req.user.id)))
  router.get('/api/users/me/favorites', requireUser, async (req, res) => success(res, await listFavorites(req.user.id)))
  router.post('/api/users/me/favorites', requireUser, async (req, res) => success(res, await addFavorite(req.user.id, req.body), 'Favorite added', 201))
  router.delete('/api/users/me/favorites/:id', requireUser, async (req, res) => {
    if (!await removeFavorite(req.user.id, req.params.id)) return failure(res, 404, 'Favorite not found', 404)
    return success(res, {}, 'Favorite removed')
  })

  router.patch('/api/account/profile', requireUser, async (req, res) => {
    return success(res, await updateProfile(req.user.id, req.body), '个人资料已保存')
  })

  router.get('/api/users/me/avatars', requireUser, async (req, res) => {
    return success(res, await listAvatars(req.user.id))
  })

  router.post('/api/users/me/avatar/select', requireUser, async (req, res) => {
    return success(res, await selectAvatar(req.user.id, req.body.avatarUrl, 'preset'), '头像已更新')
  })

  router.post('/api/users/me/avatar/history/:id/use', requireUser, async (req, res) => {
    return success(res, await useAvatarHistory(req.user.id, req.params.id), '头像已更新')
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

  router.patch('/api/account/security/password', requireUser, async (req, res) => {
    return success(res, await changePassword(req.user.id, req.body))
  })

  router.get('/api/account/points', requireUser, async (req, res) => {
    return dbSuccess(res, await listPointRecords(req.user.id))
  })

  router.get('/api/account/points-center', requireUser, async (req, res) => {
    return dbSuccess(res, await getPointsCenter(req.user.id))
  })

  router.post('/api/account/points-center/checkin', requireUser, async (req, res) => {
    return dbSuccess(res, await dailyCheckin(req.user.id), '签到成功')
  })

  router.post('/api/account/points-center/redeem/:couponId', requireUser, async (req, res) => {
    return dbSuccess(res, await redeemCoupon(req.user.id, req.params.couponId, req.body.requestKey), '兑换成功')
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
