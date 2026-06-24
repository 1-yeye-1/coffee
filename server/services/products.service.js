import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'

const columns = `
  id, slug, name, category, product_type AS productType,
  supports_brew_method AS supportsBrewMethod, image_url AS imageUrl, price, original_price AS originalPrice, stock, status,
  sales, flavor, origin, roast, description, scene, storage, tone,
  is_featured AS isFeatured, is_new AS isNew, is_hot AS isHot,
  low_stock_threshold AS lowStockThreshold, view_count AS viewCount, favorite_count AS favoriteCount,
  (SELECT COALESCE(ROUND(AVG(pr.rating), 1), 0) FROM product_reviews pr WHERE pr.product_id = products.id AND pr.status = 'published' AND pr.parent_id IS NULL) AS reviewAverage,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = products.id AND pr.status = 'published' AND pr.parent_id IS NULL) AS reviewCount,
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

function slugify(value, fallback = 'product') {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

async function uniqueProductSlug(base, excludeId = null) {
  const root = slugify(base)
  let slug = root
  let index = 2
  while (true) {
    const params = [slug]
    let clause = ''
    if (excludeId) {
      clause = 'AND id <> ?'
      params.push(excludeId)
    }
    const [[row]] = await pool.execute(`SELECT id FROM products WHERE slug = ? ${clause} LIMIT 1`, params)
    if (!row) return slug
    slug = `${root}-${index++}`
  }
}

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
  if (query.stockMin !== undefined && query.stockMin !== '') {
    clauses.push('stock >= ?')
    params.push(Number(query.stockMin) || 0)
  }
  if (query.stockMax !== undefined && query.stockMax !== '') {
    clauses.push('stock <= ?')
    params.push(Number(query.stockMax) || 0)
  }
  for (const [queryKey, column] of [['isFeatured', 'is_featured'], ['isNew', 'is_new'], ['isHot', 'is_hot']]) {
    if (query[queryKey] !== undefined && query[queryKey] !== '' && query[queryKey] !== 'all') {
      clauses.push(`${column} = ?`)
      params.push(['1', 'true', 'yes', true, 1].includes(query[queryKey]) ? 1 : 0)
    }
  }
  if (query.startDate) {
    clauses.push('created_at >= ?')
    params.push(query.startDate)
  }
  if (query.endDate) {
    clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(query.endDate)
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
    isFeatured: Boolean(product.isFeatured),
    isNew: Boolean(product.isNew),
    isHot: Boolean(product.isHot),
    lowStockThreshold: Number(product.lowStockThreshold || 5),
    viewCount: Number(product.viewCount || 0),
    favoriteCount: Number(product.favoriteCount || 0),
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

function flagValue(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
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
  const next = { ...payload, slug: payload.slug || await uniqueProductSlug(payload.name) }
  const [result] = await pool.execute(
    `INSERT INTO products (slug, name, category, product_type, supports_brew_method, image_url, price, original_price, stock, status, sales,
      flavor, origin, roast, description, scene, storage, tone, is_featured, is_new, is_hot, low_stock_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...productParams(next), flagValue(next.isFeatured || next.is_featured) ? 1 : 0, flagValue(next.isNew || next.is_new) ? 1 : 0, flagValue(next.isHot || next.is_hot) ? 1 : 0, Math.max(0, Number(next.lowStockThreshold ?? next.low_stock_threshold ?? 5) || 5)],
  )
  return findProductById(result.insertId)
}

export async function updateProduct(id, payload) {
  const current = await findProductById(id)
  if (!current) return null
  const next = { ...current, ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) }
  next.slug = current.slug || payload.slug || await uniqueProductSlug(next.name, id)
  assertProductStatus(next.status || 'active')
  await pool.execute(
    `UPDATE products SET slug=?, name=?, category=?, product_type=?, supports_brew_method=?, image_url=?, price=?, original_price=?, stock=?, status=?,
      sales=?, flavor=?, origin=?, roast=?, description=?, scene=?, storage=?, tone=?, is_featured=?, is_new=?, is_hot=?, low_stock_threshold=? WHERE id=?`,
    [...productParams(next), flagValue(next.isFeatured ?? next.is_featured) ? 1 : 0, flagValue(next.isNew ?? next.is_new) ? 1 : 0, flagValue(next.isHot ?? next.is_hot) ? 1 : 0, Math.max(0, Number(next.lowStockThreshold ?? next.low_stock_threshold ?? 5) || 5), id],
  )
  return findProductById(id)
}

