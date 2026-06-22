import assert from 'node:assert/strict'
import { access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { preview } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function assertChunks(app, prefixes) {
  const assets = await readdir(path.join(root, 'dist', app, 'assets'))
  for (const prefix of prefixes) assert(assets.some((file) => file.startsWith(prefix)), `${app} chunk missing: ${prefix}`)
}

async function smokePreview({ name, config, port, routes, chunks }) {
  const server = await preview({ configFile: path.join(root, config), preview: { host: '127.0.0.1', port, strictPort: true } })
  try {
    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`)
      assert.equal(response.status, 200, `${name} route failed: ${route}`)
      const html = await response.text()
      assert.match(html, /<div id="app"><\/div>/, `${name} route did not return app shell: ${route}`)
    }
    await access(path.join(root, 'dist', name, 'index.html'))
    await assertChunks(name, chunks)
  } finally {
    await server.close()
  }
  console.log(`PASS ${name} routes and chunks`)
}

await smokePreview({
  name: 'web', config: 'apps/web/vite.config.js', port: 4274,
  routes: ['/', '/login', '/books', '/coffee', '/events', '/community', '/booking', '/account/orders'],
  chunks: ['BooksView-', 'CoffeeView-', 'EventsView-', 'CommunityView-', 'BookingView-', 'OrdersView-'],
})
await smokePreview({
  name: 'admin', config: 'apps/admin/vite.config.js', port: 4275,
  routes: ['/login', '/dashboard', '/products', '/books', '/orders', '/community', '/bookings', '/users'],
  chunks: ['AdminProductsView-', 'AdminBooksView-', 'AdminOrdersView-', 'AdminCommunityView-', 'AdminBookingsView-', 'AdminUsersView-'],
})

console.log('Web smoke passed')
