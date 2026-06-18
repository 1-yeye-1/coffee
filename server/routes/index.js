import express from 'express'

import { registerAccountRoutes } from './account.routes.js'
import { registerAdminLogRoutes } from './admin-log.routes.js'
import { registerAdminRoutes } from './admin.routes.js'
import { registerAuthRoutes } from './auth.routes.js'
import { registerBooksRoutes } from './books.routes.js'
import { registerBookingRoutes } from './booking.routes.js'
import { registerCartRoutes } from './cart.routes.js'
import { registerCommunityRoutes } from './community.routes.js'
import { registerEventsRoutes } from './events.routes.js'
import { registerNotificationsRoutes } from './notifications.routes.js'
import { registerOrdersRoutes } from './orders.routes.js'
import { registerProductsRoutes } from './products.routes.js'
import { registerSearchRoutes } from './search.routes.js'
import { registerUploadRoutes } from './upload.routes.js'
import { registerSeatsRoutes } from './seats.routes.js'

function wrapHandlers(handlers) {
  return async (req, res, next) => {
    try {
      for (const handler of handlers) {
        const result = handler.length >= 3
          ? await new Promise((resolve, reject) => {
            let settled = false
            const done = (error) => {
              if (settled) return
              settled = true
              if (error) reject(error)
              else resolve(true)
            }
            Promise.resolve(handler(req, res, done))
              .then((value) => {
                if (settled) return
                if (value === false || res.headersSent) {
                  settled = true
                  resolve(false)
                }
              })
              .catch(done)
          })
          : await handler(req, res)
        if (result === false || res.headersSent) return
      }
    } catch (error) {
      next(error)
    }
  }
}

function createRouteRegistrar(expressRouter) {
  const register = (method, path, handlers) => {
    expressRouter[method](path, wrapHandlers(handlers))
  }

  return {
    get: (path, ...handlers) => register('get', path, handlers),
    post: (path, ...handlers) => register('post', path, handlers),
    put: (path, ...handlers) => register('put', path, handlers),
    patch: (path, ...handlers) => register('patch', path, handlers),
    delete: (path, ...handlers) => register('delete', path, handlers),
  }
}

export function createRouter() {
  const expressRouter = express.Router()
  const router = createRouteRegistrar(expressRouter)

  registerAuthRoutes(router)
  registerBooksRoutes(router)
  registerProductsRoutes(router)
  registerSearchRoutes(router)
  registerEventsRoutes(router)
  registerCommunityRoutes(router)
  registerBookingRoutes(router)
  registerCartRoutes(router)
  registerOrdersRoutes(router)
  registerAccountRoutes(router)
  registerNotificationsRoutes(router)
  registerUploadRoutes(router)
  registerSeatsRoutes(router)
  registerAdminLogRoutes(router)
  registerAdminRoutes(router)

  return expressRouter
}
