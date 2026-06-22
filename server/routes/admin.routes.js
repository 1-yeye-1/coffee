import { requireAdmin } from '../middlewares/auth.js'
import { logAdminAction } from '../services/admin-log.service.js'
import { authenticateAdmin, findAdminById } from '../services/auth.service.js'
import {
  getDashboardStats,
  getDashboardSummary,
  getDashboardTrends,
  getDashboardRecent,
  getFinanceDashboard,
  listAdminBooks,
  listAdminProducts,
  listAdminUsers,
  updateAdminUser,
  writeAudit,
} from '../services/admin.service.js'
import { listBookings, updateBookingStatus } from '../services/booking.service.js'
import { createBook, deleteBook, findBookById, updateBook, updateBookStatus } from '../services/books.service.js'
import {
  findPost,
  listPosts,
  processContentReport,
  updateCommentStatus,
  updatePostStatus,
} from '../services/community.service.js'
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
import { signAdminToken } from '../utils/jwt.js'
import { searchAdmin } from '../services/admin-search.service.js'
import { failure, paginated, success } from '../utils/response.js'

function requireFields(res, payload, fields) {
  const missing = fields.find((field) => payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '')
  if (missing) {
    failure(res, 400, `${missing} 必填`)
    return false
  }
  return true
}

