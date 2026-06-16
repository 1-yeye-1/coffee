import { requireAdmin, requireUser } from '../middlewares/auth.js'
import { logAdminAction } from '../services/admin-log.service.js'
import {
  createNotification,
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from '../services/notifications.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerNotificationsRoutes(router) {
  router.get('/api/account/notifications', requireUser, async (req, res) => {
    const result = await listNotifications(req.user.id, req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/account/notifications/unread-count', requireUser, async (req, res) => {
    return success(res, await getUnreadCount(req.user.id))
  })

  router.patch('/api/account/notifications/:id/read', requireUser, async (req, res) => {
    return success(res, await markAsRead(req.user.id, req.params.id), '通知已标记为已读')
  })

  router.patch('/api/account/notifications/read-all', requireUser, async (req, res) => {
    return success(res, await markAllAsRead(req.user.id), '全部通知已标记为已读')
  })

  router.delete('/api/account/notifications/:id', requireUser, async (req, res) => {
    const deleted = await deleteNotification(req.user.id, req.params.id)
    if (!deleted) return failure(res, 404, '通知不存在', 404)
    return success(res, {}, '通知已删除')
  })

  router.post('/api/admin/notifications', requireAdmin, async (req, res) => {
    const notification = await createNotification(req.body)
    await logAdminAction({
      admin: req.user,
      action: 'create',
      module: 'notification',
      targetType: 'notification',
      targetId: notification.id,
      description: `创建系统通知：${notification.title}`,
      req,
    })
    return success(res, notification, '通知创建成功', 201)
  })
}
