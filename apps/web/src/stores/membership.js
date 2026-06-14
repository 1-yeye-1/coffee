import { defineStore } from 'pinia'

const STORAGE_KEY = 'coffee-book-membership'
const defaultAccount = {
  nickname: 'Coffee Reader',
  phone: '13800138000',
  email: 'reader@coffeebook.local',
  level: 'Gold Reader',
  points: 2680,
  growth: 4260,
  nextLevelGrowth: 6000,
  avatar: 'CR',
  favoriteBookSlugs: ['the-little-prince', 'deep-work'],
  favoriteProductSlugs: ['ethiopia-yirgacheffe', 'coffee-bean-gift-box'],
}

function readAccount() {
  try {
    return { ...defaultAccount, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return defaultAccount
  }
}

export const useMembershipStore = defineStore('membership', {
  state: () => ({
    account: readAccount(),
  }),
  actions: {
    updateProfile(profile) {
      this.account = { ...this.account, ...profile }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.account))
    },
  },
})
