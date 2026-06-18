import { request, toQuery } from './request'

export function fetchProducts(params = {}) {
  return request(`/products${toQuery(params)}`)
}

export function fetchProductDetail(slug) {
  return request(`/products/${encodeURIComponent(slug)}`)
}

export function fetchProductRecommendations(params = {}) {
  return request(`/products/recommendations${toQuery(params)}`)
}

export function fetchProductReviews(productId, params = {}) {
  return request(`/products/${encodeURIComponent(productId)}/reviews${toQuery(params)}`)
}

export function createProductReview(productId, payload) {
  return request(`/products/${encodeURIComponent(productId)}/reviews`, { method: 'POST', body: payload })
}
