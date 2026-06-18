import { request } from './request'

export function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

export function sendCode(payload) {
  return request('/auth/sms-code', { method: 'POST', body: payload })
}

export function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload })
}

export function getCurrentUser() {
  return request('/auth/me', { timeoutMs: 1200 })
}

export const fetchMe = getCurrentUser

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
