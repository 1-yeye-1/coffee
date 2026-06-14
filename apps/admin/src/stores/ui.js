import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: 'light',
    mobileNavigationOpen: false,
  }),
})

