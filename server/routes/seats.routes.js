import { requireAdmin } from '../middlewares/auth.js'
import { createSeat, deleteSeat, getSeatAdminStats, getSeatAvailability, getSeatDetail, listSeats, updateSeat, updateSeatStatus } from '../services/seats.service.js'
import { failure, success } from '../utils/response.js'

export function registerSeatsRoutes(router) {
  router.get('/api/seats', async (_req, res) => success(res, await listSeats()))
  router.get('/api/seats/availability', async (req, res) => success(res, await getSeatAvailability(req.query.date, req.query.timeSlot)))
  router.get('/api/admin/seats/stats', requireAdmin, async (_req, res) => success(res, await getSeatAdminStats()))
  router.get('/api/admin/seats/usage', requireAdmin, async (req, res) => success(res, await getSeatAvailability(req.query.date, req.query.timeSlot, true)))
  router.get('/api/admin/seats', requireAdmin, async (_req, res) => success(res, await listSeats()))
  router.get('/api/admin/seats/:id/detail', requireAdmin, async (req, res) => {
    const seat = await getSeatDetail(req.params.id)
    if (!seat) return failure(res, 404, '?????', 404)
    return success(res, seat)
  })
  router.post('/api/admin/seats', requireAdmin, async (req, res) => success(res, await createSeat(req.body, req.user.id), '座位已创建', 201))
  router.patch('/api/admin/seats/:id', requireAdmin, async (req, res) => {
    const seat = await updateSeat(req.params.id, req.body, req.user.id)
    if (!seat) return failure(res, 404, '座位不存在', 404)
    return success(res, seat, '座位已更新')
  })
  router.delete('/api/admin/seats/:id', requireAdmin, async (req, res) => {
    if (!await deleteSeat(req.params.id, req.user.id)) return failure(res, 404, '座位不存在', 404)
    return success(res, {}, '座位已删除')
  })
  router.patch('/api/admin/seats/:id/status', requireAdmin, async (req, res) => {
    const seat = await updateSeatStatus(req.params.id, req.body.status, req.user.id, req.body)
    if (!seat) return failure(res, 404, '座位不存在', 404)
    return success(res, seat, '座位状态已更新')
  })
}
