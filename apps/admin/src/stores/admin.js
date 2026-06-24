import { defineStore } from 'pinia'

import * as adminApi from '@/api/admin'

const STORAGE_KEY = 'coffee-book-admin'
const clone = (value) => JSON.parse(JSON.stringify(value))

function normalizeProducts(items) {
  return clone(items).map((item) => ({
    ...item,
    productType: item.productType === 'coffee' ? 'coffee' : 'cultural',
    supportsBrewMethod: item.productType === 'coffee' ? item.supportsBrewMethod !== false : false,
    enabled: item.enabled ?? item.stock > 0,
  }))
}

function initialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      navigationCollapsed: false,
      books: [], products: [], events: [], users: [], posts: [],
      auditItems: saved.auditItems || [],
      remoteDashboard: null,
      dashboardTrends: null,
      dashboardRecent: null,
      apiLoading: false,
      apiError: '',
      dataSource: 'api',
      orders: [],
      bookings: [],
    }
  } catch {
    return {
      navigationCollapsed: false,
      books: [], products: [], events: [], users: [], posts: [],
      auditItems: [],
      remoteDashboard: null,
      dashboardTrends: null,
      dashboardRecent: null,
      apiLoading: false,
      apiError: '',
      dataSource: 'api',
      orders: [],
      bookings: [],
    }
  }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    books: state.books,
    products: state.products,
    events: state.events,
    users: state.users,
    posts: state.posts,
    auditItems: state.auditItems.slice(0, 30),
  }))
}

