import { defineStore } from 'pinia'

import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    unreadCount: 0,
    meta: { page: 1, pageSize: 10, total: 0 },
    loading: false,
    error: '',
  }),
  actions: {
    async fetchUnreadCount() {
      try {
        this.unreadCount = (await getUnreadNotificationCount()).data.count
      } catch (error) {
        this.error = error.message
      }
      return this.unreadCount
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
    },
    async markAllRead(params = {}) {
      await markAllNotificationsRead()
      await this.fetchNotifications(params)
    },
    async remove(id, params = {}) {
      await deleteNotification(id)
      await this.fetchNotifications(params)
    },
    reset() {
      this.items = []
      this.unreadCount = 0
      this.meta = { page: 1, pageSize: 10, total: 0 }
      this.error = ''
    },
  },
})
