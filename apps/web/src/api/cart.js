import { request } from './request'

export const getCart = () => request('/cart')
export const addCartItem = (productId, quantity = 1) => request('/cart/items', { method: 'POST', body: { productId, quantity } })
export const updateCartItem = (id, changes) => request(`/cart/items/${id}`, { method: 'PATCH', body: changes })
export const removeCartItem = (id) => request(`/cart/items/${id}`, { method: 'DELETE' })
export const clearCart = () => request('/cart', { method: 'DELETE' })
