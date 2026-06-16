import { request } from './request'
export {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications'

export const getAccountOverview = () => request('/account/overview')
export const updateProfile = (payload) => request('/account/profile', { method: 'PATCH', body: payload })
export const getSecuritySettings = () => request('/account/security')
export const getPointRecords = () => request('/account/points')
export const getAddresses = () => request('/account/addresses')
export const createAddress = (payload) => request('/account/addresses', { method: 'POST', body: payload })
export const updateAddress = (id, payload) => request(`/account/addresses/${id}`, { method: 'PUT', body: payload })
export const getMyPosts = () => request('/account/posts')
