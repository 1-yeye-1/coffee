import { registerAdminRoutes } from './admin.routes.js'
import { registerAccountRoutes } from './account.routes.js'
import { registerAuthRoutes } from './auth.routes.js'
import { registerBooksRoutes } from './books.routes.js'
import { registerBookingRoutes } from './booking.routes.js'
import { registerCommunityRoutes } from './community.routes.js'
import { registerEventsRoutes } from './events.routes.js'
import { registerProductsRoutes } from './products.routes.js'
import { registerCartRoutes } from './cart.routes.js'
import { registerOrdersRoutes } from './orders.routes.js'

function compilePath(path) {
  const keys = []
  const pattern = path
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment
      keys.push(segment.slice(1))
      return '([^/]+)'
    })
    .join('/')
  return { keys, regex: new RegExp(`^${pattern}/?$`) }
}

export function createRouter() {
  const routes = []

  function add(method, path, handlers) {
    routes.push({ method, ...compilePath(path), handlers })
  }

  const router = {
    get: (path, ...handlers) => add('GET', path, handlers),
    post: (path, ...handlers) => add('POST', path, handlers),
    put: (path, ...handlers) => add('PUT', path, handlers),
    patch: (path, ...handlers) => add('PATCH', path, handlers),
    delete: (path, ...handlers) => add('DELETE', path, handlers),
    async handle(req, res) {
      const route = routes.find((candidate) => (
        candidate.method === req.method && candidate.regex.test(req.pathname)
      ))
      if (!route) return false

      const match = req.pathname.match(route.regex)
      req.params = Object.fromEntries(
        route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]),
      )

      for (const handler of route.handlers) {
        const result = await handler(req, res)
        if (result === false || res.writableEnded) break
      }
      return true
    },
  }

  registerAuthRoutes(router)
  registerBooksRoutes(router)
  registerProductsRoutes(router)
  registerEventsRoutes(router)
  registerCommunityRoutes(router)
  registerBookingRoutes(router)
  registerCartRoutes(router)
  registerOrdersRoutes(router)
  registerAccountRoutes(router)
  registerAdminRoutes(router)
  return router
}
