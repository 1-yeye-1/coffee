import { request, toQuery } from './request'

export function fetchBooks(params = {}) {
  return request(`/books${toQuery(params)}`)
}

export function fetchBookDetail(slug) {
  const id = Array.isArray(slug) ? slug[0] : slug
  const safeId = String(id || '').trim()
  if (!safeId || safeId === '[object Object]' || safeId === 'undefined') {
    return Promise.reject(Object.assign(new Error('图书链接参数无效'), { status: 400 }))
  }
  return request(`/books/${encodeURIComponent(safeId)}`)
}

export function fetchBookReviews(bookId, params = {}) {
  return request(`/books/${encodeURIComponent(bookId)}/reviews${toQuery(params)}`)
}

export function createBookReview(bookId, payload) {
  return request(`/books/${encodeURIComponent(bookId)}/reviews`, { method: 'POST', body: payload })
}

export function replyBookReview(bookId, reviewId, payload) {
  return request(`/books/${encodeURIComponent(bookId)}/reviews/${encodeURIComponent(reviewId)}/replies`, { method: 'POST', body: payload })
}

export function likeBookReview(reviewId) {
  return request(`/books/reviews/${encodeURIComponent(reviewId)}/like`, { method: 'POST' })
}

export function unlikeBookReview(reviewId) {
  return request(`/books/reviews/${encodeURIComponent(reviewId)}/like`, { method: 'DELETE' })
}

export function createBookReservation(bookId) {
  return request(`/books/${encodeURIComponent(bookId)}/reservations`, { method: 'POST' })
}

export function fetchMyBookReservations() {
  return request('/book-reservations/my')
}

export function cancelBookReservation(id) {
  return request(`/book-reservations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function deleteBookReview(reviewId) {
  return request(`/books/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE' })
}
