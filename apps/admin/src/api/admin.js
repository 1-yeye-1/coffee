import { request, toQuery } from './request'

export function fetchDashboard() {
  return request('/admin/dashboard')
}
export const fetchDashboardSummary = () => request('/admin/dashboard/summary')
export const fetchDashboardTrends = () => request('/admin/dashboard/trends')
export const fetchDashboardRecent = () => request('/admin/dashboard/recent')

export const searchAdmin = (keyword) => request(`/admin/search${toQuery({ keyword })}`)

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
export const updateAdminOrderStatus = (id, status, payload = {}) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { ...payload, status } })
export const confirmAdminOrderPayment = (id) => request(`/admin/orders/${id}/confirm-payment`, { method: 'PATCH' })
export const rejectAdminOrderPayment = (id, reason = '') => request(`/admin/orders/${id}/reject-payment`, { method: 'PATCH', body: { reason } })
export const expireAdminOrderPayment = (id) => request(`/admin/orders/${id}/expire`, { method: 'PATCH' })
export const fetchAdminUsers = (params = {}) => request(`/admin/users${toQuery(params)}`)
export const updateAdminUser = (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: payload })
export const updateAdminUserStatus = (id, status) => request(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } })
export const fetchAdminEvents = (params = {}) => request(`/admin/events${toQuery(params)}`)
export const createEvent = (payload) => request('/admin/events', { method: 'POST', body: payload })
export const updateEvent = (id, payload) => request(`/admin/events/${id}`, { method: 'PUT', body: payload })
export const updateEventStatus = (id, status) => request(`/admin/events/${id}/status`, { method: 'PATCH', body: { status } })
export const deleteEvent = (id) => request(`/admin/events/${id}`, { method: 'DELETE' })
export const fetchEventRegistrations = (id, params = {}) => request(`/admin/events/${id}/registrations${toQuery(params)}`)
export const updateEventRegistrationStatus = (eventId, registrationId, payload) => request(`/admin/events/${eventId}/registrations/${registrationId}/status`, { method: 'PATCH', body: payload })
export async function exportEventRegistrations(id, params = {}) {
  const base = String(import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : '/api')).replace(/\/$/, '')
  const headers = new Headers()
  const token = localStorage.getItem('coffee_admin_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${base}/admin/events/${id}/registrations/export${toQuery(params)}`, { headers })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '导出报名名单失败')
  }
  return response.blob()
}
export const fetchAdminPosts = (params = {}) => request(`/admin/posts${toQuery(params)}`)
export const fetchPostLikeUsers = (id) => request(`/posts/${id}/likes`)
export const fetchPostModeration = (id) => request(`/admin/posts/${id}/moderation`)
export const updateAdminPostStatus = (id, status, reason = '') => request(`/admin/posts/${id}/status`, { method: 'PATCH', body: { status, reason } })
export const updateAdminCommentStatus = (postId, commentId, status, reason = '') => request(`/admin/posts/${postId}/comments/${commentId}/status`, { method: 'PATCH', body: { status, reason } })
export const processAdminReport = (id, action, note = '') => request(`/admin/reports/${id}`, { method: 'PATCH', body: { action, note } })
export const fetchAdminBookings = (params = {}) => request(`/admin/bookings${toQuery(params)}`)
export const fetchAdminBookingStats = (params = {}) => request(`/admin/bookings/stats${toQuery(params)}`)
export const getAdminBookingDetail = (id) => request(`/admin/bookings/${id}`)
export const updateAdminBookingStatus = (id, status, reason = '') => request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status, reason } })
export const batchUpdateAdminBookingStatus = (ids, status, reason = '') => request('/admin/bookings/batch-status', { method: 'PATCH', body: { ids, status, reason } })
export const fetchUploadFiles = (params = {}) => request(`/upload/files${toQuery(params)}`)
export const deleteUploadFile = (id) => request(`/upload/files/${id}`, { method: 'DELETE' })
export const uploadProductImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request('/upload/product', { method: 'POST', body: formData, timeoutMs: 30000 })
}
export const uploadContentImage = (file, scene) => {
  const formData = new FormData()
  formData.append('file', file)
  return request(`/upload/${scene}`, { method: 'POST', body: formData, timeoutMs: 30000 })
}
export const getAdminLogs = (params = {}) => request(`/admin/logs${toQuery(params)}`)
export const fetchSeatUsage = (params = {}) => request(`/admin/seats/usage${toQuery(params)}`)
export const fetchAdminSeats = () => request('/admin/seats')
export const createSeat = (payload) => request('/admin/seats', { method: 'POST', body: payload })
export const updateSeat = (id, payload) => request(`/admin/seats/${id}`, { method: 'PATCH', body: payload })
export const deleteSeat = (id) => request(`/admin/seats/${id}`, { method: 'DELETE' })
export const updateSeatStatus = (id, status, payload = {}) => request(`/admin/seats/${id}/status`, { method: 'PATCH', body: { ...payload, status } })
export const getAdminLogDetail = (id) => request(`/admin/logs/${id}`)
export const exportAdminLogs = (params = {}) => request(`/admin/logs/export${toQuery(params)}`)


