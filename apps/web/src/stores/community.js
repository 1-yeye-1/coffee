import { defineStore } from 'pinia'

import * as communityApi from '@/api/community'
import { useAuthStore } from '@/stores/auth'
import { useMembershipStore } from '@/stores/membership'

export const useCommunityStore = defineStore('community', {
  state: () => ({ posts: [], likedIds: [], favoriteIds: [], apiError: '', dataSource: 'api' }),
  getters: {
    getPostBySlug: (state) => (slug) => state.posts.find((post) => post.slug === slug || String(post.id) === String(slug)),
  },
  actions: {
    async fetchPosts(params = {}) {
      try {
        const response = await communityApi.fetchPosts({ page: 1, pageSize: 100, ...params })
        this.posts = response.data
        if (useAuthStore().isAuthenticated) {
          const membership = useMembershipStore()
          await membership.fetchFavorites()
          this.favoriteIds = membership.favorites.filter((item) => item.targetType === 'post').map((item) => Number(item.targetId))
        }
        this.apiError = ''
      } catch (error) {
        this.apiError = error.message
        this.posts = []
      }
      return this.posts
    },
    async fetchPostDetail(id) {
      const post = (await communityApi.fetchPostDetail(id)).data
      const index = this.posts.findIndex((item) => item.id === post.id || item.slug === post.slug)
      if (index >= 0) this.posts[index] = post
      else this.posts.unshift(post)
      return post
    },
    async createPost(payload) {
      const post = (await communityApi.createPost(payload)).data
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
      Object.assign(post, (await communityApi.createComment(postId, { content, isAnonymous })).data)
    },
    async deleteComment(postId, commentId) {
      await communityApi.deleteComment(postId, commentId)
      const post = this.posts.find((item) => item.id === postId)
      if (post) post.comments = post.comments.filter((item) => item.id !== commentId)
    },
  },
})
