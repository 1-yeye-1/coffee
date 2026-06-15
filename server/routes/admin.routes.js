import { requireAdmin } from '../middlewares/auth.js'
import {
  getDashboardStats,
  listAdminBooks,
  listAdminProducts,
} from '../services/admin.service.js'
import { writeAudit } from '../services/admin.service.js'
import { listBookings, updateBookingStatus } from '../services/booking.service.js'
import { createBook, deleteBook, findBookById, updateBook, updateBookStatus } from '../services/books.service.js'
import { findPost, listPosts, updatePostStatus } from '../services/community.service.js'
import { createEvent, deleteEvent, findEventById, listEvents, updateEvent } from '../services/events.service.js'
import { createProduct, deleteProduct, findProductById, updateProduct, updateProductStatus } from '../services/products.service.js'
import {
  changeOrderStatus,
  confirmOrderPayment,
  expireOrderPayment,
  getOrderDetail,
  listOrders,
  rejectOrderPayment,
} from '../services/orders.service.js'
import { failure, paginated, success } from '../utils/response.js'

function requireFields(res, payload, fields) {
  const missing = fields.find((field) => payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '')
  if (missing) { failure(res, 400, `${missing} 必填`); return false }
  return true
}

export function registerAdminRoutes(router) {
  router.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    return success(res, await getDashboardStats())
  })

  router.get('/api/admin/books', requireAdmin, async (req, res) => {
    const result = await listAdminBooks(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.post('/api/admin/books', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['title', 'slug', 'author'])) return false
    const book = await createBook(req.body)
    await writeAudit(req.user.id, 'book.create', 'books', { id: book.id, slug: book.slug })
    return success(res, book, '图书创建成功', 201)
  })
  router.put('/api/admin/books/:id', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['title', 'slug', 'author'])) return false
    if (!await findBookById(req.params.id)) return failure(res, 404, '图书不存在', 404)
    const book = await updateBook(req.params.id, req.body)
    await writeAudit(req.user.id, 'book.update', 'books', { id: book.id })
    return success(res, book)
  })
  router.patch('/api/admin/books/:id/status', requireAdmin, async (req, res) => {
    if (!['active', 'inactive'].includes(req.body.status)) return failure(res, 400, '无效图书状态')
    const book = await updateBookStatus(req.params.id, req.body.status)
    if (!book) return failure(res, 404, '图书不存在', 404)
    await writeAudit(req.user.id, 'book.status.update', 'books', { id: book.id, status: req.body.status })
    return success(res, book)
  })
  router.delete('/api/admin/books/:id', requireAdmin, async (req, res) => {
    if (!await deleteBook(req.params.id)) return failure(res, 404, '图书不存在', 404)
    await writeAudit(req.user.id, 'book.delete', 'books', { id: req.params.id })
    return success(res)
  })

  router.get('/api/admin/products', requireAdmin, async (req, res) => {
    const result = await listAdminProducts(req.query)
    return paginated(res, result.items, result.meta)
  })
  router.post('/api/admin/products', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['name', 'slug', 'category', 'price'])) return false
    const product = await createProduct(req.body)
    await writeAudit(req.user.id, 'product.create', 'products', { id: product.id, slug: product.slug })
    return success(res, product, '商品创建成功', 201)
  })
  router.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['name', 'slug', 'category', 'price'])) return false
    if (!await findProductById(req.params.id)) return failure(res, 404, '商品不存在', 404)
    const product = await updateProduct(req.params.id, req.body)
    await writeAudit(req.user.id, 'product.update', 'products', { id: product.id })
    return success(res, product)
  })
  router.patch('/api/admin/products/:id/status', requireAdmin, async (req, res) => {
    if (!['active', 'inactive', 'sold_out'].includes(req.body.status)) return failure(res, 400, '无效商品状态')
    const product = await updateProductStatus(req.params.id, req.body.status)
    if (!product) return failure(res, 404, '商品不存在', 404)
    await writeAudit(req.user.id, 'product.status.update', 'products', { id: product.id, status: req.body.status })
    return success(res, product)
  })
  router.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    if (!await deleteProduct(req.params.id)) return failure(res, 404, '商品不存在', 404)
    await writeAudit(req.user.id, 'product.delete', 'products', { id: req.params.id })
    return success(res)
  })

  router.get('/api/admin/orders', requireAdmin, async (req, res) => {
    const result = await listOrders(null, req.query, true)
    return paginated(res, result.items, result.meta)
  })
  router.get('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const order = await getOrderDetail(req.params.id, null, true)
    if (!order) return failure(res, 404, '订单不存在', 404)
    return success(res, order)
  })
  router.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    return success(res, await changeOrderStatus(req.params.id, req.body.status, null, true, req.user.id))
  })

  router.patch('/api/admin/orders/:id/confirm-payment', requireAdmin, async (req, res) => {
    return success(res, await confirmOrderPayment(req.params.id, req.user.id), '支付已确认')
  })

  router.patch('/api/admin/orders/:id/reject-payment', requireAdmin, async (req, res) => {
    return success(res, await rejectOrderPayment(req.params.id, req.user.id), '支付已驳回')
  })

  router.patch('/api/admin/orders/:id/expire', requireAdmin, async (req, res) => {
    return success(res, await expireOrderPayment(req.params.id, req.user.id), '订单已标记过期')
  })

  router.get('/api/admin/events', requireAdmin, async (req, res) => {
    const result = await listEvents(req.query, true)
    return paginated(res, result.items, result.meta)
  })
  router.post('/api/admin/events', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['title', 'slug', 'date'])) return false
    const event = await createEvent(req.body)
    await writeAudit(req.user.id, 'event.create', 'events', { id: event.id, slug: event.slug })
    return success(res, event, '活动创建成功', 201)
  })
  router.put('/api/admin/events/:id', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['title', 'slug', 'date'])) return false
    if (!await findEventById(req.params.id)) return failure(res, 404, '活动不存在', 404)
    const event = await updateEvent(req.params.id, req.body)
    await writeAudit(req.user.id, 'event.update', 'events', { id: event.id })
    return success(res, event)
  })
  router.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
    if (!await deleteEvent(req.params.id)) return failure(res, 404, '活动不存在', 404)
    await writeAudit(req.user.id, 'event.delete', 'events', { id: req.params.id })
    return success(res)
  })

  router.get('/api/admin/posts', requireAdmin, async (req, res) => {
    const result = await listPosts(req.query, true)
    return paginated(res, result.items, result.meta)
  })
  router.patch('/api/admin/posts/:id/status', requireAdmin, async (req, res) => {
    if (!['pending', 'published', 'rejected'].includes(req.body.status)) return failure(res, 400, '无效帖子状态')
    if (!await findPost(req.params.id, true)) return failure(res, 404, '帖子不存在', 404)
    return success(res, await updatePostStatus(req.params.id, req.body.status, req.user.id))
  })

  router.get('/api/admin/bookings', requireAdmin, async (req, res) => {
    const result = await listBookings(req.query, true)
    return paginated(res, result.items, result.meta)
  })
  router.patch('/api/admin/bookings/:id/status', requireAdmin, async (req, res) => {
    if (!['confirmed', 'cancelled', 'arrived'].includes(req.body.status)) return failure(res, 400, '无效预约状态')
    const booking = await updateBookingStatus(req.params.id, req.body.status, req.user.id)
    if (!booking) return failure(res, 404, '预约不存在', 404)
    return success(res, booking)
  })
}
