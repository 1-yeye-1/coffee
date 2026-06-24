import { defineStore } from 'pinia'
import * as booksApi from '@/api/books'
const normalize = (book = {}) => ({
  ...book,
  id: book.id ?? null,
  slug: String(book.slug || book.id || ''),
  title: book.title || '未命名图书',
  author: book.author || '未知作者',
  category: book.category || '阅读',
  rating: Number(book.rating) || 0,
  stock: Number(book.stock) || 0,
  status: book.status || 'unknown',
  coverTone: book.coverTone || 'coffee',
  coverUrl: book.coverUrl || '',
  summary: book.summary || '',
  description: book.description || '暂无内容简介。',
  isbn: book.isbn || '-',
  publisher: book.publisher || '-',
  year: book.year || '-',
  pages: book.pages || '-',
  language: book.language || '-',
  authorBio: book.authorBio || '暂无作者介绍。',
  favorites: Math.max(0, Number(book.favorites ?? book.favoriteCount ?? book.favorite_count) || 0),
  seatId: book.seatId ?? null,
  locationLabel: book.locationLabel || '',
  reviewAverage: Number(book.reviewAverage) || 0,
  reviewCount: Number(book.reviewCount) || 0,
})

function safeSlug(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

export const useBooksStore = defineStore('books', {
  state: () => ({ items: [], currentBook: null, meta: null, loading: false, error: '', source: 'api' }),
  actions: {
    async fetchBooks(params = {}) { this.loading = true; this.error = ''; try { const response = await booksApi.fetchBooks(params); this.items = response.data.map(normalize); this.meta = response.meta } catch (error) { this.items = []; this.error = error.message } finally { this.loading = false } return this.items },
    async fetchBookDetail(slug, options = {}) {
      const normalizedSlug = safeSlug(slug)
      if (!options.silent) this.loading = true
      this.error = ''
      if (!options.silent) this.currentBook = null
      try {
        if (!normalizedSlug || normalizedSlug === '[object Object]' || normalizedSlug === 'undefined') {
          throw Object.assign(new Error('图书链接参数无效'), { status: 400 })
        }
        const response = await booksApi.fetchBookDetail(normalizedSlug)
        this.currentBook = response?.data ? normalize(response.data) : null
      } catch (error) {
        if (!options.silent) this.currentBook = null
        this.error = error.message || '图书详情加载失败'
      } finally {
        if (!options.silent) this.loading = false
      }
      return this.currentBook
    },
    async fetchBookReviews(bookId, params = {}) {
      return booksApi.fetchBookReviews(bookId, params)
    },
    async createBookReview(bookId, payload) {
      return booksApi.createBookReview(bookId, payload)
    },
    async replyBookReview(bookId, reviewId, payload) {
      return booksApi.replyBookReview(bookId, reviewId, payload)
    },
    async likeBookReview(reviewId) {
      return booksApi.likeBookReview(reviewId)
    },
    async unlikeBookReview(reviewId) {
      return booksApi.unlikeBookReview(reviewId)
    },
    async createBookReservation(bookId) {
      return booksApi.createBookReservation(bookId)
    },
    async fetchMyBookReservations() {
      return booksApi.fetchMyBookReservations()
    },
    async cancelBookReservation(id) {
      return booksApi.cancelBookReservation(id)
    },
  },
})
