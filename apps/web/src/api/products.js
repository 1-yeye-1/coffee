import { request, toQuery } from './request'

export function fetchProducts(params = {}) {
  return request(`/products${toQuery(params)}`)
}

export function fetchProductDetail(slug) {
  return request(`/products/${encodeURIComponent(slug)}`)
}
