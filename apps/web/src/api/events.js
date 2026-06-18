import { request, toQuery } from './request'

export const fetchEvents = (params = {}) => request(`/events${toQuery(params)}`)
export const fetchEventDetail = (slug) => request(`/events/${encodeURIComponent(slug)}`)
export const registerEvent = (id) => request(`/events/${id}/register`, { method: 'POST' })
export const cancelEventRegistration = (id) => request(`/events/${id}/register`, { method: 'DELETE' })
export const fetchMyEventRegistrations = () => request('/events/me/registrations')
