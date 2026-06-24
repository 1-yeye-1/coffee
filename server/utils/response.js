import { statsMeta } from '../services/stats.service.js'

export function success(res, data = {}, message = 'success', statusCode = 200) {
  return res.status(statusCode).json({ code: 0, message, data })
}

export function dbSuccess(res, data = {}, message = 'success', statusCode = 200, meta = {}) {
  return res.status(statusCode).json({ code: 0, message, data, meta: statsMeta(meta) })
}

export function paginated(res, data, meta, message = 'success') {
  return res.status(200).json({ code: 0, message, data, meta })
}

export function failure(res, code, message, statusCode = code) {
  return res.status(statusCode).json({ code, message, data: null })
}