export const fetchAdminProductStats = () => request('/admin/products/stats')
export const getAdminProductDetail = (id) => request(`/admin/products/${id}/detail`)
export const updateProductFlags = (id, payload) => request(`/admin/products/${id}/flags`, { method: 'PATCH', body: payload })
export const adjustProductStock = (id, payload) => request(`/admin/products/${id}/stock`, { method: 'PATCH', body: payload })
export const batchUpdateProducts = (payload) => request('/admin/products/batch', { method: 'PATCH', body: payload })
export const fetchAdminBookStats = () => request('/admin/books/stats')
export const getAdminBookDetail = (id) => request(`/admin/books/${id}/detail`)
export const fetchAdminBookReservations = (id, params = {}) => request(`/admin/books/${id}/reservations${toQuery(params)}`)
export const updateAdminBookReservationStatus = (bookId, reservationId, payload) => request(`/admin/books/${bookId}/reservations/${reservationId}/status`, { method: 'PATCH', body: payload })
export const updateBookFlags = (id, payload) => request(`/admin/books/${id}/flags`, { method: 'PATCH', body: payload })
export const adjustBookStock = (id, payload) => request(`/admin/books/${id}/stock`, { method: 'PATCH', body: payload })
export const batchUpdateBooks = (payload) => request('/admin/books/batch', { method: 'PATCH', body: payload })
export const fetchAdminOrderStats = () => request('/admin/orders/stats')
export const batchUpdateOrders = (payload) => request('/admin/orders/batch', { method: 'PATCH', body: payload })
export const getAdminUserDetail = (id) => request(`/admin/users/${id}/detail`)
export const updateAdminUserRisk = (id, payload) => request(`/admin/users/${id}/risk`, { method: 'PATCH', body: payload })
export const updateAdminUserPenalty = (id, payload) => request(`/admin/users/${id}/penalty`, { method: 'PATCH', body: payload })
export const applyCommunityUserPenalty = (id, payload) => request(`/admin/community/users/${id}/penalty`, { method: 'POST', body: payload })
export const fetchUploadFileStats = () => request('/upload/files/stats')
export const fetchUploadFileDetail = (id) => request(`/upload/files/${id}/detail`)
export const getUploadFileReferences = (id) => request(`/upload/files/${id}/references`)
export const batchDeleteUploadFiles = (payload) => request('/upload/files/batch-delete', { method: 'POST', body: payload })
export const fetchAdminLogStats = () => request('/admin/logs/stats')
export const fetchAdminSeatStats = () => request('/admin/seats/stats')
export const getAdminSeatDetail = (id) => request(`/admin/seats/${id}/detail`)
