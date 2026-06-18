import { defineStore } from 'pinia'

import * as bookingApi from '@/api/booking'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [],
    spaces: [],
    slots: [],
    seats: [],
    availability: [],
    apiError: '',
    dataSource: 'api',
  }),
  actions: {
    async fetchSpaces() {
      try {
        this.spaces = (await bookingApi.fetchSpaces()).data
        this.dataSource = 'api'
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.spaces = []
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
        this.slots = []
      }
      return this.slots
    },
    async createBooking(payload) {
      const booking = (await bookingApi.createBooking(payload)).data
      this.bookings.unshift(booking)
      return booking
    },
    async fetchMyBookings() {
      this.bookings = (await bookingApi.fetchMyBookings()).data
      return this.bookings
    },
    async fetchSeats() {
      this.seats = (await bookingApi.fetchSeats()).data
      return this.seats
    },
    async fetchAvailability(date, timeSlot) {
      if (!date || !timeSlot) return []
      this.availability = (await bookingApi.fetchSeatAvailability({ date, timeSlot })).data
      return this.availability
    },
    async createGuestBooking(payload) {
      const response = await bookingApi.createGuestBooking(payload)
      return { ...response.data, message: response.message }
    },
    async cancelBooking(id) {
      await bookingApi.cancelBooking(id)
      this.bookings = this.bookings.map((booking) =>
        booking.id === id ? { ...booking, status: 'cancelled' } : booking,
      )
    },
  },
})