export const useAdminStore = defineStore('admin', {
  state: () => initialState(),
  getters: {
    dashboardStats(state) {
      return state.remoteDashboard || {}
    },
    adminUsers: (state) => state.users,
  },
  actions: {
    async fetchDashboard() {
      this.apiLoading = true
      this.apiError = ''
      try {
        const [summary, trends, recent] = await Promise.all([
          adminApi.fetchDashboardSummary(), adminApi.fetchDashboardTrends(), adminApi.fetchDashboardRecent(),
        ])
        this.remoteDashboard = summary.data
        this.dashboardTrends = trends.data
        this.dashboardRecent = recent.data
        this.dataSource = 'api'
      } catch (error) {
        this.remoteDashboard = null
        this.apiError = error.message
        this.dashboardTrends = null
        this.dashboardRecent = null
      } finally {
        this.apiLoading = false
      }
      return this.dashboardStats
    },
    async fetchAdminCollection(collection, params = {}) {
      if (!['books', 'products', 'events', 'posts', 'bookings', 'users'].includes(collection)) return this[collection]
      this.apiLoading = true
      this.apiError = ''
      try {
        const request = {
          books: adminApi.fetchAdminBooks,
          products: adminApi.fetchAdminProducts,
          events: adminApi.fetchAdminEvents,
          posts: adminApi.fetchAdminPosts,
          bookings: adminApi.fetchAdminBookings,
          users: adminApi.fetchAdminUsers,
        }[collection]
        const response = await request({ page: 1, pageSize: 100, ...params })
        this[collection] = response.data.map((item) => ({
          ...item,
          enabled: !['inactive', 'sold_out', 'cancelled'].includes(item.status) && item.stock !== 0,
          reviewStatus: item.reviewStatus || item.status,
        }))
        this.dataSource = 'api'
      } catch (error) {
        this.apiError = error.message
        this[collection] = []
      } finally {
        this.apiLoading = false
      }
      return this[collection]
    },
    log(action) {
      this.auditItems.unshift({ id: Date.now(), action, time: new Date().toISOString() })
    },
    async upsert(collection, payload) {
      if (['books', 'products', 'events'].includes(collection) && this.dataSource === 'api') {
        const api = {
          books: payload.id == null ? adminApi.createBook(payload) : adminApi.updateBook(payload.id, payload),
          products: payload.id == null ? adminApi.createProduct(payload) : adminApi.updateProduct(payload.id, payload),
          events: payload.id == null ? adminApi.createEvent(payload) : adminApi.updateEvent(payload.id, payload),
        }[collection]
        try { await api; await this.fetchAdminCollection(collection); return }
        catch (error) { this.apiError = error.message; throw error }
      }
      const list = this[collection]
      const index = list.findIndex((item) => item.id === payload.id)
      if (index >= 0) list[index] = { ...list[index], ...clone(payload) }
      else list.unshift({ ...clone(payload), id: Date.now() })
      this.log(`${collection}: ${index >= 0 ? 'update' : 'create'}`)
      persist(this.$state)
    },
    async remove(collection, id) {
      if (['books', 'products', 'events'].includes(collection) && this.dataSource === 'api') {
        try {
          await ({
            books: adminApi.deleteBook,
            products: adminApi.deleteProduct,
            events: adminApi.deleteEvent,
          }[collection])(id)
          await this.fetchAdminCollection(collection); return
        } catch (error) { this.apiError = error.message; throw error }
      }
      this[collection] = this[collection].filter((item) => item.id !== id)
      this.log(`${collection}: delete`)
      persist(this.$state)
    },
    async toggleEnabled(collection, id) {
      const item = this[collection].find((entry) => entry.id === id)
      if (!item) return
      if (['books', 'products'].includes(collection) && this.dataSource === 'api') {
        const status = item.status === 'inactive' ? 'active' : 'inactive'
        try {
          await (collection === 'books' ? adminApi.updateBookStatus(id, status) : adminApi.updateProductStatus(id, status))
          await this.fetchAdminCollection(collection); return
        } catch (error) { this.apiError = error.message; throw error }
      }
      item.enabled = !item.enabled
      persist(this.$state)
    },
    async updateCollectionStatus(collection, id, status) {
      const request = {
        books: adminApi.updateBookStatus,
        products: adminApi.updateProductStatus,
        events: adminApi.updateEventStatus,
      }[collection]
      if (!request) return
      try {
        await request(id, status)
        await this.fetchAdminCollection(collection)
      } catch (error) {
        this.apiError = error.message
        throw error
      }
    },
    async reviewPost(id, status, reason = '') {
      if (this.dataSource === 'api') {
        try {
          await adminApi.updateAdminPostStatus(id, status, reason)
          await this.fetchAdminCollection('posts')
          return
        } catch (error) { this.apiError = error.message; throw error }
      }
      const post = this.posts.find((item) => item.id === id)
      if (!post) return
      post.reviewStatus = status
      persist(this.$state)
    },
    toggleFeaturedPost(id) {
      const post = this.posts.find((item) => item.id === id)
      if (!post) return
      post.featured = !post.featured
      persist(this.$state)
    },
    async updateUser(id, changes) {
      if (this.dataSource === 'api') {
        try {
          await adminApi.updateAdminUser(id, changes)
          await this.fetchAdminCollection('users')
          return
        } catch (error) {
          this.apiError = error.message
          throw error
        }
      }
      const user = this.users.find((item) => item.id === id)
      if (!user) return
      Object.assign(user, changes)
      persist(this.$state)
    },
    async fetchAdminOrders(params = {}) {
      try {
        this.orders = (await adminApi.getAdminOrders({ page: 1, pageSize: 100, ...params })).data
        this.apiError = ''; return this.orders
      } catch (error) { this.apiError = error.message; return this.orders }
    },
    async fetchAdminOrderDetail(id) {
      try { return (await adminApi.getAdminOrderDetail(id)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async updateAdminOrderStatus(id, status, payload = {}) {
      try {
        const order = (await adminApi.updateAdminOrderStatus(id, status, payload)).data
        await this.fetchAdminOrders(); return order
      } catch (error) { this.apiError = error.message; throw error }
    },
    async confirmAdminOrderPayment(id) {
      try {
        const order = (await adminApi.confirmAdminOrderPayment(id)).data
        await this.fetchAdminOrders()
        return order
      } catch (error) { this.apiError = error.message; throw error }
    },
    async rejectAdminOrderPayment(id, reason = '') {
      try {
        const order = (await adminApi.rejectAdminOrderPayment(id, reason)).data
        await this.fetchAdminOrders()
        return order
      } catch (error) { this.apiError = error.message; throw error }
    },
    async expireAdminOrderPayment(id) {
      try {
        const order = (await adminApi.expireAdminOrderPayment(id)).data
        await this.fetchAdminOrders()
        return order
      } catch (error) { this.apiError = error.message; throw error }
    },

    async fetchResourceStats(resource) {
      const request = {
        products: adminApi.fetchAdminProductStats,
        books: adminApi.fetchAdminBookStats,
        orders: adminApi.fetchAdminOrderStats,
        logs: adminApi.fetchAdminLogStats,
        uploads: adminApi.fetchUploadFileStats,
        seats: adminApi.fetchAdminSeatStats,
      }[resource]
      if (!request) return null
      try { return (await request()).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async fetchAdminDetail(resource, id) {
      const request = {
        products: adminApi.getAdminProductDetail,
        books: adminApi.getAdminBookDetail,
        users: adminApi.getAdminUserDetail,
        seats: adminApi.getAdminSeatDetail,
      }[resource]
      if (!request) return null
      try { return (await request(id)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async adjustStock(resource, id, payload) {
      const request = resource === 'books' ? adminApi.adjustBookStock : adminApi.adjustProductStock
      try {
        const result = (await request(id, payload)).data
        await this.fetchAdminCollection(resource)
        return result
      } catch (error) { this.apiError = error.message; throw error }
    },
    async updateFlags(resource, id, payload) {
      const request = resource === 'books' ? adminApi.updateBookFlags : adminApi.updateProductFlags
      try {
        const result = (await request(id, payload)).data
        await this.fetchAdminCollection(resource)
        return result
      } catch (error) { this.apiError = error.message; throw error }
    },
    async batchUpdateResource(resource, payload) {
      const request = { products: adminApi.batchUpdateProducts, books: adminApi.batchUpdateBooks, orders: adminApi.batchUpdateOrders }[resource]
      if (!request) return null
      try {
        const result = (await request(payload)).data
        if (resource === 'orders') await this.fetchAdminOrders()
        else await this.fetchAdminCollection(resource)
        return result
      } catch (error) { this.apiError = error.message; throw error }
    },
    async updateUserRisk(id, payload) {
      try {
        const body = {}
        if (payload.status) {
          body.riskType = payload.status === 'active' ? 'enable' : 'disable'
        }
        if ('bookingRestricted' in payload) {
          body.riskType = payload.bookingRestricted ? 'booking_limit' : 'booking_unlimit'
        }
        if ('postRestricted' in payload) {
          body.riskType = payload.postRestricted ? 'post_limit' : 'post_unlimit'
        }
        if (payload.reason) body.reason = payload.reason
        if (payload.endAt) body.endAt = payload.endAt
        if (!body.riskType) throw new Error('无效的风控操作类型')
        const result = (await adminApi.updateAdminUserRisk(id, body)).data
        await this.fetchAdminCollection('users')
        return result
      } catch (error) { this.apiError = error.message; throw error }
    },
    async fetchAdminBookings(params = {}) {
      return this.fetchAdminCollection('bookings', params)
    },
    async fetchAdminBookingStats(params = {}) {
      try { return (await adminApi.fetchAdminBookingStats(params)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async fetchAdminBookReservations(bookId, params = {}) {
      try { return await adminApi.fetchAdminBookReservations(bookId, params) }
      catch (error) { this.apiError = error.message; throw error }
    },
    async updateAdminBookReservationStatus(bookId, reservationId, payload = {}) {
      try { return (await adminApi.updateAdminBookReservationStatus(bookId, reservationId, payload)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async fetchUploadFileDetail(id) {
      try { return (await adminApi.fetchUploadFileDetail(id)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async fetchAdminBookingDetail(id) {
      try { return (await adminApi.getAdminBookingDetail(id)).data }
      catch (error) { this.apiError = error.message; throw error }
    },
    async updateAdminBookingStatus(id, status, reason = '') {
      if (this.dataSource === 'api') {
        try {
          const booking = (await adminApi.updateAdminBookingStatus(id, status, reason)).data
          await this.fetchAdminBookings()
          return booking
        } catch (error) { this.apiError = error.message; throw error }
      }
      const booking = this.bookings.find((item) => item.id === id)
      if (booking) booking.status = status
      persist(this.$state)
      return booking
    },
    async batchUpdateAdminBookingStatus(ids, status, reason = '') {
      try {
        const result = (await adminApi.batchUpdateAdminBookingStatus(ids, status, reason)).data
        await this.fetchAdminBookings()
        return result
      } catch (error) { this.apiError = error.message; throw error }
    },
  },
})
