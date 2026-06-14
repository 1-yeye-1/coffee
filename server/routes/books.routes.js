import { findBookBySlug, listBooks } from '../services/books.service.js'
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
}
