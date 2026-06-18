import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'

const columns = `
  id, slug, title, author, category, rating, stock, status,
  cover_tone AS coverTone, cover_url AS coverUrl, summary, description, isbn, publisher, year, pages,
  language, author_bio AS authorBio, created_at AS createdAt, updated_at AS updatedAt
`

const sortMap = {
  default: 'id ASC',
  rating_desc: 'rating DESC, id ASC',
  newest: 'created_at DESC, id DESC',
  stock_desc: 'stock DESC, id ASC',
}
const validBookStatuses = new Set(['available', 'unavailable', 'hidden'])

function assertBookStatus(status) {
  if (!validBookStatuses.has(status)) throw Object.assign(new Error('图书状态无效'), { statusCode: 400 })
}

function buildFilters(query) {
  const clauses = query.admin ? [] : ["status IN ('available', 'active')"]
  const params = []
  const keyword = String(query.keyword || '').trim()

  if (keyword) {
    clauses.push('(title LIKE ? OR author LIKE ? OR summary LIKE ?)')
    const pattern = `%${keyword}%`
    params.push(pattern, pattern, pattern)
  }
  if (query.category && query.category !== 'all') {
    clauses.push('category = ?')
    params.push(query.category)
  }
  if (query.status) {
    clauses.push('status = ?')
    params.push(query.status)
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

export async function listBooks(query = {}) {
  const { page, pageSize, offset } = parsePagination(query)
  const { where, params } = buildFilters(query)
  const orderBy = sortMap[query.sort] || sortMap.default
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books ${where}`,
    params,
  )
  const [rows] = await pool.query(
    `SELECT ${columns} FROM books ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: rows, meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function findBookBySlug(slug) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM books WHERE slug = ? AND status IN ('available', 'active') LIMIT 1`,
    [slug],
  )
  return rows[0] || null
}

export async function findBookById(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM books WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function createBook(payload) {
  assertBookStatus(payload.status || 'available')
  const [result] = await pool.execute(
    `INSERT INTO books (slug, title, author, category, rating, stock, status, cover_tone, cover_url, summary,
      description, isbn, publisher, year, pages, language, author_bio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.slug, payload.title, payload.author, payload.category || '', Number(payload.rating) || 0,
      Number(payload.stock) || 0, payload.status || 'available', payload.coverTone || null, payload.coverUrl || null,
      payload.summary || null, payload.description || null, payload.isbn || null,
      payload.publisher || null, payload.year || null, payload.pages || null,
      payload.language || null, payload.authorBio || null],
  )
  return findBookById(result.insertId)
}

export async function updateBook(id, payload) {
  assertBookStatus(payload.status || 'available')
  await pool.execute(
    `UPDATE books SET slug=?, title=?, author=?, category=?, rating=?, stock=?, status=?,
      cover_tone=?, cover_url=?, summary=?, description=?, isbn=?, publisher=?, year=?, pages=?, language=?, author_bio=?
     WHERE id=?`,
    [payload.slug, payload.title, payload.author, payload.category || '', Number(payload.rating) || 0,
      Number(payload.stock) || 0, payload.status || 'available', payload.coverTone || null, payload.coverUrl || null,
      payload.summary || null, payload.description || null, payload.isbn || null,
      payload.publisher || null, payload.year || null, payload.pages || null,
      payload.language || null, payload.authorBio || null, id],
  )
  return findBookById(id)
}

export async function updateBookStatus(id, status) {
  assertBookStatus(status)
  await pool.execute('UPDATE books SET status = ? WHERE id = ?', [status, id])
  return findBookById(id)
}

export async function deleteBook(id) {
  const [result] = await pool.execute('DELETE FROM books WHERE id = ?', [id])
  return result.affectedRows > 0
}
