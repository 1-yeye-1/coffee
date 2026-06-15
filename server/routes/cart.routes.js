import { requireUser } from '../middlewares/auth.js'
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from '../services/cart.service.js'
import { failure, success } from '../utils/response.js'

export function registerCartRoutes(router) {
  router.get('/api/cart', requireUser, async (req, res) => success(res, await getCart(req.user.id)))

  router.post('/api/cart/items', requireUser, async (req, res) => {
    if (!req.body.productId) return failure(res, 400, 'productId 必填')
    return success(res, await addCartItem(req.user.id, req.body.productId, req.body.quantity), '已加入购物车')
  })

  router.patch('/api/cart/items/:id', requireUser, async (req, res) => {
    return success(res, await updateCartItem(req.user.id, req.params.id, req.body))
  })

  router.delete('/api/cart/items/:id', requireUser, async (req, res) => {
    return success(res, await removeCartItem(req.user.id, req.params.id))
  })

  router.delete('/api/cart', requireUser, async (req, res) => {
    return success(res, await clearCart(req.user.id))
  })
}
