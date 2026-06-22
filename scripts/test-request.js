import assert from 'node:assert/strict'

import { ApiError, createRequestClient, toQuery } from '../apps/shared/request.js'

const values = new Map()
const events = []
globalThis.localStorage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
}
globalThis.window = {
  setTimeout,
  clearTimeout,
  dispatchEvent: (event) => events.push(event.type),
}
if (!globalThis.CustomEvent) globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type } }

const client = createRequestClient({ baseURL: 'http://test.local/api', tokenKey: 'token', userKey: 'user' })
const jsonResponse = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

async function expectApiError(action, assertion) {
  try { await action(); assert.fail('expected ApiError') }
  catch (error) { assert(error instanceof ApiError); assertion(error) }
}

globalThis.fetch = async () => jsonResponse(200, { code: 0, data: { ok: true } })
assert.deepEqual((await client.request('/ok')).data, { ok: true })
assert.equal(toQuery({ keyword: '咖啡', empty: '', page: 1 }), '?keyword=%E5%92%96%E5%95%A1&page=1')

values.set('token', 'expired-token'); values.set('user', '{}')
globalThis.fetch = async () => jsonResponse(401, { code: 401, message: '登录已过期', data: null })
await expectApiError(() => client.request('/expired'), (error) => assert.equal(error.status, 401))
assert.equal(values.has('token'), false); assert(events.includes('coffee-book:auth-expired'))

values.set('token', 'valid-token')
globalThis.fetch = async () => jsonResponse(403, { code: 403, message: '无权限', data: null })
await expectApiError(() => client.request('/forbidden'), (error) => assert.equal(error.status, 403))
assert.equal(values.get('token'), 'valid-token')

globalThis.fetch = async () => jsonResponse(500, { code: 500, message: '服务异常', data: null })
await expectApiError(() => client.request('/error'), (error) => { assert.equal(error.status, 500); assert.equal(error.message, '服务异常') })

globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }))
await expectApiError(() => client.request('/timeout', { timeoutMs: 10 }), (error) => assert.match(error.message, /请求超时/))

const controller = new AbortController()
const cancelled = client.request('/cancelled', { signal: controller.signal, timeoutMs: 1000 })
controller.abort()
await expectApiError(() => cancelled, (error) => assert.equal(error.message, '请求已取消'))

globalThis.fetch = async () => { throw new TypeError('offline') }
await expectApiError(() => client.request('/offline'), (error) => assert.match(error.message, /网络连接失败/))

console.log('Shared request tests passed')
