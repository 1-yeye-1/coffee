import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'

const columns = `
  id, slug, name, category, product_type AS productType,
  supports_brew_method AS supportsBrewMethod, image_url AS imageUrl, price, original_price AS originalPrice, stock, status,
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
const validProductStatuses = new Set(['active', 'inactive', 'draft'])

function assertProductStatus(status) {
  if (!validProductStatuses.has(status)) throw Object.assign(new Error('商品状态无效'), { statusCode: 400 })
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
  if (query.productType && query.productType !== 'all') {
    clauses.push('product_type = ?')
    params.push(query.productType)
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
    productType: product.productType || 'cultural',
    supportsBrewMethod: Boolean(product.supportsBrewMethod),
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

export async function listProductRecommendations(query = {}) {
  const limit = Math.min(12, Math.max(1, Number(query.limit) || 4))
  const excluded = String(query.exclude || '').split(',').map(Number).filter(Number.isFinite)
  const params = []
  let exclusion = ''
  if (excluded.length) {
    exclusion = `AND id NOT IN (${excluded.map(() => '?').join(',')})`
    params.push(...excluded)
  }
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM products WHERE status = 'active' AND stock > 0 ${exclusion}
     ORDER BY sales DESC, stock DESC, created_at DESC, id DESC LIMIT ${limit}`,
    params,
  )
  return rows.map(normalizeProduct)
}

function normalizeProductType(payload) {
  return payload.productType === 'coffee' ? 'coffee' : 'cultural'
}

function productParams(payload) {
  const productType = normalizeProductType(payload)
  const supportsBrewMethod = productType === 'coffee' ? Number(payload.supportsBrewMethod !== false) : 0
  return [payload.slug, payload.name, payload.category, productType, supportsBrewMethod, payload.imageUrl || payload.image_url || null, Number(payload.price),
    payload.originalPrice === '' || payload.originalPrice == null ? null : Number(payload.originalPrice),
    Number(payload.stock) || 0, payload.status || 'active', Number(payload.sales) || 0,
    JSON.stringify(Array.isArray(payload.flavor) ? payload.flavor : []), payload.origin || null,
    payload.roast || null, payload.description || null, payload.scene || null,
    payload.storage || null, payload.tone || null]
}

export async function createProduct(payload) {
  assertProductStatus(payload.status || 'active')
  const [result] = await pool.execute(
    `INSERT INTO products (slug, name, category, product_type, supports_brew_method, image_url, price, original_price, stock, status, sales,
      flavor, origin, roast, description, scene, storage, tone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, productParams(payload),
  )
  return findProductById(result.insertId)
}

export async function updateProduct(id, payload) {
  assertProductStatus(payload.status || 'active')
  await pool.execute(
    `UPDATE products SET slug=?, name=?, category=?, product_type=?, supports_brew_method=?, image_url=?, price=?, original_price=?, stock=?, status=?,
      sales=?, flavor=?, origin=?, roast=?, description=?, scene=?, storage=?, tone=? WHERE id=?`,
    [...productParams(payload), id],
  )
  return findProductById(id)
}

function mapReview(row) {
  return {
    id: row.id,
    productId: row.productId,
    orderId: row.orderId,
    rating: Number(row.rating),
    content: row.content,
    mediaUrl: row.mediaUrl,
    mediaType: row.mediaType,
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      nickname: row.nickname || row.username || `用户${String(row.userId).slice(-4)}`,
      avatar: row.avatar,
    },
  }
}

export async function listProductReviews(productId, query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 10)
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM product_reviews WHERE product_id = ? AND status = 'published'",
    [productId],
  )
  const [rows] = await pool.execute(
    `SELECT r.id, r.product_id AS productId, r.user_id AS userId, r.order_id AS orderId,
      r.rating, r.content, r.media_url AS mediaUrl, r.media_type AS mediaType,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar
     FROM product_reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.status = 'published'
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    [productId],
  )
  return { items: rows.map(mapReview), meta: { page, pageSize, total: Number(total) } }
}

export async function createProductReview(productId, userId, payload) {
  const rating = Math.min(5, Math.max(1, Number(payload.rating) || 5))
  const content = String(payload.content || '').trim()
  const mediaUrl = String(payload.mediaUrl || '').trim() || null
  const mediaType = String(payload.mediaType || '').trim() || null
  if (!content && !mediaUrl) throw Object.assign(new Error('请填写评价内容或上传图片/视频'), { statusCode: 400 })
  if (mediaType && !['image', 'video'].includes(mediaType)) throw Object.assign(new Error('评价媒体类型不正确'), { statusCode: 400 })
  if (!await findProductById(productId)) throw Object.assign(new Error('商品不存在'), { statusCode: 404 })
  const [result] = await pool.execute(
    `INSERT INTO product_reviews (product_id, user_id, order_id, rating, content, media_url, media_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, userId, payload.orderId || null, rating, content || null, mediaUrl, mediaType],
  )
  const [rows] = await pool.execute(
    `SELECT r.id, r.product_id AS productId, r.user_id AS userId, r.order_id AS orderId,
      r.rating, r.content, r.media_url AS mediaUrl, r.media_type AS mediaType,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar
     FROM product_reviews r INNER JOIN users u ON u.id = r.user_id
     WHERE r.id = ? LIMIT 1`,
    [result.insertId],
  )
  return mapReview(rows[0])
}

export async function deleteOwnProductReview(reviewId, userId) {
  const [result] = await pool.execute(
    "UPDATE product_reviews SET status = 'hidden' WHERE id = ? AND user_id = ?",
    [reviewId, userId],
  )
  return Number(result.affectedRows || 0) > 0
}

export async function updateProductStatus(id, status) {
  assertProductStatus(status)
  await pool.execute('UPDATE products SET status = ? WHERE id = ?', [status, id])
  return findProductById(id)
}

export async function deleteProduct(id) {
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id])
  return result.affectedRows > 0
}
