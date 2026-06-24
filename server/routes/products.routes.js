import { requireUser } from '../middlewares/auth.js'
import {
  createProductReview,
  deleteOwnProductReview,
  findProductBySlug,
  likeProductReview,
  listProductReviews,
  listProducts,
  listProductRecommendations,
  replyProductReview,
  unlikeProductReview,
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
    return success(res, await createProductReview(req.params.id, req.user.id, req.body), '评价已发布', 201)
  })

  router.post('/api/products/:id/reviews/:reviewId/replies', requireUser, async (req, res) => {
    return success(res, await replyProductReview(req.params.id, req.params.reviewId, req.user.id, req.body), '回复已发布', 201)
  })

  router.post('/api/products/reviews/:id/like', requireUser, async (req, res) => {
    return success(res, await likeProductReview(req.params.id, req.user.id), '已点赞')
  })

  router.delete('/api/products/reviews/:id/like', requireUser, async (req, res) => {
    return success(res, await unlikeProductReview(req.params.id, req.user.id), '已取消点赞')
  })

  router.delete('/api/products/reviews/:id', requireUser, async (req, res) => {
    const deleted = await deleteOwnProductReview(req.params.id, req.user.id)
    if (!deleted) return failure(res, 404, '评价不存在', 404)
    return success(res, {}, '评价已删除')
  })
}
