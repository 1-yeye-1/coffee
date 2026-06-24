import { randomUUID } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { bookFavoriteCountSql } from './stats.service.js'
import { writeAudit } from './admin.service.js'

const columns = `
  id, slug, title, author, category, rating, stock, status,
  cover_tone AS coverTone, cover_url AS coverUrl, summary, description, isbn, publisher, year, pages,
  language, author_bio AS authorBio,
  ${bookFavoriteCountSql('books')} AS favorites,
  seat_id AS seatId, location_label AS locationLabel,
  is_recommended AS isRecommended, is_featured AS isFeatured, is_new AS isNew,
  shelf_area AS shelfArea, shelf_code AS shelfCode, borrow_count AS borrowCount,
  favorite_count AS favoriteCount, damaged_count AS damagedCount, lost_count AS lostCount,
  low_stock_threshold AS lowStockThreshold,
  (SELECT COALESCE(ROUND(AVG(br.rating), 1), 0) FROM book_reviews br WHERE br.book_id = books.id AND br.status = 'published' AND br.parent_id IS NULL) AS reviewAverage,
  (SELECT COUNT(*) FROM book_reviews br WHERE br.book_id = books.id AND br.status = 'published' AND br.parent_id IS NULL) AS reviewCount,
  created_at AS createdAt, updated_at AS updatedAt
`
const sortMap = { default: 'id ASC', rating_desc: 'rating DESC, id ASC', newest: 'created_at DESC, id DESC', stock_desc: 'stock DESC, id ASC' }
const validBookStatuses = new Set(['available', 'unavailable', 'hidden'])

function slugify(value, fallback = 'book') {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

async function uniqueBookSlug(base, excludeId = null) {
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
    const [[row]] = await pool.execute(`SELECT id FROM books WHERE slug = ? ${clause} LIMIT 1`, params)
    if (!row) return slug
    slug = `${root}-${index++}`
  }
}

