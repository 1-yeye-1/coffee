import { request, toQuery } from './request'

export const getNotifications = (params = {}) => request(`/account/notifications${toQuery(params)}`)
export const getUnreadNotificationCount = () => request('/account/notifications/unread-count')
export const markNotificationRead = (id) => request(`/account/notifications/${id}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = () => request('/account/notifications/read-all', { method: 'PATCH' })
export const deleteNotification = (id) => request(`/account/notifications/${id}`, { method: 'DELETE' })
