import { request } from './request'

export function login(payload) {
  return request('/admin/auth/login', { method: 'POST', body: payload })
}

export function getCurrentUser() {
  return request('/admin/auth/me', { timeoutMs: 1200 })
}

export const fetchMe = getCurrentUser

export function logout() {
  return request('/admin/auth/logout', { method: 'POST' })
}
