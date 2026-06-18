import { searchAll } from '../services/search.service.js'
import { success } from '../utils/response.js'

export function registerSearchRoutes(router) {
  router.get('/api/search', async (req, res) => {
    return success(res, await searchAll(req.query.keyword))
  })
}
