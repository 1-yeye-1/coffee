import { requireAdmin } from '../middlewares/auth.js'
import { getAdminLogDetail, listAdminLogs } from '../services/admin-log.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerAdminLogRoutes(router) {
  router.get('/api/admin/logs/export', requireAdmin, async (_req, res) => {
    return failure(res, 501, '导出功能暂未开放', 501)
  })

  router.get('/api/admin/logs', requireAdmin, async (req, res) => {
    const result = await listAdminLogs(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/admin/logs/:id', requireAdmin, async (req, res) => {
    const log = await getAdminLogDetail(req.params.id)
    if (!log) return failure(res, 404, '操作日志不存在', 404)
    return success(res, log)
  })
}
