import { defineStore } from 'pinia'

import * as eventsApi from '@/api/events'

export const useEventsStore = defineStore('events', {
  state: () => ({ items: [], registrations: [], apiError: '', dataSource: 'api' }),
  getters: {
    getEventBySlug: (state) => (slug) => state.items.find((event) => event.slug === slug),
    registrationFor: (state) => (eventId) => state.registrations.find((item) => Number(item.eventId) === Number(eventId)),
    isRegistered() { return (eventId) => this.registrationFor(eventId)?.registrationStatus === 'registered' },
  },
  actions: {
    async fetchEvents(params = {}) {
      try {
        this.items = (await eventsApi.fetchEvents({ page: 1, pageSize: 100, ...params })).data
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.items = []
      }
      return this.items
    },
    async fetchRegistrations() {
      this.registrations = (await eventsApi.fetchMyEventRegistrations()).data
      return this.registrations
    },
    async fetchEventDetail(slug) {
      const event = (await eventsApi.fetchEventDetail(slug)).data
      const index = this.items.findIndex((item) => item.id === event.id)
      if (index >= 0) this.items[index] = event
      else this.items.unshift(event)
      return event
    },
    async register(event) {
      const updated = (await eventsApi.registerEvent(event.id)).data
      Object.assign(event, updated)
      await this.fetchRegistrations()
      return updated
    },
    async cancelRegistration(eventId) {
      await eventsApi.cancelEventRegistration(eventId)
      await Promise.all([this.fetchRegistrations(), this.fetchEvents()])
    },
  },
})
