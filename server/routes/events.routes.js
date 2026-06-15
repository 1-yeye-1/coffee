import { requireUser } from '../middlewares/auth.js'
import {
  cancelEventRegistration,
  findEventBySlug,
  listEvents,
  registerEvent,
} from '../services/events.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerEventsRoutes(router) {
  router.get('/api/events', async (req, res) => {
    const result = await listEvents(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/events/:slug', async (req, res) => {
    const event = await findEventBySlug(req.params.slug)
    if (!event) return failure(res, 404, '活动不存在', 404)
    return success(res, event)
  })

  router.post('/api/events/:id/register', requireUser, async (req, res) => {
    const event = await registerEvent(req.params.id, req.user.id)
    if (!event) return failure(res, 404, '活动不存在', 404)
    return success(res, event, '报名成功', 201)
  })

  router.delete('/api/events/:id/register', requireUser, async (req, res) => {
    if (!await cancelEventRegistration(req.params.id, req.user.id)) {
      return failure(res, 404, '报名记录不存在', 404)
    }
    return success(res)
  })
}
