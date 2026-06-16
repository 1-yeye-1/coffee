import { defineStore } from 'pinia'

import * as cartApi from '@/api/cart'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'coffee-book-cart'
const defaultBrewMethod = 'barista'

function isCoffeeProduct(product) {
  return product?.productType === 'coffee' && product?.supportsBrewMethod !== false
}

function normalizeBrewMethod(product, brewMethod) {
  if (!isCoffeeProduct(product)) return null
  return brewMethod === 'self_grind' ? 'self_grind' : defaultBrewMethod
}

function cartLineId(productId, brewMethod) {
  return `${productId}:${brewMethod || 'none'}`
}

function readStoredCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      items: Array.isArray(stored.items) ? stored.items : [],
      selectedIds: Array.isArray(stored.selectedIds) ? stored.selectedIds : [],
    }
  } catch {
    return { items: [], selectedIds: [] }
  }
}

function persistCart(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      items: state.items,
      selectedIds: state.selectedIds,
    }),
  )
}

export const useCartStore = defineStore('cart', {
  state: () => ({ ...readStoredCart(), loading: false, error: '', source: 'local' }),
  getters: {
    selectedItems: (state) => state.items.filter((item) => state.selectedIds.includes(item.id)),
    itemCount: (state) =>
      state.items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    selectedItemCount() {
      return this.selectedItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0,
      )
    },
    subtotal() {
      return this.selectedItems.reduce(
        (total, item) => total + Number(item.price) * Number(item.quantity),
        0,
      )
    },
    discount() {
      return this.subtotal >= 199 ? 15 : this.subtotal >= 99 ? 5 : 0
    },
    pointsDeduction: () => 0,
    shippingFee: () => 0,
    total() {
      return Math.max(0, this.subtotal - this.discount - this.pointsDeduction + this.shippingFee)
    },
    allSelected(state) {
      return state.items.length > 0 && state.items.every((item) => state.selectedIds.includes(item.id))
    },
  },
  actions: {
    applyRemoteCart(cart) {
      this.items = cart.items.map((item) => ({
        id: item.id, productId: item.productId, cartItemId: item.id, slug: item.slug, name: item.name,
        category: item.category, productType: item.productType, supportsBrewMethod: item.supportsBrewMethod,
        brewMethod: item.brewMethod || null, price: Number(item.price), originalPrice: item.originalPrice,
        stock: Number(item.stock), status: item.status, origin: item.origin,
        flavor: [...(item.flavor || [])], tone: item.tone, quantity: Number(item.quantity),
      }))
      this.selectedIds = cart.items.filter((item) => item.selected).map((item) => item.id)
      this.source = 'api'
    },
    async fetchCart() {
      if (!useAuthStore().isAuthenticated) return this.items
      this.loading = true
      try { this.applyRemoteCart((await cartApi.getCart()).data); this.error = '' }
      catch (error) { this.error = error.message; this.source = 'local' }
      finally { this.loading = false }
      return this.items
    },
    async addItem(product, quantity = 1, options = {}) {
      if (!product || Number(product.stock) <= 0) return
      const brewMethod = normalizeBrewMethod(product, options.brewMethod)
      const productId = product.productId || product.id
      if (useAuthStore().isAuthenticated) {
        try { this.applyRemoteCart((await cartApi.addCartItem(productId, quantity, { brewMethod })).data); this.error = ''; return }
        catch (error) { this.error = error.message; this.source = 'local' }
      }
      const amount = Math.max(1, Number(quantity) || 1)
      const lineId = cartLineId(productId, brewMethod)
      const existing = this.items.find((item) => item.id === lineId)

      if (existing) {
        existing.quantity = Math.min(Number(product.stock), existing.quantity + amount)
      } else {
        this.items.push({
          id: lineId,
          productId,
          slug: product.slug,
          name: product.name,
          category: product.category,
          productType: product.productType,
          supportsBrewMethod: product.supportsBrewMethod,
          brewMethod,
          price: Number(product.price),
          originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
          stock: Number(product.stock),
          status: product.status,
          origin: product.origin,
          flavor: [...product.flavor],
          tone: product.tone,
          quantity: Math.min(Number(product.stock), amount),
        })
      }

      if (!this.selectedIds.includes(lineId)) this.selectedIds.push(lineId)
      persistCart(this.$state)
    },
    async removeItem(productId) {
      const remoteItem = this.items.find((item) => item.id === productId)
      if (useAuthStore().isAuthenticated && remoteItem?.cartItemId) {
        try { this.applyRemoteCart((await cartApi.removeCartItem(remoteItem.cartItemId)).data); this.error = ''; return }
        catch (error) { this.error = error.message }
      }
      this.items = this.items.filter((item) => item.id !== productId)
      this.selectedIds = this.selectedIds.filter((id) => id !== productId)
      persistCart(this.$state)
    },
    removeItems(productIds) {
      const ids = new Set(productIds)
      this.items = this.items.filter((item) => !ids.has(item.id))
      this.selectedIds = this.selectedIds.filter((id) => !ids.has(id))
      persistCart(this.$state)
    },
    async updateQuantity(productId, quantity) {
      const item = this.items.find((entry) => entry.id === productId)
      if (!item) return
      if (useAuthStore().isAuthenticated && item.cartItemId) {
        try { this.applyRemoteCart((await cartApi.updateCartItem(item.cartItemId, { quantity })).data); this.error = ''; return }
        catch (error) { this.error = error.message }
      }
      item.quantity = Math.min(item.stock, Math.max(1, Number(quantity) || 1))
      persistCart(this.$state)
    },
    async clearCart() {
      if (useAuthStore().isAuthenticated) {
        try { this.applyRemoteCart((await cartApi.clearCart()).data); this.error = ''; return }
        catch (error) { this.error = error.message }
      }
      this.items = []
      this.selectedIds = []
      persistCart(this.$state)
    },
    async toggleSelect(id) {
      const item = this.items.find((entry) => entry.id === id)
      if (useAuthStore().isAuthenticated && item?.cartItemId) {
        try { this.applyRemoteCart((await cartApi.updateCartItem(item.cartItemId, { selected: !this.selectedIds.includes(id) })).data); this.error = ''; return }
        catch (error) { this.error = error.message }
      }
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((selectedId) => selectedId !== id)
        : [...this.selectedIds, id]
      persistCart(this.$state)
    },
    async toggleSelectAll() {
      const selected = !this.allSelected
      if (useAuthStore().isAuthenticated && this.items.every((item) => item.cartItemId)) {
        try {
          for (const item of this.items) await cartApi.updateCartItem(item.cartItemId, { selected })
          await this.fetchCart(); return
        } catch (error) { this.error = error.message }
      }
      this.selectedIds = selected ? this.items.map((item) => item.id) : []
      persistCart(this.$state)
    },
  },
})
