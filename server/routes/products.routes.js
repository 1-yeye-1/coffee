import { requireUser } from '../middlewares/auth.js'
import {
  createProductReview,
  deleteOwnProductReview,
  findProductBySlug,
  listProductReviews,
  listProducts,
  listProductRecommendations,
} from '../services/products.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerProductsRoutes(router) {
  router.get('/api/products', async (req, res) => {
    const result = await listProducts(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/products/recommendations', async (req, res) => {
    return success(res, await listProductRecommendations(req.query))
  })

  router.get('/api/products/:slug', async (req, res) => {
    const product = await findProductBySlug(req.params.slug)
    if (!product) return failure(res, 404, '商品不存在', 404)
    return success(res, product)
  })

  router.get('/api/products/:id/reviews', async (req, res) => {
    const result = await listProductReviews(req.params.id, req.query)
    return paginated(res, result.items, result.meta)
  })

  router.post('/api/products/:id/reviews', requireUser, async (req, res) => {
    return success(res, await createProductReview(req.params.id, req.user.id, req.body), '评价发布成功', 201)
  })

  router.delete('/api/products/reviews/:id', requireUser, async (req, res) => {
    const deleted = await deleteOwnProductReview(req.params.id, req.user.id)
    if (!deleted) return failure(res, 404, '评价不存在', 404)
    return success(res, {}, '评价已删除')
  })
}
