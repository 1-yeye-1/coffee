import { request, toQuery } from './request'

export const fetchPosts = (params = {}) => request(`/posts${toQuery(params)}`)
export const fetchPostDetail = (id) => request(`/posts/${encodeURIComponent(id)}`)
export const createPost = (payload) => request('/posts', { method: 'POST', body: payload })
export const createComment = (id, payload) => request(`/posts/${id}/comments`, { method: 'POST', body: payload })
export const togglePostLike = (id) => request(`/posts/${id}/like`, { method: 'POST' })
export const fetchPostLikes = (id) => request(`/posts/${id}/likes`)
