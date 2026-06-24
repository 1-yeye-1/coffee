import { getHomeLiteSnapshot, getHomeSnapshot } from '../services/home.service.js'
import { success } from '../utils/response.js'

export function registerHomeRoutes(router) {
  router.get('/api/home/lite', async (_req, res) => {
    res.set('Cache-Control', 'private, max-age=30')
    return success(res, await getHomeLiteSnapshot())
  })

  router.get('/api/home', async (_req, res) => {
    res.set('Cache-Control', 'no-store')
    return success(res, await getHomeSnapshot())
  })
}