function mapReview(row) {
  return {
    id: row.id,
    productId: row.productId,
    orderId: row.orderId,
    parentId: row.parentId,
    rating: Number(row.rating),
    content: String(row.content || ''),
    mediaUrl: row.mediaUrl || '',
    mediaType: row.mediaType || '',
    likeCount: Number(row.likeCount || 0),
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      nickname: row.nickname || row.username || `用户${String(row.userId || '').slice(-4)}`,
      avatar: row.avatar || '',
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
      r.parent_id AS parentId,
      r.rating, r.content, r.media_url AS mediaUrl, r.media_type AS mediaType,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'product_review' AND cl.comment_id = r.id) AS likeCount
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
  const [[purchase]] = await pool.execute(
    `SELECT o.id AS orderId FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('paid', 'completed')
     ORDER BY o.id DESC LIMIT 1`,
    [userId, productId],
  )
  if (!purchase) throw Object.assign(new Error('购买后才能评价商品'), { statusCode: 403 })
  const [[existing]] = await pool.execute(
    'SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ? AND parent_id IS NULL LIMIT 1',
    [productId, userId],
  )
  if (existing) {
    await pool.execute(
      `UPDATE product_reviews SET order_id = ?, rating = ?, content = ?, media_url = ?, media_type = ?,
        status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [purchase.orderId, rating, content || null, mediaUrl, mediaType, existing.id],
    )
  } else {
    await pool.execute(
      `INSERT INTO product_reviews (product_id, user_id, order_id, rating, content, media_url, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, userId, purchase.orderId, rating, content || null, mediaUrl, mediaType],
    )
  }
  const [rows] = await pool.execute(
    `SELECT r.id, r.product_id AS productId, r.user_id AS userId, r.order_id AS orderId,
      r.parent_id AS parentId,
      r.rating, r.content, r.media_url AS mediaUrl, r.media_type AS mediaType,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'product_review' AND cl.comment_id = r.id) AS likeCount
     FROM product_reviews r INNER JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.user_id = ? AND r.parent_id IS NULL LIMIT 1`,
    [productId, userId],
  )
  return mapReview(rows[0])
}

export async function replyProductReview(productId, parentId, userId, payload) {
  const content = String(payload.content || '').trim()
  if (!content) throw Object.assign(new Error('请填写回复内容'), { statusCode: 400 })
  const [[parent]] = await pool.execute(
    "SELECT id FROM product_reviews WHERE id = ? AND product_id = ? AND status = 'published' LIMIT 1",
    [parentId, productId],
  )
  if (!parent) throw Object.assign(new Error('评论不存在'), { statusCode: 404 })
  const [result] = await pool.execute(
    `INSERT INTO product_reviews (product_id, user_id, parent_id, rating, content, status)
     VALUES (?, ?, ?, 5, ?, 'published')`,
    [productId, userId, parentId, content],
  )
  const [rows] = await pool.execute(
    `SELECT r.id, r.product_id AS productId, r.user_id AS userId, r.order_id AS orderId,
      r.parent_id AS parentId, r.rating, r.content, r.media_url AS mediaUrl, r.media_type AS mediaType,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'product_review' AND cl.comment_id = r.id) AS likeCount
     FROM product_reviews r INNER JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1`,
    [result.insertId],
  )
  return mapReview(rows[0])
}

export async function likeProductReview(reviewId, userId) {
  await pool.execute(
    `INSERT IGNORE INTO comment_likes (target_type, comment_id, user_id) VALUES ('product_review', ?, ?)`,
    [reviewId, userId],
  )
  const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM comment_likes WHERE target_type = 'product_review' AND comment_id = ?", [reviewId])
  return { liked: true, likeCount: Number(row.total) }
}

export async function unlikeProductReview(reviewId, userId) {
  await pool.execute("DELETE FROM comment_likes WHERE target_type = 'product_review' AND comment_id = ? AND user_id = ?", [reviewId, userId])
  const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM comment_likes WHERE target_type = 'product_review' AND comment_id = ?", [reviewId])
  return { liked: false, likeCount: Number(row.total) }
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


export async function getProductAdminStats() {
  const [[row]] = await pool.execute(`SELECT
    COUNT(*) AS total,
    SUM(status = 'active') AS active,
    SUM(status <> 'active') AS inactive,
    SUM(stock <= low_stock_threshold) AS lowStock,
    SUM(is_featured = 1) AS featured,
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id WHERE DATE(o.created_at) = CURRENT_DATE) AS todaySales
    FROM products`)
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]))
}