function flagValue(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function assertBookStatus(status) {
  if (!validBookStatuses.has(status)) throw Object.assign(new Error('图书状态无效'), { statusCode: 400 })
}
function buildFilters(query) {
  const clauses = query.admin ? [] : ["status IN ('available', 'active')"]
  const params = []
  const keyword = String(query.keyword || '').trim()
  if (keyword) { clauses.push('(title LIKE ? OR author LIKE ? OR summary LIKE ?)'); const pattern = `%${keyword}%`; params.push(pattern, pattern, pattern) }
  if (query.category && query.category !== 'all') { clauses.push('category = ?'); params.push(query.category) }
  if (query.status) { clauses.push('status = ?'); params.push(query.status) }
  if (query.author) { clauses.push('author LIKE ?'); params.push(`%${String(query.author).trim()}%`) }
  if (query.stockMin !== undefined && query.stockMin !== '') { clauses.push('stock >= ?'); params.push(Number(query.stockMin) || 0) }
  if (query.stockMax !== undefined && query.stockMax !== '') { clauses.push('stock <= ?'); params.push(Number(query.stockMax) || 0) }
  if (query.ratingMin !== undefined && query.ratingMin !== '') { clauses.push('rating >= ?'); params.push(Number(query.ratingMin) || 0) }
  if (query.ratingMax !== undefined && query.ratingMax !== '') { clauses.push('rating <= ?'); params.push(Number(query.ratingMax) || 0) }
  if (query.isRecommended !== undefined && query.isRecommended !== '' && query.isRecommended !== 'all') { clauses.push('is_recommended = ?'); params.push(['1', 'true', true, 1].includes(query.isRecommended) ? 1 : 0) }
  if (query.year) { clauses.push('year = ?'); params.push(Number(query.year) || 0) }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}
export async function listBooks(query = {}) {
  const { page, pageSize, offset } = parsePagination(query)
  const { where, params } = buildFilters(query)
  const orderBy = sortMap[query.sort] || sortMap.default
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM books ${where}`, params)
  const [rows] = await pool.query(`SELECT ${columns} FROM books ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, pageSize, offset])
  return { items: rows, meta: { page, pageSize, total: Number(countRows[0].total) } }
}
export async function findBookBySlug(slug) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM books WHERE slug = ? AND status IN ('available', 'active') LIMIT 1`, [slug])
  return rows[0] || null
}
export async function findBookById(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM books WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}
export async function createBook(payload) {
  assertBookStatus(payload.status || 'available')
  const slug = payload.slug || await uniqueBookSlug(payload.title)
  const [result] = await pool.execute(
    `INSERT INTO books (slug, title, author, category, rating, stock, status, cover_tone, cover_url, summary,
      description, isbn, publisher, year, pages, language, author_bio, seat_id, location_label,
      is_recommended, is_featured, is_new, shelf_area, shelf_code, low_stock_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, payload.title, payload.author, payload.category || '', Number(payload.rating) || 0,
      Number(payload.stock) || 0, payload.status || 'available', payload.coverTone || null, payload.coverUrl || null,
      payload.summary || null, payload.description || null, payload.isbn || null, payload.publisher || null,
      payload.year || null, payload.pages || null, payload.language || null, payload.authorBio || null,
      Number(payload.seatId || payload.seat_id) || null, payload.locationLabel || payload.location_label || null,
      flagValue(payload.isRecommended || payload.is_recommended) ? 1 : 0, flagValue(payload.isFeatured || payload.is_featured) ? 1 : 0,
      flagValue(payload.isNew || payload.is_new) ? 1 : 0, payload.shelfArea || payload.shelf_area || null,
      payload.shelfCode || payload.shelf_code || null, Math.max(0, Number(payload.lowStockThreshold ?? payload.low_stock_threshold ?? 3) || 3)],
  )
  return findBookById(result.insertId)
}
export async function updateBook(id, payload) {
  const current = await findBookById(id)
  if (!current) return null
  const next = { ...current, ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) }
  next.slug = current.slug || payload.slug || await uniqueBookSlug(next.title, id)
  assertBookStatus(next.status || 'available')
  await pool.execute(
    `UPDATE books SET slug=?, title=?, author=?, category=?, rating=?, stock=?, status=?, cover_tone=?, cover_url=?,
      summary=?, description=?, isbn=?, publisher=?, year=?, pages=?, language=?, author_bio=?, seat_id=?, location_label=?,
      is_recommended=?, is_featured=?, is_new=?, shelf_area=?, shelf_code=?, low_stock_threshold=? WHERE id=?`,
    [next.slug, next.title, next.author, next.category || '', Number(next.rating) || 0,
      Number(next.stock) || 0, next.status || 'available', next.coverTone || null, next.coverUrl || null,
      next.summary || null, next.description || null, next.isbn || null, next.publisher || null,
      next.year || null, next.pages || null, next.language || null, next.authorBio || null,
      Number(next.seatId || next.seat_id) || null, next.locationLabel || next.location_label || null,
      flagValue(next.isRecommended ?? next.is_recommended) ? 1 : 0, flagValue(next.isFeatured ?? next.is_featured) ? 1 : 0,
      flagValue(next.isNew ?? next.is_new) ? 1 : 0, next.shelfArea || next.shelf_area || null,
      next.shelfCode || next.shelf_code || null, Math.max(0, Number(next.lowStockThreshold ?? next.low_stock_threshold ?? 3) || 3), id],
  )
  return findBookById(id)
}
function mapReview(row) {
  return {
    id: row.id,
    bookId: row.bookId,
    parentId: row.parentId || null,
    rating: Number(row.rating || 5),
    content: String(row.content || ''),
    likeCount: Number(row.likeCount || 0),
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      nickname: row.nickname || row.username || `用户${String(row.userId || '').slice(-4)}`,
      avatar: row.avatar || '',
    },
  }
}
async function selectReviewById(id) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.book_id AS bookId, r.user_id AS userId, r.parent_id AS parentId, r.rating, r.content,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'book_review' AND cl.comment_id = r.id) AS likeCount
     FROM book_reviews r INNER JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] ? mapReview(rows[0]) : null
}
async function findBookReview(bookId, userId) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.book_id AS bookId, r.user_id AS userId, r.parent_id AS parentId, r.rating, r.content,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'book_review' AND cl.comment_id = r.id) AS likeCount
     FROM book_reviews r INNER JOIN users u ON u.id = r.user_id
     WHERE r.book_id = ? AND r.user_id = ? AND r.parent_id IS NULL AND r.status = 'published' LIMIT 1`,
    [bookId, userId],
  )
  return rows[0] ? mapReview(rows[0]) : null
}
export async function listBookReviews(bookId, query = {}) {
  const { page, pageSize, offset } = parsePagination(query, 10)
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM book_reviews WHERE book_id = ? AND status = 'published'", [bookId])
  const [rows] = await pool.execute(
    `SELECT r.id, r.book_id AS bookId, r.user_id AS userId, r.parent_id AS parentId, r.rating, r.content,
      r.created_at AS createdAt, u.nickname, u.username, u.avatar,
      (SELECT COUNT(*) FROM comment_likes cl WHERE cl.target_type = 'book_review' AND cl.comment_id = r.id) AS likeCount
     FROM book_reviews r INNER JOIN users u ON u.id = r.user_id
     WHERE r.book_id = ? AND r.status = 'published'
     ORDER BY COALESCE(r.parent_id, r.id) DESC, r.parent_id IS NOT NULL, r.updated_at DESC, r.id DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    [bookId],
  )
  return { items: rows.map(mapReview), meta: { page, pageSize, total: Number(total) } }
}
export async function createBookReview(bookId, userId, payload) {
  const rating = Math.min(5, Math.max(1, Number(payload.rating) || 5))
  const content = String(payload.content || '').trim()
  if (!content) throw Object.assign(new Error('请填写评价内容'), { statusCode: 400 })
  if (!await findBookById(bookId)) throw Object.assign(new Error('图书不存在'), { statusCode: 404 })
  const [[reservation]] = await pool.execute(
    `SELECT id FROM book_reservations WHERE book_id = ? AND user_id = ? AND status IN ('confirmed', 'completed') ORDER BY id DESC LIMIT 1`,
    [bookId, userId],
  )
  if (!reservation) throw Object.assign(new Error('预约或借阅后才能评价图书'), { statusCode: 403 })
  const [[existing]] = await pool.execute('SELECT id FROM book_reviews WHERE book_id = ? AND user_id = ? AND parent_id IS NULL LIMIT 1', [bookId, userId])
  if (existing) await pool.execute(`UPDATE book_reviews SET reservation_id=?, rating=?, content=?, status='published', updated_at=CURRENT_TIMESTAMP WHERE id=?`, [reservation.id, rating, content, existing.id])
  else await pool.execute(`INSERT INTO book_reviews (book_id, user_id, reservation_id, rating, content) VALUES (?, ?, ?, ?, ?)`, [bookId, userId, reservation.id, rating, content])
  return findBookReview(bookId, userId)
}
export async function replyBookReview(bookId, parentId, userId, payload) {
  const content = String(payload.content || '').trim()
  if (!content) throw Object.assign(new Error('请填写回复内容'), { statusCode: 400 })
  const [[parent]] = await pool.execute("SELECT id FROM book_reviews WHERE id = ? AND book_id = ? AND status = 'published' LIMIT 1", [parentId, bookId])
  if (!parent) throw Object.assign(new Error('评论不存在'), { statusCode: 404 })
  const [result] = await pool.execute(`INSERT INTO book_reviews (book_id, user_id, parent_id, rating, content, status) VALUES (?, ?, ?, 5, ?, 'published')`, [bookId, userId, parentId, content])
  return selectReviewById(result.insertId)
}
export async function likeBookReview(reviewId, userId) {
  await pool.execute(`INSERT IGNORE INTO comment_likes (target_type, comment_id, user_id) VALUES ('book_review', ?, ?)`, [reviewId, userId])
  const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM comment_likes WHERE target_type = 'book_review' AND comment_id = ?", [reviewId])
  return { liked: true, likeCount: Number(row.total) }
}
export async function unlikeBookReview(reviewId, userId) {
  await pool.execute("DELETE FROM comment_likes WHERE target_type = 'book_review' AND comment_id = ? AND user_id = ?", [reviewId, userId])
  const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM comment_likes WHERE target_type = 'book_review' AND comment_id = ?", [reviewId])
  return { liked: false, likeCount: Number(row.total) }
}
export async function createBookReservation(bookId, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[book]] = await connection.execute(
      `SELECT b.id, b.title, b.stock, b.status, b.seat_id AS seatId, b.location_label AS locationLabel,
        s.code AS seatCode, s.name AS seatName, s.area AS seatArea
       FROM books b LEFT JOIN seats s ON s.id = b.seat_id WHERE b.id = ? FOR UPDATE`,
      [bookId],
    )
    if (!book) throw Object.assign(new Error('图书不存在'), { statusCode: 404 })
    if (!['available', 'active'].includes(book.status) || Number(book.stock) < 1) throw Object.assign(new Error('当前图书暂不可预约'), { statusCode: 409 })
    const [[existing]] = await connection.execute(`SELECT id FROM book_reservations WHERE book_id = ? AND user_id = ? AND status IN ('confirmed', 'pending') LIMIT 1 FOR UPDATE`, [bookId, userId])
    if (existing) throw Object.assign(new Error('你已预约过这本书'), { statusCode: 409 })
    const reservationNo = `BR${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`
    const locationLabel = book.locationLabel || [book.seatArea, book.seatName || book.seatCode].filter(Boolean).join(' / ') || null
    const [result] = await connection.execute(`INSERT INTO book_reservations (reservation_no, user_id, book_id, seat_id, location_label, status) VALUES (?, ?, ?, ?, ?, 'confirmed')`, [reservationNo, userId, bookId, book.seatId || null, locationLabel])
    await connection.execute('UPDATE books SET stock = GREATEST(stock - 1, 0) WHERE id = ?', [bookId])
    await connection.commit()
    return findBookReservationById(result.insertId, userId)
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
}
async function findBookReservationById(id, userId = null) {
  const params = [id]
  const ownerClause = userId ? 'AND br.user_id = ?' : ''
  if (userId) params.push(userId)
  const [rows] = await pool.execute(
    `SELECT br.id, br.reservation_no AS reservationNo, br.user_id AS userId, br.book_id AS bookId,
      b.slug, b.title, br.seat_id AS seatId, s.code AS seatCode, s.name AS seatName,
      br.location_label AS locationLabel, br.status, br.reserved_at AS reservedAt, br.cancelled_at AS cancelledAt
     FROM book_reservations br INNER JOIN books b ON b.id = br.book_id LEFT JOIN seats s ON s.id = br.seat_id
     WHERE br.id = ? ${ownerClause} LIMIT 1`,
    params,
  )
  return rows[0] || null
}
export async function listMyBookReservations(userId) {
  const [rows] = await pool.execute(
    `SELECT br.id, br.reservation_no AS reservationNo, br.user_id AS userId, br.book_id AS bookId,
      b.slug, b.title, br.seat_id AS seatId, s.code AS seatCode, s.name AS seatName,
      br.location_label AS locationLabel, br.status, br.reserved_at AS reservedAt, br.cancelled_at AS cancelledAt
     FROM book_reservations br INNER JOIN books b ON b.id = br.book_id LEFT JOIN seats s ON s.id = br.seat_id
     WHERE br.user_id = ? ORDER BY br.reserved_at DESC, br.id DESC`,
    [userId],
  )
  return rows
}
export async function cancelBookReservation(id, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[reservation]] = await connection.execute(`SELECT id, book_id AS bookId FROM book_reservations WHERE id = ? AND user_id = ? AND status IN ('confirmed', 'pending') FOR UPDATE`, [id, userId])
    if (!reservation) { await connection.rollback(); return false }
    await connection.execute("UPDATE book_reservations SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [id])
    await connection.execute('UPDATE books SET stock = stock + 1 WHERE id = ?', [reservation.bookId])
    await connection.commit()
    return true
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
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


export async function getBookAdminStats() {
  const [[row]] = await pool.execute(`SELECT
    COUNT(*) AS total,
    SUM(status IN ('available','active')) AS visible,
    SUM(status = 'hidden') AS hidden,
    SUM(stock <= low_stock_threshold) AS lowStock,
    SUM(is_recommended = 1 OR is_featured = 1) AS recommended,
    SUM(COALESCE(favorite_count, 0)) AS favorites
    FROM books`)
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]))
}

