import { request } from './request'
export {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications'

export const getAccountOverview = () => request('/account/overview')
export const getFavorites = () => request('/users/me/favorites')
export const addFavorite = (payload) => request('/users/me/favorites', { method: 'POST', body: payload })
export const removeFavorite = (id) => request(`/users/me/favorites/${id}`, { method: 'DELETE' })
export const updateProfile = (payload) => request('/account/profile', { method: 'PATCH', body: payload })
export const updatePrivacy = (payload) => request('/account/privacy', { method: 'PATCH', body: payload })
export const getSecuritySettings = () => request('/account/security')
export const verifyCurrentPhone = (payload) => request('/account/security/verify-current-phone', { method: 'POST', body: payload })
export const changePhone = (payload) => request('/account/security/phone', { method: 'PATCH', body: payload })
export const getPointRecords = () => request('/account/points')
export const getPointsCenter = () => request('/account/points-center')
export const redeemPointsCoupon = (couponId, requestKey) => request(`/account/points-center/redeem/${couponId}`, { method: 'POST', body: { requestKey } })
export const getAddresses = () => request('/account/addresses')
export const createAddress = (payload) => request('/account/addresses', { method: 'POST', body: payload })
export const updateAddress = (id, payload) => request(`/account/addresses/${id}`, { method: 'PUT', body: payload })
export const getMyPosts = () => request('/account/posts')
export const getPublicProfile = (id) => request(`/users/${encodeURIComponent(id)}/profile`)
export const getAvatarHistory = () => request('/users/me/avatars')
export const selectPresetAvatar = (avatarUrl) => request('/users/me/avatar/select', { method: 'POST', body: { avatarUrl } })
export const reuseAvatar = (id) => request(`/users/me/avatar/history/${id}/use`, { method: 'POST' })
