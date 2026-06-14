import { randomBytes } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { getCart } from './cart.service.js'
import { writeAudit } from './admin.service.js'

const validStatuses = new Set(['pending_payment', 'paid', 'completed', 'cancelled'])
const orderNo = () => `CB${Date.now()}${randomBytes(3).toString('hex').toUpperCase()}`
const paymentNo = () => `PAY${Date.now()}${randomBytes(3).toString('hex').toUpperCase()}`

function normalizeOrder(row) {
  if (!row) return null
  return {
    id: String(row.id), orderNo: row.orderNo, userId: Number(row.userId),
    receiverName: row.receiverName, receiverPhone: row.receiverPhone,
    deliveryType: row.deliveryType, pickupStore: row.pickupStore,
    address: row.deliveryType === 'delivery' ? { recipient: row.receiverName, phone: row.receiverPhone, region: row.addressRegion, detail: row.addressDetail } : null,
    paymentMethod: row.paymentMethod, coupon: row.couponCode, pointsUsed: Number(row.pointsUsed),
    status: row.status, orderNote: row.note, createdAt: row.createdAt, updatedAt: row.updatedAt,
    timeline: { submittedAt: row.createdAt, paidAt: row.paidAt, processingAt: row.paidAt, completedAt: row.completedAt, cancelledAt: row.cancelledAt },
    amounts: { subtotal: Number(row.subtotalAmount), discount: Number(row.discountAmount), pointsDeduction: Number(row.pointsAmount), shippingFee: Number(row.shippingFee), total: Number(row.totalAmount) },
  }
}

const orderColumns = `id, order_no AS orderNo, user_id AS userId, receiver_name AS receiverName,
 receiver_phone AS receiverPhone, delivery_type AS deliveryType, pickup_store AS pickupStore,
 address_region AS addressRegion, address_detail AS addressDetail, payment_method AS paymentMethod,
 coupon_code AS couponCode, points_used AS pointsUsed, subtotal_amount AS subtotalAmount,
 discount_amount AS discountAmount, points_amount AS pointsAmount, shipping_fee AS shippingFee,
 total_amount AS totalAmount, status, note, created_at AS createdAt, updated_at AS updatedAt,
 paid_at AS paidAt, completed_at AS completedAt, cancelled_at AS cancelledAt`

async function loadOrderItems(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT oi.id, oi.product_id AS productId, oi.product_name AS name, oi.product_category AS category,
      oi.product_image_tone AS tone, oi.price, oi.quantity, oi.subtotal AS lineTotal, oi.created_at AS createdAt,
      p.slug, p.stock, p.status, p.flavor, p.origin
     FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? ORDER BY oi.id`, [orderId],
  )
  return rows.map((item) => ({ ...item, id: Number(item.id), productId: item.productId ? Number(item.productId) : null,
    price: Number(item.price), quantity: Number(item.quantity), lineTotal: Number(item.lineTotal),
    stock: Number(item.stock || 0), flavor: typeof item.flavor === 'string' ? JSON.parse(item.flavor) : (item.flavor || []) }))
}

async function loadPayments(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, payment_no AS paymentNo, amount, method, status, paid_at AS paidAt, created_at AS createdAt
     FROM payments WHERE order_id=? ORDER BY id DESC`, [orderId],
  )
  return rows.map((item) => ({ ...item, amount: Number(item.amount) }))
}

export async function getOrderDetail(id, userId = null, isAdmin = false, connection = pool) {
  const params = [id]
  let where = 'id=?'
  if (!isAdmin) { where += ' AND user_id=?'; params.push(userId) }
  const [rows] = await connection.execute(`SELECT ${orderColumns} FROM orders WHERE ${where} LIMIT 1`, params)
  const order = normalizeOrder(rows[0])
  if (!order) return null
  order.items = await loadOrderItems(id, connection)
  order.payments = await loadPayments(id, connection)
  return order
}

