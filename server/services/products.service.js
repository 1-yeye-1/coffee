import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'

const columns = `
  id, slug, name, category, price, original_price AS originalPrice, stock, status,
  sales, flavor, origin, roast, description, scene, storage, tone,
  created_at AS createdAt, updated_at AS updatedAt
`

const sortMap = {
  default: 'id ASC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id ASC',
  sales_desc: 'sales DESC, id ASC',
  newest: 'created_at DESC, id DESC',
}

function buildFilters(query) {
  const clauses = []
  const params = []
  const keyword = String(query.keyword || '').trim()

  if (keyword) {
    clauses.push('(name LIKE ? OR origin LIKE ? OR description LIKE ? OR JSON_SEARCH(flavor, "one", ?) IS NOT NULL)')
    const pattern = `%${keyword}%`
    params.push(pattern, pattern, pattern, pattern)
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

function normalizeProduct(product) {
  if (!product) return null
  return {
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice === null ? null : Number(product.originalPrice),
    flavor: typeof product.flavor === 'string' ? JSON.parse(product.flavor) : product.flavor,
  }
}

export async function listProducts(query = {}) {
  const { page, pageSize, offset } = parsePagination(query)
  const { where, params } = buildFilters(query)
  const orderBy = sortMap[query.sort] || sortMap.default
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM products ${where}`,
    params,
  )
  const [rows] = await pool.query(
    `SELECT ${columns} FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return {
    items: rows.map(normalizeProduct),
    meta: { page, pageSize, total: Number(countRows[0].total) },
  }
}

export async function findProductBySlug(slug) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM products WHERE slug = ? LIMIT 1`,
    [slug],
  )
  return normalizeProduct(rows[0])
}

export async function findProductById(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM products WHERE id = ? LIMIT 1`, [id])
  return normalizeProduct(rows[0])
}

function productParams(payload) {
  return [payload.slug, payload.name, payload.category, Number(payload.price),
    payload.originalPrice === '' || payload.originalPrice == null ? null : Number(payload.originalPrice),
    Number(payload.stock) || 0, payload.status || 'active', Number(payload.sales) || 0,
    JSON.stringify(Array.isArray(payload.flavor) ? payload.flavor : []), payload.origin || null,
    payload.roast || null, payload.description || null, payload.scene || null,
    payload.storage || null, payload.tone || null]
}

export async function createProduct(payload) {
  const [result] = await pool.execute(
    `INSERT INTO products (slug, name, category, price, original_price, stock, status, sales,
      flavor, origin, roast, description, scene, storage, tone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, productParams(payload),
  )
  return findProductById(result.insertId)
}

export async function updateProduct(id, payload) {
  await pool.execute(
    `UPDATE products SET slug=?, name=?, category=?, price=?, original_price=?, stock=?, status=?,
      sales=?, flavor=?, origin=?, roast=?, description=?, scene=?, storage=?, tone=? WHERE id=?`,
    [...productParams(payload), id],
  )
  return findProductById(id)
}

export async function updateProductStatus(id, status) {
  await pool.execute('UPDATE products SET status = ? WHERE id = ?', [status, id])
  return findProductById(id)
}

export async function deleteProduct(id) {
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id])
  return result.affectedRows > 0
}
