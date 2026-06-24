import { request, toQuery } from './request'

export const fetchPosts = (params = {}) => request(`/posts${toQuery(params)}`)
export const fetchCommunityStats = () => request('/posts/stats')
export const fetchPostDetail = (id) => request(`/posts/${encodeURIComponent(id)}`)
export const createPost = (payload) => request('/posts', { method: 'POST', body: payload })
export const createComment = (id, payload) => request(`/posts/${id}/comments`, { method: 'POST', body: payload })
export const replyComment = (id, commentId, payload) => request(`/posts/${id}/comments/${commentId}/replies`, { method: 'POST', body: payload })
export const deleteComment = (id, commentId) => request(`/posts/${id}/comments/${commentId}`, { method: 'DELETE' })
export const likeComment = (id, commentId) => request(`/posts/${id}/comments/${commentId}/like`, { method: 'POST' })
export const unlikeComment = (id, commentId) => request(`/posts/${id}/comments/${commentId}/like`, { method: 'DELETE' })
export const togglePostLike = (id) => request(`/posts/${id}/like`, { method: 'POST' })
export const fetchPostLikes = (id) => request(`/posts/${id}/likes`)
