export function requiredString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeOptional(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value).trim()
}

export function isEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