export async function getBookStockLogs(bookId, limit = 20) {
  const [rows] = await pool.execute(
    `SELECT l.id, l.book_id AS bookId, l.change_type AS changeType, l.change_amount AS changeAmount,
      l.before_stock AS beforeStock, l.after_stock AS afterStock, l.reason, l.operator_id AS operatorId,
      a.username AS operatorName, l.created_at AS createdAt
     FROM book_stock_logs l LEFT JOIN admin_users a ON a.id = l.operator_id
     WHERE l.book_id = ? ORDER BY l.created_at DESC, l.id DESC LIMIT ${Math.min(100, Math.max(1, Number(limit) || 20))}`,
    [bookId],
  )
  return rows
}

export async function getBookAdminDetail(id) {
  const book = await findBookById(id)
  if (!book) return null
  return { ...book, stockLogs: await getBookStockLogs(id) }
}

export async function updateBookFlags(id, flags = {}, operatorId = null, connection = pool) {
  const allowed = { isRecommended: 'is_recommended', isFeatured: 'is_featured', isNew: 'is_new' }
  const fields = []
  const params = []
  for (const [key, column] of Object.entries(allowed)) {
    if (flags[key] !== undefined) {
      fields.push(`${column} = ?`)
      params.push(flagValue(flags[key]) ? 1 : 0)
    }
  }
  if (!fields.length) throw Object.assign(new Error('????????????'), { statusCode: 400 })
  params.push(id)
  const [result] = await connection.execute(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params)
  if (!result.affectedRows) return null
  await writeAudit(operatorId, 'book.flags.update', 'books', { id, flags, operatorType: 'admin' }, connection)
  return findBookById(id)
}

