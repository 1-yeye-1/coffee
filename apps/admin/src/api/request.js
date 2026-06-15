const defaultBaseURL = import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : ''
const baseURL = String(import.meta.env.VITE_API_BASE_URL || defaultBaseURL).replace(/\/$/, '')
const AUTH_STORAGE_KEY = 'coffee-book-auth'
const DEFAULT_TIMEOUT_MS = 8000

function readToken() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}').accessToken || null
  } catch {
    return null
  }
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('coffee-book:auth-expired'))
}

export class ApiError extends Error {
  constructor(message, { code = 0, status = 0, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.data = data
  }
}

export async function request(path, options = {}) {
  if (!baseURL) throw new ApiError('未配置 VITE_API_BASE_URL')
  const headers = new Headers(options.headers)
  const token = readToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body = options.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  let response

  try {
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options
    response = await fetch(`${baseURL}${path}`, {
      ...fetchOptions,
      headers,
      body,
      signal: controller.signal,
    })
  } catch (error) {
    const message = error.name === 'AbortError'
      ? '请求超时，请检查 API 服务是否可用'
      : '网络连接失败，请检查后端服务是否已启动'
    throw new ApiError(message)
  } finally {
    window.clearTimeout(timeoutId)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('服务端返回了无法解析的数据', { status: response.status })
  }

  if (response.status === 401) clearAuth()
  if (!response.ok || payload.code !== 0) {
    const fallbackMessage = response.status === 403
      ? '无权限执行此操作'
      : response.status === 404
        ? '请求的资源不存在'
        : '请求失败'
    throw new ApiError(payload.message || fallbackMessage, {
      code: payload.code,
      status: response.status,
      data: payload.data,
    })
  }

  return payload
}

export const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
}

export function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}