export async function createOrder(userId, payload) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const cart = await getCart(userId, connection)
    const selectedItems = cart.items.filter((item) => item.selected)
    if (!selectedItems.length) throw Object.assign(new Error('购物车没有选中的商品'), { statusCode: 400 })

    let subtotal = 0
    const snapshots = []
    for (const item of selectedItems) {
      const [rows] = await connection.execute('SELECT id, name, category, price, stock, tone FROM products WHERE id=? FOR UPDATE', [item.productId])
      const product = rows[0]
      if (!product) throw Object.assign(new Error('商品不存在'), { statusCode: 404 })
      if (product.stock < item.quantity) throw Object.assign(new Error(`${product.name} 库存不足`), { statusCode: 400 })
      const price = Number(product.price)
      const lineTotal = price * item.quantity
      subtotal += lineTotal
      snapshots.push({ ...product, price, quantity: item.quantity, lineTotal })
    }

    const couponCode = payload.coupon || 'none'
    const discount = couponCode === 'new-10' && subtotal >= 99 ? 10 : couponCode === 'member-90' ? Math.round(subtotal * 0.1 * 100) / 100 : subtotal >= 99 ? 10 : 0
    const pointsUsed = Math.max(0, Number(payload.pointsUsed) || 0)
    const pointsAmount = Math.min(Math.floor(pointsUsed / 100), 20, Math.max(0, subtotal - discount))
    const shippingFee = payload.deliveryType === 'delivery' && subtotal < 199 ? 8 : 0
    const total = Math.max(0, Math.round((subtotal - discount - pointsAmount + shippingFee) * 100) / 100)
    const address = payload.addressForm || {}
    const [result] = await connection.execute(
      `INSERT INTO orders (order_no,user_id,receiver_name,receiver_phone,delivery_type,pickup_store,
       address_region,address_detail,payment_method,coupon_code,points_used,subtotal_amount,
       discount_amount,points_amount,shipping_fee,total_amount,status,note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNo(), userId, address.recipient || null, address.phone || null, payload.deliveryType || 'pickup',
        payload.pickupStore || null, address.region || null, address.detail || null, payload.paymentMethod || 'wechat',
        couponCode, pointsUsed, subtotal, discount, pointsAmount, shippingFee, total, 'pending_payment', payload.orderNote || null],
    )
    for (const item of snapshots) {
      await connection.execute(
        `INSERT INTO order_items (order_id,product_id,product_name,product_category,product_image_tone,price,quantity,subtotal)
         VALUES (?,?,?,?,?,?,?,?)`,
        [result.insertId, item.id, item.name, item.category, item.tone, item.price, item.quantity, item.lineTotal],
      )
      await connection.execute('UPDATE products SET stock=stock-?, sales=sales+? WHERE id=?', [item.quantity, item.quantity, item.id])
    }
    const cartIds = selectedItems.map((item) => item.id)
    await connection.query('DELETE FROM cart_items WHERE id IN (?)', [cartIds])
    await connection.commit()
    return getOrderDetail(result.insertId, userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally { connection.release() }
}

export async function listOrders(userId, query = {}, isAdmin = false) {
  const { page, pageSize, offset } = parsePagination(query, 10)
  const clauses = []
  const params = []
  if (!isAdmin) { clauses.push('user_id=?'); params.push(userId) }
  if (query.status && query.status !== 'all') { clauses.push('status=?'); params.push(query.status) }
  if (isAdmin && query.keyword) {
    clauses.push('(order_no LIKE ? OR receiver_phone LIKE ?)')
    const pattern = `%${String(query.keyword).trim()}%`; params.push(pattern, pattern)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [counts] = await pool.execute(`SELECT COUNT(*) AS total FROM orders ${where}`, params)
  const [rows] = await pool.query(`SELECT ${orderColumns} FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset])
  const items = []
  for (const row of rows) {
    const order = normalizeOrder(row)
    order.items = await loadOrderItems(row.id)
    items.push(order)
  }
  return { items, meta: { page, pageSize, total: Number(counts[0].total) } }
}

async function restoreStock(orderId, connection) {
  const items = await loadOrderItems(orderId, connection)
  for (const item of items) {
    if (item.productId) await connection.execute('UPDATE products SET stock=stock+?, sales=GREATEST(0,sales-?) WHERE id=?', [item.quantity, item.quantity, item.productId])
  }
}

export async function changeOrderStatus(id, target, userId, isAdmin = false, operatorId = null) {
  if (!validStatuses.has(target)) throw Object.assign(new Error('无效订单状态'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const params = [id]
    let where = 'id=?'
    if (!isAdmin) { where += ' AND user_id=?'; params.push(userId) }
    const [rows] = await connection.execute(`SELECT * FROM orders WHERE ${where} FOR UPDATE`, params)
    const order = rows[0]
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 })
    const allowed = isAdmin || (target === 'paid' && order.status === 'pending_payment') || (target === 'cancelled' && ['pending_payment','paid'].includes(order.status)) || (target === 'completed' && order.status === 'paid')
    if (!allowed) throw Object.assign(new Error('当前订单状态不允许此操作'), { statusCode: 400 })
    if (target === 'cancelled' && order.status !== 'cancelled') await restoreStock(id, connection)
    const timeColumn = target === 'paid' ? 'paid_at' : target === 'completed' ? 'completed_at' : target === 'cancelled' ? 'cancelled_at' : null
    await connection.execute(`UPDATE orders SET status=?${timeColumn ? `, ${timeColumn}=CURRENT_TIMESTAMP` : ''} WHERE id=?`, [target, id])
    if (target === 'paid' && order.status !== 'paid') {
      await connection.execute('INSERT INTO payments (payment_no,order_id,user_id,amount,method,status,paid_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)',
        [paymentNo(), id, order.user_id, order.total_amount, order.payment_method, 'paid'])
    }
    if (isAdmin) await writeAudit(operatorId, 'order.status.update', 'orders', { id, from: order.status, to: target }, connection)
    await connection.commit()
    return getOrderDetail(id, userId, isAdmin)
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
}
