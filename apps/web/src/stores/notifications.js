import { defineStore } from 'pinia'

import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'

function notifyUpdated() {
  try { window.dispatchEvent(new CustomEvent('coffee-book:notifications-updated')) } catch { /* noop */ }
}

const UNREAD_CACHE_TTL = 15_000
let unreadCountRequest = null
let unreadCountFetchedAt = 0

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    unreadCount: 0,
    meta: { page: 1, pageSize: 10, total: 0 },
    loading: false,
    error: '',
  }),
  actions: {
    async fetchUnreadCount(options = {}) {
      if (!useAuthStore().isAuthenticated) {
        this.unreadCount = 0
        return this.unreadCount
      }
      const now = Date.now()
      if (!options.force && now - unreadCountFetchedAt < UNREAD_CACHE_TTL) return this.unreadCount
      if (!options.force && unreadCountRequest) return unreadCountRequest
      try {
        unreadCountRequest = getUnreadNotificationCount()
          .then((response) => {
            this.unreadCount = response.data.count
            unreadCountFetchedAt = Date.now()
            this.error = ''
            notifyUpdated()
            return this.unreadCount
          })
          .finally(() => {
            unreadCountRequest = null
          })
        return await unreadCountRequest
      } catch (error) {
        this.error = error.message
        return this.unreadCount
      }
    },
    async fetchNotifications(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const response = await getNotifications(params)
        this.items = response.data
        this.meta = response.meta || this.meta
        await this.fetchUnreadCount()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
      return this.items
    },
    async markRead(id, params = {}) {
      await markNotificationRead(id)
      await this.fetchNotifications(params)
      await this.fetchUnreadCount({ force: true })
      notifyUpdated()
    },
    async markAllRead(params = {}) {
      await markAllNotificationsRead()
      await this.fetchNotifications(params)
      await this.fetchUnreadCount({ force: true })
      notifyUpdated()
    },
    async remove(id, params = {}) {
      await deleteNotification(id)
      await this.fetchNotifications(params)
      await this.fetchUnreadCount({ force: true })
      notifyUpdated()
    },
    reset() {
      this.items = []
      this.unreadCount = 0
      this.meta = { page: 1, pageSize: 10, total: 0 }
      this.error = ''
      unreadCountFetchedAt = 0
      unreadCountRequest = null
    },
  },
})
