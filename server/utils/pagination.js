export function parsePagination(query, defaultPageSize = 12) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || defaultPageSize))
  return { page, pageSize, offset: (page - 1) * pageSize }
}
