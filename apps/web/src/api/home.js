import { request } from './request'

export function fetchHomeSnapshot(options = {}) {
  return request('/home', { timeoutMs: options.timeoutMs ?? 1800, signal: options.signal })
}

export function fetchHomeLiteSnapshot(options = {}) {
  return request('/home/lite', { timeoutMs: options.timeoutMs ?? 1200, signal: options.signal })
}
