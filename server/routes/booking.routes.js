import { requireAuth } from '../middlewares/auth.js'
import {
  cancelBooking,
  createBooking,
  findSpaceBySlug,
  listSpaceSlots,
  listSpaces,
} from '../services/booking.service.js'
import { failure, success } from '../utils/response.js'

function requireBodyFields(res, payload, fields) {
  const missing = fields.find((field) => !String(payload[field] || '').trim())
  if (missing) {
    failure(res, 400, `${missing} 必填`)
    return false
  }
  return true
}

export function registerBookingRoutes(router) {
  router.get('/api/spaces', async (_req, res) => {
    return success(res, await listSpaces())
  })

  router.get('/api/spaces/:slug', async (req, res) => {
    const space = await findSpaceBySlug(req.params.slug)
    if (!space) return failure(res, 404, '空间不存在', 404)
    return success(res, space)
  })

  router.get('/api/spaces/:slug/slots', async (req, res) => {
    return success(res, await listSpaceSlots(req.params.slug))
  })

  router.post('/api/bookings', requireAuth, async (req, res) => {
    if (!requireBodyFields(res, req.body, ['date', 'time', 'contactName', 'phone'])) return false
    return success(res, await createBooking(req.body, req.user.id), '预约成功', 201)
  })

  router.delete('/api/bookings/:id', requireAuth, async (req, res) => {
    if (!await cancelBooking(req.params.id, req.user.id)) return failure(res, 404, '预约不存在', 404)
    return success(res)
  })
}
