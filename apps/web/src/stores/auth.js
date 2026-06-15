import { defineStore } from 'pinia'

import * as authApi from '@/api/auth'

const STORAGE_KEY = 'coffee-book-auth'

function readStoredAuth() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      user: saved.user || null,
      accessToken: saved.accessToken || null,
    }
  } catch {
    return { user: null, accessToken: null }
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    ...readStoredAuth(),
    loading: false,
    error: '',
    restored: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: this.user,
        accessToken: this.accessToken,
      }))
    },
    clearSession() {
      this.user = null
      this.accessToken = null
      this.error = ''
      localStorage.removeItem(STORAGE_KEY)
      this.restored = true
    },
    async login(credentials) {
      this.loading = true
      this.error = ''
      try {
        const response = await authApi.login(credentials)
        this.user = response.data.user
        this.accessToken = response.data.token
        this.persist()
        window.dispatchEvent(new CustomEvent('coffee-book:auth-login'))
        return this.user
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    async register(payload) {
      this.loading = true
      this.error = ''
      try {
        const response = await authApi.register(payload)
        if (response.data?.token) {
          this.user = response.data.user
          this.accessToken = response.data.token
          this.persist()
          window.dispatchEvent(new CustomEvent('coffee-book:auth-login'))
          return this.user
        }
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    async fetchCurrentUser() {
      if (!this.accessToken) return null
      try {
        this.user = (await authApi.getCurrentUser()).data
        this.persist()
        return this.user
      } catch (error) {
        if (error.status === 401) this.clearSession()
        throw error
      }
    },
    async restoreSession() {
      if (this.restored) return this.user
      if (!this.accessToken) {
        this.restored = true
        return null
      }
      try {
        return await this.fetchCurrentUser()
      } catch (error) {
        if (error.status !== 401) this.error = error.message
        return this.user
      } finally {
        this.restored = true
      }
    },
    async logout() {
      try {
        if (this.accessToken) await authApi.logout()
      } finally {
        this.clearSession()
        window.dispatchEvent(new CustomEvent('coffee-book:auth-logout'))
      }
    },
  },
})
