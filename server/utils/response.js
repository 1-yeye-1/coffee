export function success(res, data = {}, message = 'success', statusCode = 200) {
  return res.json(statusCode, { code: 0, message, data })
}

export function paginated(res, data, meta, message = 'success') {
  return res.json(200, { code: 0, message, data, meta })
}

export function failure(res, code, message, statusCode = code) {
  return res.json(statusCode, { code, message, data: null })
}
