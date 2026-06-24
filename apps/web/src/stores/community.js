import { defineStore } from 'pinia'

import * as communityApi from '@/api/community'
import { useAuthStore } from '@/stores/auth'
import { useMembershipStore } from '@/stores/membership'

function normalizeComment(comment = {}) {
  return {
    ...comment,
    id: comment.id,
    parentId: comment.parentId ?? null,
    author: comment.author || comment.user?.nickname || '匿名用户',
    content: String(comment.content || ''),
    likeCount: Number(comment.likeCount || 0),
    createdAt: comment.createdAt || new Date().toISOString(),
    user: comment.user || null,
  }
}

function normalizePost(post = {}) {
  const comments = Array.isArray(post.comments) ? post.comments.map(normalizeComment) : []
  return {
    ...post,
    title: post.title || '未命名帖子',
    author: post.author || 'Coffee Reader',
    avatar: post.avatar || (post.author || '用').slice(0, 1),
    topic: post.topic || '生活分享',
    excerpt: post.excerpt || String(post.content || '').slice(0, 72),
    content: String(post.content || ''),
    comments,
    commentsCount: Number(post.commentsCount ?? comments.length),
    likes: Number(post.likes || 0),
    mediaUrl: post.mediaUrl || '',
    mediaType: post.mediaType || '',
    createdAt: post.createdAt || new Date().toISOString(),
  }
}

export const useCommunityStore = defineStore('community', {
  state: () => ({ posts: [], likedIds: [], favoriteIds: [], loading: false, apiError: '', dataSource: 'api' }),
  getters: {
    getPostBySlug: (state) => (slug) => state.posts.find((post) => post.slug === slug || String(post.id) === String(slug)),
  },
  actions: {
    async fetchPosts(params = {}) {
      this.loading = true
      try {
        const response = await communityApi.fetchPosts({ page: 1, pageSize: 100, ...params })
        this.posts = (Array.isArray(response.data) ? response.data : []).map(normalizePost)
        if (useAuthStore().isAuthenticated) {
          const membership = useMembershipStore()
          await membership.fetchFavorites()
          this.favoriteIds = membership.favorites.filter((item) => item.targetType === 'post').map((item) => Number(item.targetId))
        }
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.posts = []
      } finally {
        this.loading = false
      }
      return this.posts
    },
    async fetchStats() {
      try {
        const response = await communityApi.fetchCommunityStats()
        this.apiError = ''
        return response.data || { members: 0, monthlyShares: 0, posts: 0, comments: 0 }
      } catch (error) {
        this.apiError = error.message
        return { members: 0, monthlyShares: 0, posts: 0, comments: 0 }
      }
    },
    async fetchPostDetail(id) {
      this.loading = true
      try {
        const post = normalizePost((await communityApi.fetchPostDetail(id)).data)
        const index = this.posts.findIndex((item) => item.id === post.id || item.slug === post.slug)
        if (index >= 0) this.posts[index] = post
        else this.posts.unshift(post)
        this.apiError = ''
        return post
      } catch (error) {
        this.apiError = error.message
        return null
      } finally {
        this.loading = false
      }
    },
    async createPost(payload) {
      const post = normalizePost((await communityApi.createPost(payload)).data)
      this.posts.unshift(post)
      return post
    },
    async toggleLike(id) {
      const post = this.posts.find((item) => item.id === id)
      if (!post) return null
      const result = (await communityApi.togglePostLike(id)).data
      post.likes = result.likes
      this.likedIds = result.liked ? [...new Set([...this.likedIds, id])] : this.likedIds.filter((item) => item !== id)
      return result
    },
    async fetchLikes(id) {
      return (await communityApi.fetchPostLikes(id)).data.items || []
    },
    async toggleFavorite(id) {
      if (!useAuthStore().isAuthenticated) throw Object.assign(new Error('请先登录'), { status: 401 })
      const membership = useMembershipStore()
      await membership.toggleFavorite('post', id)
      this.favoriteIds = membership.favorites.filter((item) => item.targetType === 'post').map((item) => Number(item.targetId))
    },
    async addComment(postId, content, isAnonymous = false) {
      const post = this.posts.find((item) => item.id === postId)
      if (!post || !content.trim()) return
      Object.assign(post, normalizePost((await communityApi.createComment(postId, { content, isAnonymous })).data))
    },
    async replyComment(postId, commentId, content) {
      const post = this.posts.find((item) => item.id === postId)
      if (!post || !content.trim()) return null
      const response = await communityApi.replyComment(postId, commentId, { content })
      Object.assign(post, normalizePost(response.data))
      return post
    },
    async likeComment(postId, commentId) {
      return (await communityApi.likeComment(postId, commentId)).data
    },
    async unlikeComment(postId, commentId) {
      return (await communityApi.unlikeComment(postId, commentId)).data
    },
    async deleteComment(postId, commentId) {
      await communityApi.deleteComment(postId, commentId)
      const post = this.posts.find((item) => item.id === postId)
      if (post) post.comments = (Array.isArray(post.comments) ? post.comments : []).filter((item) => item.id !== commentId)
    },
  },
})