export async function adjustBookStock(id, payload = {}, operatorId = null) {
  const amount = Number(payload.amount ?? payload.changeAmount)
  const mode = String(payload.changeType || payload.type || 'adjust')
  const reason = String(payload.reason || '').trim()
  if (!Number.isInteger(amount)) throw Object.assign(new Error('?????????????'), { statusCode: 400 })
  if (!reason) throw Object.assign(new Error('????????????'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[book]] = await connection.execute('SELECT id, stock FROM books WHERE id = ? FOR UPDATE', [id])
    if (!book) { await connection.rollback(); return null }
    const beforeStock = Number(book.stock || 0)
    const afterStock = mode === 'in' ? beforeStock + Math.abs(amount) : mode === 'out' || mode === 'damaged' || mode === 'lost' ? beforeStock - Math.abs(amount) : amount
    if (!Number.isInteger(afterStock) || afterStock < 0) throw Object.assign(new Error('???????????'), { statusCode: 400 })
    const extraSet = mode === 'damaged' ? ', damaged_count = damaged_count + ?' : mode === 'lost' ? ', lost_count = lost_count + ?' : ''
    const params = extraSet ? [afterStock, Math.abs(amount), id] : [afterStock, id]
    await connection.execute(`UPDATE books SET stock = ?${extraSet} WHERE id = ?`, params)
    await connection.execute(
      `INSERT INTO book_stock_logs (book_id, change_type, change_amount, before_stock, after_stock, reason, operator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, mode, afterStock - beforeStock, beforeStock, afterStock, reason, operatorId],
    )
    await writeAudit(operatorId, 'book.stock.adjust', 'books', { id, changeType: mode, beforeStock, afterStock, reason, operatorType: 'admin' }, connection)
    await connection.commit()
    return getBookAdminDetail(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function batchUpdateBooks(ids = [], payload = {}, operatorId = null) {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter(Boolean))]
  if (!uniqueIds.length) throw Object.assign(new Error('?????'), { statusCode: 400 })
  const updated = []
  const errors = []
  for (const id of uniqueIds) {
    try {
      if (payload.status) updated.push(await updateBookStatus(id, payload.status))
      else updated.push(await updateBookFlags(id, payload, operatorId))
      await writeAudit(operatorId, 'book.batch.update', 'books', { id, payload, operatorType: 'admin' })
    } catch (error) {
      errors.push({ id, message: error.message })
    }
  }
  return { updated: updated.filter(Boolean), errors }
}
