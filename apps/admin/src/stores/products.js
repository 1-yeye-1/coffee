import { defineStore } from 'pinia'

import * as productsApi from '@/api/products'
import { getProductBySlug, products } from '@/data/products'

function normalizeProduct(product) {
  const local = getProductBySlug(product.slug) || {}
  return {
    ...local,
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice === null ? null : Number(product.originalPrice),
    flavor: Array.isArray(product.flavor) ? product.flavor : [],
  }
}

function localProducts(params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Number(params.pageSize) || 12)
  const keyword = String(params.keyword || '').trim().toLowerCase()
  let items = products.filter((product) => {
    const matchesKeyword = !keyword || [product.name, product.origin, product.description, product.flavor.join(' ')].join(' ').toLowerCase().includes(keyword)
    const matchesCategory = !params.category || params.category === 'all' || product.category === params.category
    const matchesStatus = !params.status || product.status === params.status
    return matchesKeyword && matchesCategory && matchesStatus
  })
  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    sales_desc: (a, b) => b.sales - a.sales,
    newest: (a, b) => b.id - a.id,
  }
  if (sorters[params.sort]) items = [...items].sort(sorters[params.sort])
  const total = items.length
  return { items: items.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total } }
}

export const useProductsStore = defineStore('products', {
  state: () => ({
    items: [],
    currentProduct: null,
    meta: null,
    loading: false,
    error: '',
    source: 'local',
  }),
  actions: {
    async fetchProducts(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const response = await productsApi.fetchProducts(params)
        this.items = response.data.map(normalizeProduct)
        this.meta = response.meta
        this.source = 'api'
      } catch (error) {
        const fallback = localProducts(params)
        this.items = fallback.items
        this.meta = fallback.meta
        this.error = error.message
        this.source = 'local'
      } finally {
        this.loading = false
      }
      return this.items
    },
    async fetchProductDetail(slug) {
      this.loading = true
      this.error = ''
      try {
        this.currentProduct = normalizeProduct((await productsApi.fetchProductDetail(slug)).data)
        this.source = 'api'
      } catch (error) {
        this.currentProduct = getProductBySlug(slug) || null
        this.error = error.message
        this.source = 'local'
      } finally {
        this.loading = false
      }
      return this.currentProduct
    },
  },
})
