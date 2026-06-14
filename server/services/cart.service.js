import { pool } from '../db/mysql.js'

async function getOrCreateCart(userId, connection = pool) {
  const [rows] = await connection.execute('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId])
  if (rows[0]) return rows[0].id
  const [result] = await connection.execute('INSERT INTO carts (user_id) VALUES (?)', [userId])
  return result.insertId
}

function totals(items) {
  const subtotal = items.filter((item) => item.selected).reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = subtotal >= 99 ? 10 : 0
  const pointsDeduction = 0
  const shippingFee = subtotal > 0 && subtotal < 199 ? 8 : 0
  return {
    subtotal, discount, pointsDeduction, shippingFee,
    total: Math.max(0, subtotal - discount - pointsDeduction + shippingFee),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

export async function getCart(userId, connection = pool) {
  const cartId = await getOrCreateCart(userId, connection)
  const [rows] = await connection.execute(
    `SELECT ci.id, ci.product_id AS productId, ci.quantity, ci.selected,
      p.slug, p.name, p.category, p.price, p.original_price AS originalPrice,
      p.stock, p.status, p.flavor, p.origin, p.tone
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ? ORDER BY ci.created_at DESC`, [cartId],
  )
  const items = rows.map((item) => ({
    ...item, id: Number(item.id), productId: Number(item.productId), price: Number(item.price),
    originalPrice: item.originalPrice == null ? null : Number(item.originalPrice),
    quantity: Number(item.quantity), stock: Number(item.stock), selected: Boolean(item.selected),
    flavor: typeof item.flavor === 'string' ? JSON.parse(item.flavor) : item.flavor,
  }))
  return { id: cartId, items, ...totals(items) }
}

export async function addCartItem(userId, productId, quantity) {
  const amount = Math.max(1, Number(quantity) || 1)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [products] = await connection.execute('SELECT id, stock FROM products WHERE id = ? FOR UPDATE', [productId])
    const product = products[0]
    if (!product) throw Object.assign(new Error('商品不存在'), { statusCode: 404 })
    const cartId = await getOrCreateCart(userId, connection)
    const [existing] = await connection.execute(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1', [cartId, productId],
    )
    const nextQuantity = Number(existing[0]?.quantity || 0) + amount
    if (nextQuantity > product.stock) throw Object.assign(new Error('商品库存不足'), { statusCode: 400 })
    if (existing[0]) {
      await connection.execute('UPDATE cart_items SET quantity = ?, selected = 1 WHERE id = ?', [nextQuantity, existing[0].id])
    } else {
      await connection.execute('INSERT INTO cart_items (cart_id, product_id, quantity, selected) VALUES (?, ?, ?, 1)', [cartId, productId, amount])
    }
    await connection.commit()
    return getCart(userId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally { connection.release() }
}

export async function updateCartItem(userId, itemId, changes) {
  const cartId = await getOrCreateCart(userId)
  const [rows] = await pool.execute(
    `SELECT ci.id, ci.quantity, p.stock FROM cart_items ci JOIN products p ON p.id=ci.product_id
     WHERE ci.id=? AND ci.cart_id=? LIMIT 1`, [itemId, cartId],
  )
  if (!rows[0]) throw Object.assign(new Error('购物车商品不存在'), { statusCode: 404 })
  const quantity = changes.quantity === undefined ? rows[0].quantity : Math.max(1, Number(changes.quantity) || 1)
  if (quantity > rows[0].stock) throw Object.assign(new Error('商品库存不足'), { statusCode: 400 })
  const selected = changes.selected === undefined ? undefined : Number(Boolean(changes.selected))
  if (selected === undefined) await pool.execute('UPDATE cart_items SET quantity=? WHERE id=?', [quantity, itemId])
  else await pool.execute('UPDATE cart_items SET quantity=?, selected=? WHERE id=?', [quantity, selected, itemId])
  return getCart(userId)
}

export async function removeCartItem(userId, itemId) {
  const cartId = await getOrCreateCart(userId)
  await pool.execute('DELETE FROM cart_items WHERE id=? AND cart_id=?', [itemId, cartId])
  return getCart(userId)
}

export async function clearCart(userId) {
  const cartId = await getOrCreateCart(userId)
  await pool.execute('DELETE FROM cart_items WHERE cart_id=?', [cartId])
  return getCart(userId)
}
