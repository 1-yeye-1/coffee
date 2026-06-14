import { request } from './request'

export const fetchSpaces = () => request('/spaces')
export const fetchSpaceDetail = (slug) => request(`/spaces/${encodeURIComponent(slug)}`)
export const fetchSpaceSlots = (slug) => request(`/spaces/${encodeURIComponent(slug)}/slots`)
export const createBooking = (payload) => request('/bookings', { method: 'POST', body: payload })
export const cancelBooking = (id) => request(`/bookings/${id}`, { method: 'DELETE' })
