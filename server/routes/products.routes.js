import { findProductBySlug, listProducts } from '../services/products.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerProductsRoutes(router) {
  router.get('/api/products', async (req, res) => {
    const result = await listProducts(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/products/:slug', async (req, res) => {
    const product = await findProductBySlug(req.params.slug)
    if (!product) return failure(res, 404, '商品不存在', 404)
    return success(res, product)
  })
}
