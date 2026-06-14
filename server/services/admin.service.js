import { pool } from '../db/mysql.js'
import { listBooks } from './books.service.js'
import { listProducts } from './products.service.js'

export async function getDashboardStats() {
  const [[users], [books], [products], [orders], [revenue], [pendingPosts]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM users'),
    pool.execute('SELECT COUNT(*) AS total FROM books'),
    pool.execute('SELECT COUNT(*) AS total FROM products'),
    pool.execute('SELECT COUNT(*) AS total FROM orders'),
    pool.execute(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders
      WHERE status IN ('paid','completed') AND DATE(paid_at) = CURRENT_DATE`),
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'"),
  ])

  return {
    users: Number(users[0].total),
    books: Number(books[0].total),
    products: Number(products[0].total),
    orders: Number(orders[0].total),
    todayRevenue: Number(revenue[0].total),
    pendingPosts: Number(pendingPosts[0].total),
  }
}

export const listAdminBooks = listBooks
export const listAdminProducts = listProducts

export async function writeAudit(operatorId, action, module, payload = null, connection = pool) {
  await connection.execute(
    'INSERT INTO audit_logs (operator_id, action, module, payload) VALUES (?, ?, ?, ?)',
    [operatorId || null, action, module, payload ? JSON.stringify(payload) : null],
  )
}
