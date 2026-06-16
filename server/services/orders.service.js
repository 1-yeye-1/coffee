import { randomBytes } from 'node:crypto'

import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { getCart } from './cart.service.js'
import { createNotification } from './notifications.service.js'

const paymentTtlMinutes = 15
const validStatuses = new Set(['pending_payment', 'pending_review', 'paid', 'completed', 'cancelled', 'payment_expired'])
const orderNo = () => `CB${Date.now()}${randomBytes(3).toString('hex').toUpperCase()}`
const paymentNo = () => `PAY${Date.now()}${randomBytes(3).toString('hex').toUpperCase()}`
const statusText = {
  pending_payment: '待支付',
  pending_review: '待审核',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  payment_expired: '支付已超时',
}

const orderColumns = `id, order_no AS orderNo, user_id AS userId, source,
 receiver_name AS receiverName, receiver_phone AS receiverPhone, delivery_type AS deliveryType,
 pickup_store AS pickupStore, address_region AS addressRegion, address_detail AS addressDetail,
 payment_method AS paymentMethod, coupon_code AS couponCode, points_used AS pointsUsed,
 subtotal_amount AS subtotalAmount, discount_amount AS discountAmount, points_amount AS pointsAmount,
 shipping_fee AS shippingFee, total_amount AS totalAmount, status, note,
 created_at AS createdAt, updated_at AS updatedAt, paid_at AS paidAt,
 completed_at AS completedAt, cancelled_at AS cancelledAt`

function normalizeOrder(row) {
  if (!row) return null
  return {
    id: String(row.id),
    orderNo: row.orderNo,
    userId: Number(row.userId),
    source: row.source || 'cart',
    receiverName: row.receiverName,
    receiverPhone: row.receiverPhone,
    deliveryType: row.deliveryType,
    pickupStore: row.pickupStore,
    address: row.deliveryType === 'delivery'
      ? { recipient: row.receiverName, phone: row.receiverPhone, region: row.addressRegion, detail: row.addressDetail }
      : null,
    paymentMethod: row.paymentMethod,
    coupon: row.couponCode,
    pointsUsed: Number(row.pointsUsed),
    status: row.status,
    orderNote: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    timeline: {
      submittedAt: row.createdAt,
      paidAt: row.paidAt,
      processingAt: row.paidAt,
      completedAt: row.completedAt,
      cancelledAt: row.cancelledAt,
    },
    amounts: {
      subtotal: Number(row.subtotalAmount),
      discount: Number(row.discountAmount),
      pointsDeduction: Number(row.pointsAmount),
      shippingFee: Number(row.shippingFee),
      total: Number(row.totalAmount),
    },
  }
}

async function loadOrderItems(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT oi.id, oi.product_id AS productId, oi.product_name AS name, oi.product_category AS category,
      oi.brew_method AS brewMethod, oi.product_image_tone AS tone, oi.price, oi.quantity,
      oi.subtotal AS lineTotal, oi.created_at AS createdAt,
      p.slug, p.stock, p.status, p.flavor, p.origin
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.id`,
    [orderId],
  )
  return rows.map((item) => ({
    ...item,
    id: Number(item.id),
    productId: item.productId ? Number(item.productId) : null,
    price: Number(item.price),
    quantity: Number(item.quantity),
    lineTotal: Number(item.lineTotal),
    stock: Number(item.stock || 0),
    flavor: typeof item.flavor === 'string' ? JSON.parse(item.flavor) : (item.flavor || []),
  }))
}

async function loadPayments(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, payment_no AS paymentNo, amount, method, status,
      paid_at AS paidAt, expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt
     FROM payments WHERE order_id = ? ORDER BY id DESC`,
    [orderId],
  )
  return rows.map((item) => ({ ...item, amount: Number(item.amount) }))
}

async function createPayment(orderId, userId, amount, method, connection) {
  await connection.execute(
    `INSERT INTO payments (payment_no, order_id, user_id, amount, method, status, expires_at)
     VALUES (?, ?, ?, ?, ?, 'created', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${paymentTtlMinutes} MINUTE))`,
    [paymentNo(), orderId, userId, amount, method],
  )
}

