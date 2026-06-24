import { getHomeSnapshot } from '../services/home.service.js'
import { success } from '../utils/response.js'

export function registerHomeRoutes(router) {
  router.get('/api/home', async (_req, res) => {
    res.set('Cache-Control', 'no-store')
    return success(res, await getHomeSnapshot())
  })
}
