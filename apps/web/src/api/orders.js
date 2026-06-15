import { request, toQuery } from './request'

export const createOrder = (payload) => request('/orders', { method: 'POST', body: payload })
export const buyNow = (payload) => request('/orders/buy-now', { method: 'POST', body: payload })
export const getOrders = (params = {}) => request(`/orders${toQuery(params)}`)
export const getOrderDetail = (id) => request(`/orders/${id}`)
export const payOrder = (id) => request(`/orders/${id}/pay`, { method: 'PATCH' })
export const cancelOrder = (id) => request(`/orders/${id}/cancel`, { method: 'PATCH' })
export const completeOrder = (id) => request(`/orders/${id}/complete`, { method: 'PATCH' })