function calculateAmounts(payload, subtotal) {
  const couponCode = payload.coupon || 'none'
  const discount = couponCode === 'new-10' && subtotal >= 99
    ? 10
    : couponCode === 'member-90'
      ? Math.round(subtotal * 0.1 * 100) / 100
      : subtotal >= 99 ? 10 : 0
  const pointsUsed = Math.max(0, Number(payload.pointsUsed) || 0)
  const pointsAmount = Math.min(Math.floor(pointsUsed / 100), 20, Math.max(0, subtotal - discount))
  const shippingFee = payload.deliveryType === 'delivery' && subtotal < 199 ? 8 : 0
  const total = Math.max(0, Math.round((subtotal - discount - pointsAmount + shippingFee) * 100) / 100)
  return { couponCode, discount, pointsUsed, pointsAmount, shippingFee, total }
}

async function insertOrder(userId, payload, snapshots, source, connection) {
  const subtotal = Math.round(snapshots.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100
  const amounts = calculateAmounts(payload, subtotal)
  const address = payload.addressForm || {}
  const [result] = await connection.execute(
    `INSERT INTO orders (order_no, user_id, source, receiver_name, receiver_phone, delivery_type, pickup_store,
     address_region, address_detail, payment_method, coupon_code, points_used, subtotal_amount,
     discount_amount, points_amount, shipping_fee, total_amount, status, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?)`,
    [
      orderNo(),
      userId,
      source,
      address.recipient || null,
      address.phone || null,
      payload.deliveryType || 'pickup',
      payload.pickupStore || null,
      address.region || null,
      address.detail || null,
      payload.paymentMethod || 'wechat',
      amounts.couponCode,
      amounts.pointsUsed,
      subtotal,
      amounts.discount,
      amounts.pointsAmount,
      amounts.shippingFee,
      amounts.total,
      payload.orderNote || null,
    ],
  )

  for (const item of snapshots) {
    await connection.execute(
      `INSERT INTO order_items (order_id, product_id, product_name, product_category, brew_method, product_image_tone, price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [result.insertId, item.id, item.name, item.category, item.brewMethod || null, item.tone, item.price, item.quantity, item.lineTotal],
    )
    await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id])
  }
  await createPayment(result.insertId, userId, amounts.total, payload.paymentMethod || 'wechat', connection)
  await createNotification({
    userId,
    title: '订单创建成功',
    content: `你的订单 ${source === 'buy_now' ? '已直接购买' : '已提交'}，请留意支付和处理状态。`,
    type: 'order',
    relatedId: result.insertId,
    relatedType: 'order',
  }, connection)
  return result.insertId
}

async function notifyOrderStatus(userId, orderId, status, connection) {
  await createNotification({
    userId,
    title: '订单状态已更新',
    content: `你的订单状态已更新为：${statusText[status] || status}。`,
    type: 'order',
    relatedId: orderId,
    relatedType: 'order',
  }, connection)
}

async function buildCartSnapshots(userId, connection) {
  const cart = await getCart(userId, connection)
  const selectedItems = cart.items.filter((item) => item.selected)
  if (!selectedItems.length) throw Object.assign(new Error('购物车没有选中的商品'), { statusCode: 400 })

  const snapshots = []
  for (const item of selectedItems) {
    const [rows] = await connection.execute(
      'SELECT id, name, category, price, stock, tone FROM products WHERE id = ? FOR UPDATE',
      [item.productId],
    )
    const product = rows[0]
    if (!product) throw Object.assign(new Error('商品不存在'), { statusCode: 404 })
    if (Number(product.stock) < Number(item.quantity)) throw Object.assign(new Error(`${product.name} 库存不足`), { statusCode: 400 })
    const price = Number(product.price)
    const quantity = Number(item.quantity)
    snapshots.push({ ...product, brewMethod: item.brewMethod || null, price, quantity, lineTotal: price * quantity })
  }
  return { snapshots, cartItemIds: selectedItems.map((item) => item.id) }
}

async function buildBuyNowSnapshots(payload, connection) {
  const productId = Number(payload.productId)
  const quantity = Math.max(1, Number(payload.quantity) || 1)
  const [rows] = await connection.execute(
    "SELECT id, name, category, product_type AS productType, supports_brew_method AS supportsBrewMethod, price, stock, tone FROM products WHERE id = ? AND status <> 'inactive' FOR UPDATE",
    [productId],
  )
  const product = rows[0]
  if (!product) throw Object.assign(new Error('商品不存在或已下架'), { statusCode: 404 })
  if (Number(product.stock) < quantity) throw Object.assign(new Error(`${product.name} 库存不足`), { statusCode: 400 })
  const price = Number(product.price)
  const brewMethod = product.productType === 'coffee' && Number(product.supportsBrewMethod)
    ? (payload.brewMethod === 'self_grind' ? 'self_grind' : 'barista')
    : null
  return [{ ...product, brewMethod, price, quantity, lineTotal: price * quantity }]
}

export async function createOrder(userId, payload) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const { snapshots, cartItemIds } = await buildCartSnapshots(userId, connection)
    const orderId = await insertOrder(userId, payload, snapshots, 'cart', connection)
    if (cartItemIds.length) await connection.query('DELETE FROM cart_items WHERE id IN (?)', [cartItemIds])
    await writeAudit(userId, 'order.create', 'orders', { id: orderId, source: 'cart' }, connection)
    await connection.commit()
    return getOrderDetail(orderId, userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function createBuyNowOrder(userId, payload) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const snapshots = await buildBuyNowSnapshots(payload, connection)
    const orderId = await insertOrder(userId, payload, snapshots, 'buy_now', connection)
    await writeAudit(userId, 'order.create', 'orders', { id: orderId, source: 'buy_now' }, connection)
    await connection.commit()
    return getOrderDetail(orderId, userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function restoreStock(orderId, connection) {
  const items = await loadOrderItems(orderId, connection)
  for (const item of items) {
    if (item.productId) await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.productId])
  }
}

async function increaseSales(orderId, connection) {
  const items = await loadOrderItems(orderId, connection)
  for (const item of items) {
    if (item.productId) await connection.execute('UPDATE products SET sales = sales + ? WHERE id = ?', [item.quantity, item.productId])
  }
}

async function expireOrderIfNeeded(order, connection) {
  if (!order || order.status !== 'pending_payment') return order
  const payments = await loadPayments(order.id, connection)
  const payment = payments[0]
  if (!payment?.expiresAt || new Date(payment.expiresAt).getTime() > Date.now()) return order
  await restoreStock(order.id, connection)
  await connection.execute("UPDATE orders SET status = 'payment_expired', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id])
  await connection.execute("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'created'", [order.id])
  return { ...order, status: 'payment_expired' }
}

export async function getOrderDetail(id, userId = null, isAdmin = false, connection = pool) {
  const params = [id]
  let where = 'id = ?'
  if (!isAdmin) {
    where += ' AND user_id = ?'
    params.push(userId)
  }
  const [rows] = await connection.execute(`SELECT ${orderColumns} FROM orders WHERE ${where} LIMIT 1`, params)
  let order = normalizeOrder(rows[0])
  if (!order) return null
  order = await expireOrderIfNeeded(order, connection)
  order.items = await loadOrderItems(id, connection)
  order.payments = await loadPayments(id, connection)
  order.paymentStatus = order.payments[0]?.status || null
  order.paymentExpiresAt = order.payments[0]?.expiresAt || null
  return order
}

export async function listOrders(userId, query = {}, isAdmin = false) {
  const { page, pageSize, offset } = parsePagination(query, 10)
  const clauses = []
  const params = []
  if (!isAdmin) {
    clauses.push('user_id = ?')
    params.push(userId)
  }
  if (query.status && query.status !== 'all') {
    clauses.push('status = ?')
    params.push(query.status)
  }
  if (isAdmin && query.keyword) {
    clauses.push('(order_no LIKE ? OR receiver_phone LIKE ?)')
    const pattern = `%${String(query.keyword).trim()}%`
    params.push(pattern, pattern)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [counts] = await pool.execute(`SELECT COUNT(*) AS total FROM orders ${where}`, params)
  const [rows] = await pool.query(`SELECT ${orderColumns} FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset])
  const items = []
  for (const row of rows) items.push(await getOrderDetail(row.id, userId, isAdmin))
  return { items: items.filter(Boolean), meta: { page, pageSize, total: Number(counts[0].total) } }
}

export async function payOrder(id, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE', [id, userId])
    const order = rows[0]
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 })
    if (order.status !== 'pending_payment') throw Object.assign(new Error('当前订单状态不允许支付'), { statusCode: 400 })

    const [payments] = await connection.execute(
      `SELECT id, expires_at AS expiresAt FROM payments
       WHERE order_id = ? AND status = 'created' ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [id],
    )
    const payment = payments[0]
    if (!payment || new Date(payment.expiresAt).getTime() <= Date.now()) {
      await restoreStock(id, connection)
      await connection.execute("UPDATE orders SET status = 'payment_expired', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [id])
      await connection.execute("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'created'", [id])
      throw Object.assign(new Error('支付已超时，请重新下单'), { statusCode: 400 })
    }

    await connection.execute("UPDATE orders SET status = 'pending_review' WHERE id = ?", [id])
    await connection.execute("UPDATE payments SET status = 'reviewing', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id])
    await writeAudit(userId, 'order.pay.submit', 'orders', { id }, connection)
    await notifyOrderStatus(userId, id, 'pending_review', connection)
    await connection.commit()
    return getOrderDetail(id, userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function confirmOrderPayment(id, operatorId) {
  return reviewPayment(id, operatorId, 'confirmed')
}

export async function rejectOrderPayment(id, operatorId) {
  return reviewPayment(id, operatorId, 'rejected')
}

async function reviewPayment(id, operatorId, decision) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id])
    const order = rows[0]
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 })
    if (order.status !== 'pending_review') throw Object.assign(new Error('当前订单不是待审核状态'), { statusCode: 400 })

    if (decision === 'confirmed') {
      await connection.execute("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [id])
      await connection.execute("UPDATE payments SET status = 'confirmed' WHERE order_id = ? AND status = 'reviewing'", [id])
      await increaseSales(id, connection)
    } else {
      await restoreStock(id, connection)
      await connection.execute("UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [id])
      await connection.execute("UPDATE payments SET status = 'rejected' WHERE order_id = ? AND status = 'reviewing'", [id])
    }
    await writeAudit(operatorId, `order.payment.${decision}`, 'orders', { id }, connection)
    await notifyOrderStatus(order.user_id, id, decision === 'confirmed' ? 'paid' : 'cancelled', connection)
    await connection.commit()
    return getOrderDetail(id, null, true)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function expireOrderPayment(id, operatorId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id])
    const order = rows[0]
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 })
    if (order.status !== 'pending_payment') throw Object.assign(new Error('只有待支付订单可以标记过期'), { statusCode: 400 })
    await restoreStock(id, connection)
    await connection.execute("UPDATE orders SET status = 'payment_expired', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [id])
    await connection.execute("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'created'", [id])
    await writeAudit(operatorId, 'order.payment.expire', 'orders', { id }, connection)
    await notifyOrderStatus(order.user_id, id, 'payment_expired', connection)
    await connection.commit()
    return getOrderDetail(id, null, true)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function changeOrderStatus(id, target, userId, isAdmin = false, operatorId = null) {
  if (!validStatuses.has(target)) throw Object.assign(new Error('无效订单状态'), { statusCode: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const params = [id]
    let where = 'id = ?'
    if (!isAdmin) {
      where += ' AND user_id = ?'
      params.push(userId)
    }
    const [rows] = await connection.execute(`SELECT * FROM orders WHERE ${where} FOR UPDATE`, params)
    const order = rows[0]
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 })

    const allowed = isAdmin
      ? ['paid', 'completed', 'cancelled'].includes(target)
      : (target === 'cancelled' && order.status === 'pending_payment')
        || (target === 'completed' && order.status === 'paid')
    if (!allowed) throw Object.assign(new Error('当前订单状态不允许此操作'), { statusCode: 400 })

    if (target === 'cancelled' && ['pending_payment', 'pending_review'].includes(order.status)) await restoreStock(id, connection)
    const timeColumn = target === 'paid' ? 'paid_at' : target === 'completed' ? 'completed_at' : target === 'cancelled' ? 'cancelled_at' : null
    await connection.execute(`UPDATE orders SET status = ?${timeColumn ? `, ${timeColumn} = CURRENT_TIMESTAMP` : ''} WHERE id = ?`, [target, id])
    if (isAdmin) await writeAudit(operatorId, 'order.status.update', 'orders', { id, from: order.status, to: target }, connection)
    await notifyOrderStatus(order.user_id, id, target, connection)
    await connection.commit()
    return getOrderDetail(id, userId, isAdmin)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
