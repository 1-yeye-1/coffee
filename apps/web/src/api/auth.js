import { request } from './request'

export function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

export function sendCode(payload) {
  return request('/auth/sms-code', { method: 'POST', body: payload })
}

export const sendSmsCode = sendCode

export function getCaptcha() {
  return request('/auth/captcha')
}

export function verifyCaptcha(payload) {
  return Promise.resolve({ data: { verified: Boolean(payload?.captchaId && payload?.captchaCode) } })
}

export function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload })
}

export function loginBySms(payload) {
  return request('/auth/login/sms', { method: 'POST', body: payload })
}

export function loginByPassword(payload) {
  return request('/auth/login/password', { method: 'POST', body: payload })
}

export function getCurrentUser() {
  return request('/auth/me', { timeoutMs: 1200 })
}

export const fetchMe = getCurrentUser

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
