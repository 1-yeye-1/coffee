import { pool } from '../db/mysql.js'

export async function searchAll(keyword) {
  const value = String(keyword || '').trim()
  if (!value) throw Object.assign(new Error('请输入关键词'), { statusCode: 400 })
  const pattern = `%${value.slice(0, 80)}%`
  const [products, books, events, posts] = await Promise.all([
    pool.execute(
      `SELECT id, slug, name AS title, description AS summary, image_url AS imageUrl
       FROM products WHERE status = 'active' AND (name LIKE ? OR description LIKE ?) LIMIT 5`,
      [pattern, pattern],
    ),
    pool.execute(
      `SELECT id, slug, title, CONCAT(author, ' · ', COALESCE(summary, '')) AS summary, cover_url AS imageUrl
       FROM books WHERE status IN ('available', 'active') AND (title LIKE ? OR author LIKE ? OR summary LIKE ?) LIMIT 5`,
      [pattern, pattern, pattern],
    ),
    pool.execute(
      `SELECT id, slug, title, CONCAT(location, ' · ', COALESCE(summary, '')) AS summary, cover_url AS imageUrl
       FROM events WHERE status IN ('published', 'ongoing', 'open', 'active') AND (title LIKE ? OR location LIKE ? OR summary LIKE ?) LIMIT 5`,
      [pattern, pattern, pattern],
    ),
    pool.execute(
      `SELECT id, slug, title, excerpt AS summary, media_url AS imageUrl
       FROM posts WHERE status = 'published' AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?) LIMIT 5`,
      [pattern, pattern, pattern],
    ),
  ])
  return {
    products: products[0],
    books: books[0],
    events: events[0],
    posts: posts[0],
  }
}
