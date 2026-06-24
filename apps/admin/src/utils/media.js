const defaultApiBase = import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : '/api'
const apiBase = String(import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '')
const mediaOrigin = apiBase.replace(/\/api\/?$/, '')

export function resolveMediaUrl(value) {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw
  const path = raw.startsWith('/') ? raw : `/${raw}`
  if (import.meta.env.DEV) return path
  return `${mediaOrigin}${path}`
}
