import assert from 'node:assert/strict'

import { installChunkRecovery } from '../apps/shared/chunk-recovery.js'

const storage = new Map()
const assigned = []
const listeners = new Map()
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.window = {
  location: { pathname: '/', assign: (path) => assigned.push(path), reload: () => assigned.push('reload') },
  addEventListener: (name, callback) => listeners.set(name, callback),
}

let onError
let afterEach
const router = {
  onError: (callback) => { onError = callback },
  afterEach: (callback) => { afterEach = callback },
}

installChunkRecovery(router, 'test')
onError(new Error('ordinary navigation failure'), { fullPath: '/books' })
assert.deepEqual(assigned, [])

onError(new Error('Failed to fetch dynamically imported module'), { fullPath: '/books' })
assert.deepEqual(assigned, ['/books'])
onError(new Error('Loading chunk 42 failed'), { fullPath: '/books' })
assert.deepEqual(assigned, ['/books'])
afterEach()

let prevented = false
listeners.get('vite:preloadError')({ preventDefault: () => { prevented = true } })
assert.equal(prevented, true)
assert.equal(assigned.at(-1), 'reload')
listeners.get('vite:preloadError')({ preventDefault: () => {} })
assert.equal(assigned.filter((item) => item === 'reload').length, 1)

console.log('Chunk recovery tests passed')
