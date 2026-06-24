import { request } from './request'

export function fetchHomeSnapshot() {
  return request('/home')
}
