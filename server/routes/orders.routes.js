import { requireAuth } from '../middlewares/auth.js'
import {
  changeOrderStatus,
  createBuyNowOrder,
  createOrder,
  getOrderDetail,
  listOrders,
  payOrder,
} from '../services/orders.service.js'
import { failure, paginated, success } from '../utils/response.js'

export function registerOrdersRoutes(router) {
  router.post('/api/orders', requireAuth, async (req, res) => {
    return success(res, await createOrder(req.user.id, req.body), '订单创建成功', 201)
  })

  router.post('/api/orders/buy-now', requireAuth, async (req, res) => {
    return success(res, await createBuyNowOrder(req.user.id, req.body), '订单创建成功', 201)
  })

  router.get('/api/orders', requireAuth, async (req, res) => {
    const result = await listOrders(req.user.id, req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/orders/:id', requireAuth, async (req, res) => {
    const order = await getOrderDetail(req.params.id, req.user.id)
    if (!order) return failure(res, 404, '订单不存在', 404)
    return success(res, order)
  })

  router.patch('/api/orders/:id/pay', requireAuth, async (req, res) => {
    return success(res, await payOrder(req.params.id, req.user.id), '已提交支付，等待后台确认')
  })

  router.patch('/api/orders/:id/cancel', requireAuth, async (req, res) => {
    return success(res, await changeOrderStatus(req.params.id, 'cancelled', req.user.id), '订单已取消')
  })

  router.patch('/api/orders/:id/complete', requireAuth, async (req, res) => {
    return success(res, await changeOrderStatus(req.params.id, 'completed', req.user.id), '订单已完成')
  })
}
