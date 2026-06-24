import { requireUser } from '../middlewares/auth.js'
import {
  cancelBookReservation,
  createBookReservation,
  createBookReview,
  deleteOwnBookReview,
  findBookBySlug,
  likeBookReview,
  listBookReviews,
  listBooks,
  listMyBookReservations,
  replyBookReview,
  unlikeBookReview,
} from '../services/books.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerBooksRoutes(router) {
  router.get('/api/books', async (req, res) => {
    const result = await listBooks(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/books/:slug', async (req, res) => {
    const book = await findBookBySlug(req.params.slug)
    if (!book) return failure(res, 404, '图书不存在', 404)
    return success(res, book)
  })

  router.get('/api/books/:id/reviews', async (req, res) => {
    const result = await listBookReviews(req.params.id, req.query)
    return paginated(res, result.items, result.meta)
  })

  router.post('/api/books/:id/reviews', requireUser, async (req, res) => {
    return success(res, await createBookReview(req.params.id, req.user.id, req.body), '评价已发布', 201)
  })

  router.post('/api/books/:id/reviews/:reviewId/replies', requireUser, async (req, res) => {
    return success(res, await replyBookReview(req.params.id, req.params.reviewId, req.user.id, req.body), '回复已发布', 201)
  })

  router.post('/api/books/reviews/:id/like', requireUser, async (req, res) => {
    return success(res, await likeBookReview(req.params.id, req.user.id), '已点赞')
  })

  router.delete('/api/books/reviews/:id/like', requireUser, async (req, res) => {
    return success(res, await unlikeBookReview(req.params.id, req.user.id), '已取消点赞')
  })

  router.delete('/api/books/reviews/:id', requireUser, async (req, res) => {
    if (!await deleteOwnBookReview(req.params.id, req.user.id)) return failure(res, 404, '评价不存在或无权删除', 404)
    return success(res, {}, '评价已删除')
  })

  router.post('/api/books/:id/reservations', requireUser, async (req, res) => {
    return success(res, await createBookReservation(req.params.id, req.user.id), '图书预约成功', 201)
  })

  router.get('/api/book-reservations/my', requireUser, async (req, res) => {
    return success(res, await listMyBookReservations(req.user.id))
  })

  router.delete('/api/book-reservations/:id', requireUser, async (req, res) => {
    if (!await cancelBookReservation(req.params.id, req.user.id)) return failure(res, 404, '预约不存在', 404)
    return success(res, {}, '预约已取消')
  })
}
