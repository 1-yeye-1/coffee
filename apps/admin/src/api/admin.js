import { request, toQuery } from './request'

export function fetchDashboard() {
  return request('/admin/dashboard')
}

export function fetchAdminBooks(params = {}) {
  return request(`/admin/books${toQuery(params)}`)
}

export function fetchAdminProducts(params = {}) {
  return request(`/admin/products${toQuery(params)}`)
}

export const createBook = (payload) => request('/admin/books', { method: 'POST', body: payload })
export const updateBook = (id, payload) => request(`/admin/books/${id}`, { method: 'PUT', body: payload })
export const updateBookStatus = (id, status) => request(`/admin/books/${id}/status`, { method: 'PATCH', body: { status } })
export const deleteBook = (id) => request(`/admin/books/${id}`, { method: 'DELETE' })
export const createProduct = (payload) => request('/admin/products', { method: 'POST', body: payload })
export const updateProduct = (id, payload) => request(`/admin/products/${id}`, { method: 'PUT', body: payload })
export const updateProductStatus = (id, status) => request(`/admin/products/${id}/status`, { method: 'PATCH', body: { status } })
export const deleteProduct = (id) => request(`/admin/products/${id}`, { method: 'DELETE' })
export const getAdminOrders = (params = {}) => request(`/admin/orders${toQuery(params)}`)
export const getAdminOrderDetail = (id) => request(`/admin/orders/${id}`)
export const updateAdminOrderStatus = (id, status) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } })
export const fetchAdminEvents = (params = {}) => request(`/admin/events${toQuery(params)}`)
export const createEvent = (payload) => request('/admin/events', { method: 'POST', body: payload })
export const updateEvent = (id, payload) => request(`/admin/events/${id}`, { method: 'PUT', body: payload })
export const deleteEvent = (id) => request(`/admin/events/${id}`, { method: 'DELETE' })
export const fetchAdminPosts = (params = {}) => request(`/admin/posts${toQuery(params)}`)
export const updateAdminPostStatus = (id, status) => request(`/admin/posts/${id}/status`, { method: 'PATCH', body: { status } })
export const fetchAdminBookings = (params = {}) => request(`/admin/bookings${toQuery(params)}`)
export const updateAdminBookingStatus = (id, status) => request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status } })
