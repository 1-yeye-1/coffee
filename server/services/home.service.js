import { pool } from '../db/mysql.js'
import { getCommunityStats, postCommentCountSql, postLikeCountSql } from './stats.service.js'

function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function pageMeta(total, pageSize) {
  return { page: 1, pageSize, total: Number(total || 0) }
}

async function listHomeBooks() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, author, category, rating, stock, status,
      cover_tone AS coverTone, cover_url AS coverUrl, summary, description, updated_at AS updatedAt
     FROM books
     WHERE status IN ('available', 'active')
     ORDER BY id ASC
     LIMIT 4`,
  )
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM books WHERE status IN ('available', 'active')")
  return { items: rows, meta: pageMeta(total, 4) }
}

async function listHomeLiteBooks() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, author, category, rating, stock, status,
      cover_tone AS coverTone, cover_url AS coverUrl, summary, description, updated_at AS updatedAt
     FROM books
     WHERE status IN ('available', 'active')
     ORDER BY id ASC
     LIMIT 3`,
  )
  return { items: rows, meta: pageMeta(rows.length, 3) }
}

async function listHomeProducts() {
  const [rows] = await pool.execute(
    `SELECT id, slug, name, category, image_url AS imageUrl, price, stock, status,
      flavor, tone, origin, description, updated_at AS updatedAt
     FROM products
     WHERE status = 'active'
     ORDER BY id ASC
     LIMIT 4`,
  )
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM products WHERE status = 'active'")
  return {
    items: rows.map((item) => ({
      ...item,
      price: Number(item.price),
      flavor: parseJsonArray(item.flavor),
    })),
    meta: pageMeta(total, 4),
  }
}

async function listHomeLiteProducts() {
  const [rows] = await pool.execute(
    `SELECT id, slug, name, category, image_url AS imageUrl, price, stock, status,
      flavor, tone, origin, description, updated_at AS updatedAt
     FROM products
     WHERE status = 'active'
     ORDER BY id ASC
     LIMIT 3`,
  )
  return {
    items: rows.map((item) => ({
      ...item,
      price: Number(item.price),
      flavor: parseJsonArray(item.flavor),
    })),
    meta: pageMeta(rows.length, 3),
  }
}

async function listHomeEvents() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, category, DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
      event_time AS time, location, capacity, attendees, status, tone, summary, cover_url AS coverUrl
     FROM events
     WHERE status IN ('published', 'ongoing', 'open', 'active')
     ORDER BY CASE
       WHEN event_date >= CURRENT_DATE AND attendees < capacity THEN 0
       ELSE 1 END ASC,
       CASE WHEN event_date >= CURRENT_DATE THEN event_date END ASC,
       event_date DESC, id ASC
     LIMIT 3`,
  )
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM events WHERE status IN ('published', 'ongoing', 'open', 'active')")
  return { items: rows, meta: pageMeta(total, 3) }
}

async function listHomeLiteEvents() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, category, DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
      event_time AS time, location, capacity, attendees, status, tone, summary, cover_url AS coverUrl
     FROM events
     WHERE status IN ('published', 'ongoing', 'open', 'active')
     ORDER BY CASE
       WHEN event_date >= CURRENT_DATE AND attendees < capacity THEN 0
       ELSE 1 END ASC,
       CASE WHEN event_date >= CURRENT_DATE THEN event_date END ASC,
       event_date DESC, id ASC
     LIMIT 3`,
  )
  return { items: rows, meta: pageMeta(rows.length, 3) }
}

async function listHomePosts() {
  const [rows] = await pool.execute(
    `SELECT p.id, p.slug, p.user_id AS userId, p.title, p.author, COALESCE(u.avatar, p.avatar) AS avatar, p.topic, p.excerpt,
      p.status AS reviewStatus, p.featured,
      ${postLikeCountSql('p')} AS likes,
      ${postCommentCountSql('p')} AS commentsCount,
      p.created_at AS createdAt, p.updated_at AS updatedAt
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.status = 'published'
     ORDER BY likes DESC, p.created_at DESC
     LIMIT 3`,
  )
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'published'")
  return {
    items: rows.map((post) => ({
      ...post,
      status: post.reviewStatus,
      featured: Boolean(post.featured),
      likes: Number(post.likes || 0),
      commentsCount: Number(post.commentsCount || 0),
    })),
    meta: pageMeta(total, 3),
  }
}

export async function getHomeSnapshot() {
  const [books, products, events, posts, communityStats] = await Promise.all([
    listHomeBooks(),
    listHomeProducts(),
    listHomeEvents(),
    listHomePosts(),
    getCommunityStats(),
  ])
  return { books, products, events, posts, communityStats }
}

export async function getHomeLiteSnapshot() {
  const [books, products, events] = await Promise.all([
    listHomeLiteBooks(),
    listHomeLiteProducts(),
    listHomeLiteEvents(),
  ])
  return {
    hero: null,
    books,
    products,
    events,
    posts: { items: [], meta: pageMeta(0, 0) },
    communityStats: { members: 0, monthlyShares: 0, posts: 0, comments: 0 },
  }
}
