import { pool } from '../db/mysql.js'
import { maskPhone } from './account.service.js'

export async function searchAdmin(keyword) {
  const value = String(keyword || '').trim().slice(0, 80)
  if (!value) throw Object.assign(new Error('请输入关键词'), { statusCode: 400 })
  const like = `%${value}%`
  const [products, orders, users, posts, books, events, bookings] = await Promise.all([
    pool.execute('SELECT id, name AS title, category AS meta FROM products WHERE name LIKE ? OR category LIKE ? LIMIT 5', [like, like]),
    pool.execute('SELECT id, order_no AS title, receiver_name AS meta FROM orders WHERE order_no LIKE ? OR receiver_name LIKE ? OR receiver_phone LIKE ? LIMIT 5', [like, like, like]),
    pool.execute("SELECT id, COALESCE(nickname, username) AS title, phone FROM users WHERE role = 'user' AND (nickname LIKE ? OR username LIKE ? OR phone LIKE ?) LIMIT 5", [like, like, like]),
    pool.execute('SELECT id, title, author AS meta FROM posts WHERE title LIKE ? OR author LIKE ? OR content LIKE ? LIMIT 5', [like, like, like]),
    pool.execute('SELECT id, title, author AS meta FROM books WHERE title LIKE ? OR author LIKE ? LIMIT 5', [like, like]),
    pool.execute('SELECT id, title, location AS meta FROM events WHERE title LIKE ? OR location LIKE ? LIMIT 5', [like, like]),
    pool.execute(`SELECT b.id, b.booking_no AS title,
      CONCAT(DATE_FORMAT(b.booking_date, '%Y-%m-%d'), ' ', b.booking_time) AS meta, b.phone
      FROM bookings b WHERE b.booking_no LIKE ? OR b.contact_name LIKE ? OR b.phone LIKE ? LIMIT 5`, [like, like, like]),
  ])
  const addPath = (rows, path) => rows[0].map((item) => ({ ...item, path }))
  return {
    products: addPath(products, '/products'),
    orders: addPath(orders, '/orders'),
    users: users[0].map(({ phone, ...item }) => ({ ...item, meta: maskPhone(phone), path: '/users' })),
    posts: addPath(posts, '/community'),
    books: addPath(books, '/books'),
    events: addPath(events, '/events'),
    bookings: bookings[0].map(({ phone, ...item }) => ({ ...item, meta: `${item.meta} · ${maskPhone(phone)}`, path: '/bookings' })),
  }
}
