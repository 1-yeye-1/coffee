import { defineStore } from 'pinia'

import * as booksApi from '@/api/books'
import { books, getBookBySlug } from '@/data/books'

function normalizeBook(book) {
  const local = getBookBySlug(book.slug) || {}
  return { ...local, ...book, rating: Number(book.rating) }
}

function localBooks(params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Number(params.pageSize) || 12)
  const keyword = String(params.keyword || '').trim().toLowerCase()
  let items = books.filter((book) => {
    const matchesKeyword = !keyword || [book.title, book.author, book.summary].join(' ').toLowerCase().includes(keyword)
    const matchesCategory = !params.category || params.category === 'all' || book.category === params.category
    const matchesStatus = !params.status || book.status === params.status
    return matchesKeyword && matchesCategory && matchesStatus
  })
  const sorters = {
    rating_desc: (a, b) => b.rating - a.rating,
    newest: (a, b) => b.year - a.year,
    stock_desc: (a, b) => b.stock - a.stock,
  }
  if (sorters[params.sort]) items = [...items].sort(sorters[params.sort])
  const total = items.length
  return { items: items.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total } }
}

export const useBooksStore = defineStore('books', {
  state: () => ({
    items: [],
    currentBook: null,
    meta: null,
    loading: false,
    error: '',
    source: 'local',
  }),
  actions: {
    async fetchBooks(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const response = await booksApi.fetchBooks(params)
        this.items = response.data.map(normalizeBook)
        this.meta = response.meta
        this.source = 'api'
      } catch (error) {
        const fallback = localBooks(params)
        this.items = fallback.items
        this.meta = fallback.meta
        this.error = error.message
        this.source = 'local'
      } finally {
        this.loading = false
      }
      return this.items
    },
    async fetchBookDetail(slug) {
      this.loading = true
      this.error = ''
      try {
        this.currentBook = normalizeBook((await booksApi.fetchBookDetail(slug)).data)
        this.source = 'api'
      } catch (error) {
        this.currentBook = getBookBySlug(slug) || null
        this.error = error.message
        this.source = 'local'
      } finally {
        this.loading = false
      }
      return this.currentBook
    },
  },
})
