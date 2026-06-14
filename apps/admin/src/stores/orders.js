import { defineStore } from 'pinia'

import * as ordersApi from '@/api/orders'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'coffee-book-orders'

function readOrders() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function persistOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}

function createOrderId() {
  const date = new Date()
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  return `CB${stamp}${String(date.getTime()).slice(-6)}`
}

export const useOrderStore = defineStore('orders', {
  state: () => ({
    orders: readOrders(),
    currentOrder: null,
    loading: false,
    error: '',
    source: 'local',
  }),
  getters: {
    getOrderById: (state) => (id) => state.orders.find((order) => order.id === String(id)),
  },
  actions: {
    async fetchOrders(params = {}) {
      if (!useAuthStore().isAuthenticated) return this.orders
      this.loading = true
      try { this.orders = (await ordersApi.getOrders(params)).data; this.source = 'api'; this.error = '' }
      catch (error) { this.error = error.message; this.source = 'local' }
      finally { this.loading = false }
      return this.orders
    },
    async fetchOrderDetail(id) {
      if (!useAuthStore().isAuthenticated) { this.currentOrder = this.getOrderById(id); return this.currentOrder }
      this.loading = true
      try { this.currentOrder = (await ordersApi.getOrderDetail(id)).data; this.source = 'api'; this.error = '' }
      catch (error) { this.currentOrder = this.getOrderById(id); this.error = error.message; this.source = 'local' }
      finally { this.loading = false }
      return this.currentOrder
    },
    async createOrder(snapshot) {
      if (useAuthStore().isAuthenticated) {
        try {
          const order = (await ordersApi.createOrder({
            deliveryType: snapshot.deliveryType, addressForm: snapshot.address,
            pickupStore: snapshot.pickupStore, paymentMethod: snapshot.paymentMethod,
            coupon: snapshot.coupon, pointsUsed: snapshot.pointsUsed, orderNote: snapshot.orderNote,
          })).data
          this.orders.unshift(order); this.currentOrder = order; this.source = 'api'; this.error = ''
          return order
        } catch (error) { this.error = error.message }
      }
      const createdAt = new Date().toISOString()
      const order = {
        id: createOrderId(),
        ...snapshot,
        status: 'pending_payment',
        createdAt,
        timeline: {
          submittedAt: createdAt,
          paidAt: null,
          processingAt: null,
          completedAt: null,
          cancelledAt: null,
        },
      }
      this.orders.unshift(order)
      persistOrders(this.orders)
      return order
    },
    async cancelOrder(id) {
      if (useAuthStore().isAuthenticated) {
        try { const order=(await ordersApi.cancelOrder(id)).data; await this.fetchOrders(); this.currentOrder=order; return order }
        catch (error) { this.error=error.message; throw error }
      }
      const order = this.getOrderById(id)
      if (!order || order.status !== 'pending_payment') return
      order.status = 'cancelled'
      order.timeline.cancelledAt = new Date().toISOString()
      persistOrders(this.orders)
    },
    async payOrder(id) {
      if (useAuthStore().isAuthenticated) {
        try { const order=(await ordersApi.payOrder(id)).data; await this.fetchOrders(); this.currentOrder=order; return order }
        catch (error) { this.error=error.message; throw error }
      }
      const order = this.getOrderById(id)
      if (!order || order.status !== 'pending_payment') return
      const paidAt = new Date().toISOString()
      order.status = 'paid'
      order.timeline.paidAt = paidAt
      order.timeline.processingAt = paidAt
      persistOrders(this.orders)
    },
    async confirmOrder(id) {
      if (useAuthStore().isAuthenticated) {
        try { const order=(await ordersApi.completeOrder(id)).data; await this.fetchOrders(); this.currentOrder=order; return order }
        catch (error) { this.error=error.message; throw error }
      }
      const order = this.getOrderById(id)
      if (!order || order.status !== 'paid') return
      order.status = 'completed'
      order.timeline.completedAt = new Date().toISOString()
      persistOrders(this.orders)
    },
  },
})

export const useOrdersStore = useOrderStore
