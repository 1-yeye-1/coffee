import { requireAuth } from '../middlewares/auth.js'
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from '../services/cart.service.js'
import { failure, success } from '../utils/response.js'

export function registerCartRoutes(router) {
  router.get('/api/cart', requireAuth, async (req, res) => success(res, await getCart(req.user.id)))
  router.post('/api/cart/items', requireAuth, async (req, res) => {
    if (!req.body.productId) return failure(res, 400, 'productId 必填')
    return success(res, await addCartItem(req.user.id, req.body.productId, req.body.quantity), '已加入购物车')
  })
  router.patch('/api/cart/items/:id', requireAuth, async (req, res) => success(res, await updateCartItem(req.user.id, req.params.id, req.body)))
  router.delete('/api/cart/items/:id', requireAuth, async (req, res) => success(res, await removeCartItem(req.user.id, req.params.id)))
  router.delete('/api/cart', requireAuth, async (req, res) => success(res, await clearCart(req.user.id)))
}
