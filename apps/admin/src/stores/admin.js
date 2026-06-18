import { defineStore } from 'pinia'

import * as adminApi from '@/api/admin'

const STORAGE_KEY = 'coffee-book-admin'
const defaultSettings = {
  siteName: 'Coffee Book',
  siteDescription: '融合精品咖啡、精选阅读与城市文化的生活方式空间。',
  phone: '021-8888-2026',
  businessHours: '09:00 - 21:30',
  featuredBooks: '小王子、活着、深度工作',
  featuredProducts: '埃塞俄比亚耶加雪菲、精品咖啡豆礼盒',
  featuredEvents: '周末读书会、城市夜读沙龙',
  newsletterEnabled: true,
  newsletterWelcome: '每周一封，分享值得阅读与品尝的新鲜灵感。',
}

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
      settings: { ...defaultSettings, ...(saved.settings || {}) },
      auditItems: saved.auditItems || [],
      remoteDashboard: null,
      dashboardTrends: null,
      dashboardRecent: null,
      financeDashboard: null,
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
      settings: defaultSettings,
      auditItems: [],
      remoteDashboard: null,
      dashboardTrends: null,
      dashboardRecent: null,
      financeDashboard: null,
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
    settings: state.settings,
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
    adminSettings: (state) => state.settings,
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
    async fetchFinanceDashboard() {
      this.apiLoading = true
      try {
        this.financeDashboard = (await adminApi.fetchFinanceDashboard()).data
        this.apiError = ''
      } catch (error) {
        this.financeDashboard = null
        this.apiError = error.message
      } finally { this.apiLoading = false }
      return this.financeDashboard
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
    async reviewPost(id, status) {
      if (this.dataSource === 'api') {
        try {
          await adminApi.updateAdminPostStatus(id, status)
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
    saveSettings(settings) {
      this.settings = { ...this.settings, ...settings }
      this.log('settings: update')
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
    async updateAdminOrderStatus(id, status) {
      try {
        const order = (await adminApi.updateAdminOrderStatus(id, status)).data
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
    async rejectAdminOrderPayment(id) {
      try {
        const order = (await adminApi.rejectAdminOrderPayment(id)).data
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
    async fetchAdminBookings(params = {}) {
      return this.fetchAdminCollection('bookings', params)
    },
    async updateAdminBookingStatus(id, status) {
      if (this.dataSource === 'api') {
        try {
          const booking = (await adminApi.updateAdminBookingStatus(id, status)).data
          await this.fetchAdminBookings()
          return booking
        } catch (error) { this.apiError = error.message; throw error }
      }
      const booking = this.bookings.find((item) => item.id === id)
      if (booking) booking.status = status
      persist(this.$state)
      return booking
    },
  },
})
