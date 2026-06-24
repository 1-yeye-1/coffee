import { defineStore } from 'pinia'
import * as productsApi from '@/api/products'
const normalize = (product = {}) => ({
  ...product,
  price: Number(product.price),
  originalPrice: product.originalPrice === null ? null : Number(product.originalPrice),
  flavor: Array.isArray(product.flavor) ? product.flavor : [],
  reviewAverage: Number(product.reviewAverage) || 0,
  reviewCount: Number(product.reviewCount) || 0,
})
export const useProductsStore = defineStore('products', {
  state: () => ({ items: [], currentProduct: null, meta: null, loading: false, error: '', source: 'api' }),
  actions: {
    async fetchProducts(params = {}) { this.loading = true; this.error = ''; try { const response = await productsApi.fetchProducts(params); this.items = response.data.map(normalize); this.meta = response.meta } catch (error) { this.items = []; this.error = error.message } finally { this.loading = false } return this.items },
    async fetchProductDetail(slug) { this.loading = true; this.error = ''; try { this.currentProduct = normalize((await productsApi.fetchProductDetail(slug)).data) } catch (error) { this.currentProduct = null; this.error = error.message } finally { this.loading = false } return this.currentProduct },
    async fetchProductReviews(productId, params = {}) { return productsApi.fetchProductReviews(productId, params) },
    async createProductReview(productId, payload) { return productsApi.createProductReview(productId, payload) },
    async replyProductReview(productId, reviewId, payload) { return productsApi.replyProductReview(productId, reviewId, payload) },
    async likeProductReview(reviewId) { return productsApi.likeProductReview(reviewId) },
    async unlikeProductReview(reviewId) { return productsApi.unlikeProductReview(reviewId) },
  },
})
