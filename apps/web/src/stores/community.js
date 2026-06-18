import { defineStore } from 'pinia'

import * as communityApi from '@/api/community'
import { seedPosts } from '@/data/posts'

const STORAGE_KEY = 'coffee-book-community'

function readCommunity() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      posts: Array.isArray(value.posts) ? value.posts : seedPosts,
      likedIds: Array.isArray(value.likedIds) ? value.likedIds : [],
      favoriteIds: Array.isArray(value.favoriteIds) ? value.favoriteIds : [],
      apiError: '',
      dataSource: 'local',
    }
  } catch {
    return { posts: seedPosts, likedIds: [], favoriteIds: [], apiError: '', dataSource: 'local' }
  }
}

function persist(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      posts: state.posts,
      likedIds: state.likedIds,
      favoriteIds: state.favoriteIds,
    }),
  )
}

export const useCommunityStore = defineStore('community', {
  state: () => readCommunity(),
  getters: {
    getPostBySlug: (state) => (slug) => state.posts.find((post) => post.slug === slug || String(post.id) === String(slug)),
  },
  actions: {
    async fetchPosts(params = {}) {
      try {
        const response = await communityApi.fetchPosts({ page: 1, pageSize: 100, ...params })
        this.posts = response.data
        this.apiError = ''
        this.dataSource = 'api'
      } catch (error) {
        this.apiError = error.message
        this.dataSource = 'local'
      }
      return this.posts
    },
    async fetchPostDetail(id) {
      try {
        const post = (await communityApi.fetchPostDetail(id)).data
        const index = this.posts.findIndex((item) => item.id === post.id || item.slug === post.slug)
        if (index >= 0) this.posts[index] = post
        else this.posts.unshift(post)
        this.dataSource = 'api'
        return post
      } catch (error) {
        this.apiError = error.message
        return this.getPostBySlug(id)
      }
    },
    async createPost({ title, content, topic, mediaUrl = '', mediaType = '' }) {
      if (this.dataSource === 'api') {
        try {
          const post = (await communityApi.createPost({ title, content, topic, mediaUrl, mediaType })).data
          this.posts.unshift(post)
          return post
        } catch (error) {
          this.apiError = error.message
        }
      }
      const id = `post-${Date.now()}`
      const post = {
        id,
        slug: `member-${Date.now()}`,
        title: title.trim(),
        author: 'Coffee Reader',
        avatar: 'C',
        topic: topic || '生活分享',
        createdAt: new Date().toISOString(),
        excerpt: content.trim().slice(0, 72),
        content: content.trim(),
        mediaUrl,
        mediaType,
        likes: 0,
        comments: [],
        isLocal: true,
      }
      this.posts.unshift(post)
      persist(this.$state)
      return post
    },
    async toggleLike(id) {
      const post = this.posts.find((item) => item.id === id)
      if (!post) return
      if (this.dataSource === 'api') {
        try {
          const result = (await communityApi.togglePostLike(id)).data
          post.likes = result.likes
          this.likedIds = result.liked
            ? [...new Set([...this.likedIds, id])]
            : this.likedIds.filter((item) => item !== id)
          return result
        } catch (error) {
          this.apiError = error.message
        }
      }
      if (this.likedIds.includes(id)) {
        this.likedIds = this.likedIds.filter((item) => item !== id)
        post.likes = Math.max(0, post.likes - 1)
      } else {
        this.likedIds.push(id)
        post.likes += 1
      }
      persist(this.$state)
      return { liked: this.likedIds.includes(id), likes: post.likes }
    },
    async fetchLikes(id) {
      try {
        return (await communityApi.fetchPostLikes(id)).data.items || []
      } catch (error) {
        this.apiError = error.message
        return []
      }
    },
    toggleFavorite(id) {
      this.favoriteIds = this.favoriteIds.includes(id)
        ? this.favoriteIds.filter((item) => item !== id)
        : [...this.favoriteIds, id]
      persist(this.$state)
    },
    async addComment(postId, content) {
      const post = this.posts.find((item) => item.id === postId)
      if (!post || !content.trim()) return
      if (this.dataSource === 'api') {
        try {
          const updated = (await communityApi.createComment(postId, { content })).data
          Object.assign(post, updated)
          return
        } catch (error) {
          this.apiError = error.message
        }
      }
      post.comments.push({
        id: `comment-${Date.now()}`,
        author: 'Coffee Reader',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      })
      persist(this.$state)
    },
  },
})
