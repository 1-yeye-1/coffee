import { defineStore } from 'pinia'
import * as booksApi from '@/api/books'
const normalize = (book) => ({ ...book, rating: Number(book.rating) })
export const useBooksStore = defineStore('books', {
  state: () => ({ items: [], currentBook: null, meta: null, loading: false, error: '', source: 'api' }),
  actions: {
    async fetchBooks(params = {}) { this.loading = true; this.error = ''; try { const response = await booksApi.fetchBooks(params); this.items = response.data.map(normalize); this.meta = response.meta } catch (error) { this.items = []; this.error = error.message } finally { this.loading = false } return this.items },
    async fetchBookDetail(slug) { this.loading = true; this.error = ''; try { this.currentBook = normalize((await booksApi.fetchBookDetail(slug)).data) } catch (error) { this.currentBook = null; this.error = error.message } finally { this.loading = false } return this.currentBook },
  },
})
