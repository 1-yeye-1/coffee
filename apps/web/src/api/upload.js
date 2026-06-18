import { request } from './request'

const defaultOrigin = import.meta.env.DEV ? 'http://127.0.0.1:4173' : ''
const apiOrigin = String(import.meta.env.VITE_API_BASE_URL || defaultOrigin).replace(/\/api\/?$/, '').replace(/\/$/, '')

function buildFormData(file) {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export function resolveUploadUrl(url) {
  if (!url || /^(https?:\/\/|data:|blob:)/.test(url)) return url
  return `${apiOrigin}${url}`
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