export async function getProductStockLogs(productId, limit = 20) {
  const [rows] = await pool.execute(
    `SELECT l.id, l.product_id AS productId, l.change_type AS changeType, l.change_amount AS changeAmount,
      l.before_stock AS beforeStock, l.after_stock AS afterStock, l.reason, l.operator_id AS operatorId,
      a.username AS operatorName, l.created_at AS createdAt
     FROM product_stock_logs l LEFT JOIN admin_users a ON a.id = l.operator_id
     WHERE l.product_id = ? ORDER BY l.created_at DESC, l.id DESC LIMIT ${Math.min(100, Math.max(1, Number(limit) || 20))}`,
    [productId],
  )
  return rows
}

export async function getProductAdminDetail(id) {
  const product = await findProductById(id)
  if (!product) return null
  const [[orders]] = await pool.execute('SELECT COUNT(DISTINCT order_id) AS total FROM order_items WHERE product_id = ?', [id])
  return { ...product, stockLogs: await getProductStockLogs(id), relatedOrderCount: Number(orders.total || 0) }
}

export async function updateProductFlags(id, flags = {}, operatorId = null, connection = pool) {
  const allowed = { isFeatured: 'is_featured', isNew: 'is_new', isHot: 'is_hot' }
  const fields = []
  const params = []
  for (const [key, column] of Object.entries(allowed)) {
    if (flags[key] !== undefined) {
      fields.push(`${column} = ?`)
      params.push(flagValue(flags[key]) ? 1 : 0)
    }
  }
  if (!fields.length) throw Object.assign(new Error('??????????'), { statusCode: 400 })
  params.push(id)
  const [result] = await connection.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params)
  if (!result.affectedRows) return null
  await writeAudit(operatorId, 'product.flags.update', 'products', { id, flags, operatorType: 'admin' }, connection)
  return findProductById(id)
}

export async function adjustProductStock(id, payload = {}, operatorId = null) {
  const amount = Number(payload.amount ?? payload.changeAmount)
  const mode = String(payload.changeType || payload.type || 'adjust')
  const reason = String(payload.reason || '').trim()
  if (!Number.isInteger(amount)) throw Object.assign(new Error('???????????'), { statusCode: 400 })
  if (!reason) throw Object.assign(new Error('??????????'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[product]] = await connection.execute('SELECT id, stock FROM products WHERE id = ? FOR UPDATE', [id])
    if (!product) { await connection.rollback(); return null }
    const beforeStock = Number(product.stock || 0)
    const afterStock = mode === 'in' ? beforeStock + Math.abs(amount) : mode === 'out' ? beforeStock - Math.abs(amount) : amount
    if (!Number.isInteger(afterStock) || afterStock < 0) throw Object.assign(new Error('?????????'), { statusCode: 400 })
    await connection.execute('UPDATE products SET stock = ? WHERE id = ?', [afterStock, id])
    await connection.execute(
      `INSERT INTO product_stock_logs (product_id, change_type, change_amount, before_stock, after_stock, reason, operator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, mode, afterStock - beforeStock, beforeStock, afterStock, reason, operatorId],
    )
    await writeAudit(operatorId, 'product.stock.adjust', 'products', { id, changeType: mode, beforeStock, afterStock, reason, operatorType: 'admin' }, connection)
    await connection.commit()
    return getProductAdminDetail(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function batchUpdateProducts(ids = [], payload = {}, operatorId = null) {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter(Boolean))]
  if (!uniqueIds.length) throw Object.assign(new Error('?????'), { statusCode: 400 })
  const updated = []
  const errors = []
  for (const id of uniqueIds) {
    try {
      if (payload.status) updated.push(await updateProductStatus(id, payload.status))
      else updated.push(await updateProductFlags(id, payload, operatorId))
      await writeAudit(operatorId, 'product.batch.update', 'products', { id, payload, operatorType: 'admin' })
    } catch (error) {
      errors.push({ id, message: error.message })
    }
  }
  return { updated: updated.filter(Boolean), errors }
}