export function registerAdminRoutes(router) {
  router.post('/api/admin/auth/login', async (req, res) => {
    const admin = await authenticateAdmin(req.body)
    await logAdminAction({ admin, action: 'login', module: 'auth', targetType: 'admin', targetId: admin.id, description: `管理员 ${admin.username} 登录后台`, req })
    return success(res, { token: signAdminToken(admin), admin }, '后台登录成功')
  })

  router.get('/api/admin/auth/me', requireAdmin, async (req, res) => {
    const admin = await findAdminById(req.user.id)
    if (!admin) return failure(res, 404, '管理员不存在', 404)
    return success(res, admin)
  })

  router.post('/api/admin/auth/logout', requireAdmin, async (_req, res) => {
    return success(res, {}, '已退出后台登录')
  })

  router.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    return success(res, await getDashboardStats())
  })

  router.get('/api/admin/dashboard/summary', requireAdmin, async (_req, res) => success(res, await getDashboardSummary()))
  router.get('/api/admin/dashboard/trends', requireAdmin, async (_req, res) => success(res, await getDashboardTrends()))
  router.get('/api/admin/dashboard/recent', requireAdmin, async (_req, res) => success(res, await getDashboardRecent()))
  router.get('/api/admin/dashboard/finance', requireAdmin, async (_req, res) => success(res, await getFinanceDashboard()))
  router.get('/api/admin/finance/summary', requireAdmin, async (_req, res) => success(res, (await getFinanceDashboard()).summary))
  router.get('/api/admin/finance/trends', requireAdmin, async (_req, res) => success(res, (await getFinanceDashboard()).trends))
  router.get('/api/admin/finance/orders', requireAdmin, async (_req, res) => success(res, (await getFinanceDashboard()).orders))

  router.get('/api/admin/search', requireAdmin, async (req, res) => {
    return success(res, await searchAdmin(req.query.keyword))
  })

  router.get('/api/admin/users', requireAdmin, async (req, res) => {
    const result = await listAdminUsers(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const user = await updateAdminUser(req.params.id, req.body, req.user.id)
    if (!user) return failure(res, 404, '用户不存在', 404)
    return success(res, user, '用户资料已更新')
  })

  router.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
    if (!['active', 'disabled'].includes(req.body.status)) return failure(res, 400, '无效用户状态')
    const user = await updateAdminUser(req.params.id, { status: req.body.status }, req.user.id)
    if (!user) return failure(res, 404, '用户不存在', 404)
    return success(res, user, '用户状态已更新')
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
    if (!['available', 'unavailable', 'hidden'].includes(req.body.status)) return failure(res, 400, '图书状态无效')
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
    await logAdminAction({ admin: req.user, action: 'create', module: 'product', targetType: 'product', targetId: product.id, description: `新增商品：${product.name}`, req })
    return success(res, product, '商品创建成功', 201)
  })

  router.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    if (!requireFields(res, req.body, ['name', 'slug', 'category', 'price'])) return false
    if (!await findProductById(req.params.id)) return failure(res, 404, '商品不存在', 404)
    const product = await updateProduct(req.params.id, req.body)
    await writeAudit(req.user.id, 'product.update', 'products', { id: product.id })
    await logAdminAction({ admin: req.user, action: 'update', module: 'product', targetType: 'product', targetId: product.id, description: `修改商品：${product.name}`, req })
    return success(res, product)
  })

  router.patch('/api/admin/products/:id/status', requireAdmin, async (req, res) => {
    if (!['active', 'inactive', 'draft'].includes(req.body.status)) return failure(res, 400, '商品状态无效')
    const product = await updateProductStatus(req.params.id, req.body.status)
    if (!product) return failure(res, 404, '商品不存在', 404)
    await writeAudit(req.user.id, 'product.status.update', 'products', { id: product.id, status: req.body.status })
    await logAdminAction({ admin: req.user, action: 'change_status', module: 'product', targetType: 'product', targetId: product.id, description: `修改商品状态为 ${req.body.status}`, req })
    return success(res, product)
  })

  router.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    if (!await deleteProduct(req.params.id)) return failure(res, 404, '商品不存在', 404)
    await writeAudit(req.user.id, 'product.delete', 'products', { id: req.params.id })
    await logAdminAction({ admin: req.user, action: 'delete', module: 'product', targetType: 'product', targetId: req.params.id, description: '删除商品', req })
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
    const order = await changeOrderStatus(req.params.id, req.body.status, null, true, req.user.id)
    await logAdminAction({ admin: req.user, action: 'change_status', module: 'order', targetType: 'order', targetId: req.params.id, description: `修改订单状态为 ${req.body.status}`, req })
    return success(res, order)
  })

  router.patch('/api/admin/orders/:id/confirm-payment', requireAdmin, async (req, res) => {
    const order = await confirmOrderPayment(req.params.id, req.user.id)
    await logAdminAction({ admin: req.user, action: 'approve', module: 'order', targetType: 'order', targetId: req.params.id, description: '确认订单支付', req })
    return success(res, order, '支付已确认')
  })

  router.patch('/api/admin/orders/:id/reject-payment', requireAdmin, async (req, res) => {
    const order = await rejectOrderPayment(req.params.id, req.user.id)
    await logAdminAction({ admin: req.user, action: 'reject', module: 'order', targetType: 'order', targetId: req.params.id, description: '驳回订单支付', req })
    return success(res, order, '支付已驳回')
  })

  router.patch('/api/admin/orders/:id/expire', requireAdmin, async (req, res) => {
    const order = await expireOrderPayment(req.params.id, req.user.id)
    await logAdminAction({ admin: req.user, action: 'change_status', module: 'order', targetType: 'order', targetId: req.params.id, description: '标记订单支付过期', req })
    return success(res, order, '订单已标记过期')
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

  router.patch('/api/admin/events/:id/status', requireAdmin, async (req, res) => {
    if (!['draft', 'published', 'ongoing', 'ended', 'cancelled'].includes(req.body.status)) return failure(res, 400, '活动状态无效')
    const current = await findEventById(req.params.id)
    if (!current) return failure(res, 404, '活动不存在', 404)
    const event = await updateEvent(req.params.id, { ...current, status: req.body.status })
    await writeAudit(req.user.id, 'event.status.update', 'events', { id: event.id, status: req.body.status })
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
    if (!['pending', 'published', 'approved', 'rejected', 'reported', 'review', 'hidden'].includes(req.body.status)) return failure(res, 400, '社区内容状态无效')
    if (!await findPost(req.params.id, true)) return failure(res, 404, '帖子不存在', 404)
    const post = await updatePostStatus(req.params.id, req.body.status, req.user.id, req.body.reason)
    await logAdminAction({
      admin: req.user,
      action: req.body.status === 'published' ? 'approve' : req.body.status === 'rejected' ? 'reject' : 'change_status',
      module: 'community',
      targetType: 'post',
      targetId: req.params.id,
      description: `审核社区帖子为 ${req.body.status}`,
      req,
    })
    return success(res, post)
  })

  router.get('/api/admin/posts/:id/moderation', requireAdmin, async (req, res) => {
    const post = await findPost(req.params.id, true)
    if (!post) return failure(res, 404, '帖子不存在', 404)
    return success(res, post)
  })

  router.patch('/api/admin/posts/:id/comments/:commentId/status', requireAdmin, async (req, res) => {
    if (!['published', 'pending', 'hidden', 'deleted'].includes(req.body.status)) return failure(res, 400, '评论状态无效')
    const post = await updateCommentStatus(req.params.id, req.params.commentId, req.body.status, req.user.id, req.body.reason)
    return success(res, post)
  })

  router.patch('/api/admin/reports/:id', requireAdmin, async (req, res) => {
    if (!['dismiss', 'hide', 'delete'].includes(req.body.action)) return failure(res, 400, '举报处理动作无效')
    const post = await processContentReport(req.params.id, req.body.action, req.user.id, req.body.note)
    return success(res, post)
  })

  router.get('/api/admin/bookings', requireAdmin, async (req, res) => {
    const result = await listBookings(req.query, true)
    return paginated(res, result.items, result.meta)
  })

  router.patch('/api/admin/bookings/:id/status', requireAdmin, async (req, res) => {
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(req.body.status)) return failure(res, 400, '预约状态无效')
    const booking = await updateBookingStatus(req.params.id, req.body.status, req.user.id)
    if (!booking) return failure(res, 404, '预约不存在', 404)
    await logAdminAction({ admin: req.user, action: 'change_status', module: 'booking', targetType: 'booking', targetId: req.params.id, description: `修改预约状态为 ${req.body.status}`, req })
    return success(res, booking)
  })
}
