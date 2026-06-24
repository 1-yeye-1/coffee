import { request } from './request'

const defaultBase = import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : '/api'
const apiOrigin = String(import.meta.env.VITE_API_BASE_URL || defaultBase).replace(/\/api\/?$/, '').replace(/\/$/, '')

function buildFormData(file) {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export function resolveUploadUrl(url) {
  const raw = url == null ? '' : String(url).trim()
  if (!raw || /^(https?:\/\/|data:|blob:)/i.test(raw)) return raw
  if (import.meta.env.DEV) return raw.startsWith('/') ? raw : `/${raw}`
  return `${apiOrigin}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export const uploadAvatar = (file) => request('/upload/avatar', {
  method: 'POST',
  body: buildFormData(file),
  timeoutMs: 30000,
})

export const uploadCommunityMedia = (file) => request('/upload/community', {
  method: 'POST',
  body: buildFormData(file),
  timeoutMs: 60000,
})

export const uploadReviewMedia = (file) => request('/upload/review', {
  method: 'POST',
  body: buildFormData(file),
  timeoutMs: 60000,
})
