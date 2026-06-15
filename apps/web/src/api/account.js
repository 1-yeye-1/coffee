import { request } from './request'

export const getAccountOverview = () => request('/account/overview')
export const updateProfile = (payload) => request('/account/profile', { method: 'PATCH', body: payload })
export const getSecuritySettings = () => request('/account/security')
export const getPointRecords = () => request('/account/points')
export const getNotifications = () => request('/account/notifications')
export const markNotificationRead = (id) => request(`/account/notifications/${id}/read`, { method: 'PATCH' })
export const getAddresses = () => request('/account/addresses')
export const createAddress = (payload) => request('/account/addresses', { method: 'POST', body: payload })
export const updateAddress = (id, payload) => request(`/account/addresses/${id}`, { method: 'PUT', body: payload })
export const getMyPosts = () => request('/account/posts')
