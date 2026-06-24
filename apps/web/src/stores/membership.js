import { defineStore } from 'pinia'

import * as accountApi from '@/api/account'

export const useMembershipStore = defineStore('membership', {
  state: () => ({ account: null, overview: null, membership: null, favorites: [], loading: false, error: '' }),
  getters: {
    isFavorite: (state) => (targetType, targetId) => state.favorites.some(
      (item) => item.targetType === targetType && Number(item.targetId) === Number(targetId),
    ),
  },
  actions: {
    async fetchOverview() {
      this.loading = true
      try {
        this.overview = (await accountApi.getAccountOverview()).data
        this.account = this.overview.user
        this.error = ''
      } catch (error) { this.overview = null; this.account = null; this.error = error.message }
      finally { this.loading = false }
      return this.overview
    },
    async fetchMembershipCenter() {
      this.loading = true
      try {
        const data = (await accountApi.getPointsCenter()).data
        this.membership = data.membership
        this.account = {
          ...(this.account || {}),
          points: data.balance,
          level: data.membership?.currentLevel || this.account?.level || '普通会员',
          growthValue: data.membership?.growthValue || 0,
        }
        this.error = ''
        return data
      } catch (error) {
        this.membership = null
        this.error = error.message
        return null
      } finally {
        this.loading = false
      }
    },
    async dailyCheckin() {
      const data = (await accountApi.dailyCheckin()).data
      this.membership = data.membership
      this.account = {
        ...(this.account || {}),
        points: data.balance,
        level: data.membership?.currentLevel || this.account?.level || '普通会员',
        growthValue: data.membership?.growthValue || 0,
      }
      return data
    },
    async fetchFavorites() {
      this.loading = true
      try { this.favorites = (await accountApi.getFavorites()).data; this.error = '' }
      catch (error) { this.favorites = []; this.error = error.message }
      finally { this.loading = false }
      return this.favorites
    },
    async toggleFavorite(targetType, targetId) {
      const existing = this.favorites.find((item) => item.targetType === targetType && Number(item.targetId) === Number(targetId))
      if (existing) await accountApi.removeFavorite(existing.id)
      else await accountApi.addFavorite({ targetType, targetId })
      return this.fetchFavorites()
    },
    async removeFavorite(id) {
      await accountApi.removeFavorite(id)
      this.favorites = this.favorites.filter((item) => Number(item.id) !== Number(id))
    },
    async updateProfile(profile) {
      this.account = (await accountApi.updateProfile(profile)).data
      return this.account
    },
  },
})
