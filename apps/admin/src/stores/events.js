import { defineStore } from 'pinia'

import * as eventsApi from '@/api/events'
import { events } from '@/data/events'

const STORAGE_KEY = 'coffee-book-event-registrations'

function readRegistrations() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export const useEventsStore = defineStore('events', {
  state: () => ({
    items: events,
    registrations: readRegistrations(),
    apiError: '',
    dataSource: 'local',
  }),
  getters: {
    getEventBySlug: (state) => (slug) => state.items.find((event) => event.slug === slug),
    isRegistered: (state) => (eventId) =>
      state.registrations.some((registration) => registration.eventId === eventId),
  },
  actions: {
    async fetchEvents(params = {}) {
      this.apiError = ''
      try {
        const response = await eventsApi.fetchEvents({ page: 1, pageSize: 100, ...params })
        this.items = response.data
        this.dataSource = 'api'
      } catch (error) {
        this.apiError = error.message
        this.dataSource = 'local'
      }
      return this.items
    },
    async fetchEventDetail(slug) {
      try {
        const event = (await eventsApi.fetchEventDetail(slug)).data
        const index = this.items.findIndex((item) => item.id === event.id || item.slug === event.slug)
        if (index >= 0) this.items[index] = event
        else this.items.unshift(event)
        this.dataSource = 'api'
        return event
      } catch (error) {
        this.apiError = error.message
        return this.getEventBySlug(slug)
      }
    },
    async register(event) {
      if (!event || this.isRegistered(event.id)) return
      if (this.dataSource === 'api') {
        try {
          const updated = (await eventsApi.registerEvent(event.id)).data
          Object.assign(event, updated)
        } catch (error) {
          this.apiError = error.message
        }
      }
      this.registrations.unshift({
        id: `ER${Date.now()}`,
        eventId: event.id,
        eventSlug: event.slug,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        createdAt: new Date().toISOString(),
        status: 'registered',
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.registrations))
    },
    async cancelRegistration(id) {
      const registration = this.registrations.find((item) => item.id === id)
      if (registration && this.dataSource === 'api') {
        try { await eventsApi.cancelEventRegistration(registration.eventId) }
        catch (error) { this.apiError = error.message }
      }
      this.registrations = this.registrations.map((item) =>
        item.id === id ? { ...item, status: 'cancelled' } : item,
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.registrations))
    },
  },
})
