import { request, toQuery } from './request'

export function fetchBooks(params = {}) {
  return request(`/books${toQuery(params)}`)
}

export function fetchBookDetail(slug) {
  return request(`/books/${encodeURIComponent(slug)}`)
}
