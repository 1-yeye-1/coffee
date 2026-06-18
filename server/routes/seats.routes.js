import { requireAdmin } from '../middlewares/auth.js'
import { getSeatAvailability, listSeats, updateSeatStatus } from '../services/seats.service.js'
import { failure, success } from '../utils/response.js'

export function registerSeatsRoutes(router) {
  router.get('/api/seats', async (_req, res) => success(res, await listSeats()))
  router.get('/api/seats/availability', async (req, res) => success(res, await getSeatAvailability(req.query.date, req.query.timeSlot)))
  router.get('/api/admin/seats/usage', requireAdmin, async (req, res) => success(res, await getSeatAvailability(req.query.date, req.query.timeSlot, true)))
  router.patch('/api/admin/seats/:id/status', requireAdmin, async (req, res) => {
    const seat = await updateSeatStatus(req.params.id, req.body.status, req.user.id)
    if (!seat) return failure(res, 404, '座位不存在', 404)
    return success(res, seat, '座位状态已更新')
  })
}
