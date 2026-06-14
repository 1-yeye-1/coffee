import { defineStore } from 'pinia'

import * as bookingApi from '@/api/booking'

const STORAGE_KEY = 'coffee-book-bookings'

function readBookings() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: readBookings(),
    spaces: [],
    slots: [],
    apiError: '',
    dataSource: 'local',
  }),
  actions: {
    async fetchSpaces() {
      try {
        this.spaces = (await bookingApi.fetchSpaces()).data
        this.dataSource = 'api'
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.dataSource = 'local'
      }
      return this.spaces
    },
    async fetchSlots(slug = 'city-reading-room') {
      try {
        this.slots = (await bookingApi.fetchSpaceSlots(slug)).data
        this.dataSource = 'api'
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.dataSource = 'local'
      }
      return this.slots
    },
    async createBooking(payload) {
      if (this.dataSource === 'api') {
        try {
          const booking = (await bookingApi.createBooking(payload)).data
          this.bookings.unshift(booking)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookings))
          return booking
        } catch (error) {
          this.apiError = error.message
        }
      }
      const booking = {
        id: `BK${Date.now()}`,
        ...payload,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }
      this.bookings.unshift(booking)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookings))
      return booking
    },
    async cancelBooking(id) {
      if (this.dataSource === 'api') {
        try { await bookingApi.cancelBooking(id) }
        catch (error) { this.apiError = error.message }
      }
      this.bookings = this.bookings.map((booking) =>
        booking.id === id ? { ...booking, status: 'cancelled' } : booking,
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookings))
    },
  },
})
