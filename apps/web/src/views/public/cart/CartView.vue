<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { BaseBadge, BaseButton, BaseCard, EmptyState } from '@/components/base'
import { products } from '@/data/products'
import { useCartStore } from '@/stores/cart'
import '@/assets/styles/pages/commerce.css'

const router = useRouter()
const cartStore = useCartStore()
const recommendations = computed(() =>
  products.filter((product) => product.stock > 0 && !cartStore.items.some((item) => item.id === product.id)).slice(0, 3),
)

function addRecommendation(product) {
  cartStore.addItem(product, 1)
}

onMounted(() => cartStore.fetchCart())
</script>

<template>
  <div class="commerce-page cb-fade-in">
    <section class="commerce-hero">
      <div class="cb-container commerce-hero__inner">
        <span class="section-eyebrow">Coffee Book Cart</span>
        <h1 class="page-title">我的购物车</h1>
        <p class="page-subtitle">确认你想带回家的咖啡香气与阅读灵感。</p>
      </div>
    </section>

    <main class="cb-container commerce-content">
      <template v-if="cartStore.items.length">
        <div class="commerce-layout">
          <section class="commerce-panel" aria-labelledby="cart-list-title">
            <div class="commerce-panel__header">
              <div>
                <h2 id="cart-list-title">购物车商品</h2>
                <p class="text-muted">已选择 {{ cartStore.selectedItems.length }} 种商品</p>
              </div>
              <BaseButton variant="ghost" size="sm" @click="cartStore.clearCart()">清空购物车</BaseButton>
            </div>

            <div class="cart-list__header">
              <label class="cart-select">
                <input
                  type="checkbox"
                  :checked="cartStore.allSelected"
                  aria-label="全选购物车商品"
                  @change="cartStore.toggleSelectAll()"
                />
                全选
              </label>
              <span class="text-muted">共 {{ cartStore.itemCount }} 件</span>
            </div>

            <div class="cart-list">
              <article v-for="item in cartStore.items" :key="item.id" class="cart-item">
                <label class="cart-select">
                  <input
                    type="checkbox"
                    :checked="cartStore.selectedIds.includes(item.id)"
                    :aria-label="`选择${item.name}`"
                    @change="cartStore.toggleSelect(item.id)"
                  />
                </label>

                <div class="cart-item__main">
                  <div class="commerce-product">
                    <div class="commerce-product__visual" aria-hidden="true" />
                    <div class="commerce-product__copy">
                      <h3>{{ item.name }}</h3>
                      <p>{{ item.category }} · {{ item.flavor.join(' · ') }}</p>
                      <div class="cb-cluster">
                        <BaseBadge :variant="item.stock > 0 ? 'success' : 'danger'">{{ item.status }}</BaseBadge>
                        <strong>¥{{ item.price }}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="cart-item__controls">
                    <div class="quantity-stepper" :aria-label="`${item.name}数量`">
                      <button
                        type="button"
                        aria-label="减少数量"
                        :disabled="item.quantity <= 1"
                        @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
                      >
                        −
                      </button>
                      <span aria-live="polite">{{ item.quantity }}</span>
                      <button
                        type="button"
                        aria-label="增加数量"
                        :disabled="item.quantity >= item.stock"
                        @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
                      >
                        ＋
                      </button>
                    </div>
                    <div class="cart-item__subtotal">
                      <span>小计</span>
                      <strong>¥{{ item.price * item.quantity }}</strong>
                    </div>
                    <BaseButton variant="ghost" size="sm" @click="cartStore.removeItem(item.id)">删除</BaseButton>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <aside class="summary-card" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title">订单摘要</h2>
            <div class="summary-card__items">
              <div class="summary-row"><span>商品件数</span><strong>{{ cartStore.selectedItemCount }}</strong></div>
              <div class="summary-row"><span>商品总价</span><strong>¥{{ cartStore.subtotal }}</strong></div>
              <div class="summary-row"><span>会员优惠</span><strong>-¥{{ cartStore.discount }}</strong></div>
              <div class="summary-row"><span>积分抵扣</span><strong>-¥{{ cartStore.pointsDeduction }}</strong></div>
              <div class="summary-row"><span>配送费</span><strong>¥{{ cartStore.shippingFee }}</strong></div>
            </div>
            <div class="summary-row summary-row--total"><span>实付金额</span><strong>¥{{ cartStore.total }}</strong></div>
            <BaseButton
              size="lg"
              :disabled="!cartStore.selectedItems.length"
              @click="router.push('/checkout')"
            >
              去结算
            </BaseButton>
            <small class="text-muted">结算页可继续选择配送、优惠券和积分。</small>
          </aside>
        </div>
      </template>

      <template v-else>
        <EmptyState
          title="购物车还是空的"
          description="去咖啡商城挑选一杯风味，或者发现一份阅读礼物。"
          action-label="去逛咖啡商城"
          @action="router.push('/coffee')"
        >
          <template #icon>◇</template>
        </EmptyState>

        <section class="cb-section">
          <span class="section-eyebrow">You May Also Like</span>
          <h2 class="section-title">为你推荐</h2>
          <div class="recommendation-grid">
            <BaseCard v-for="product in recommendations" :key="product.id" class="recommendation-card" variant="hover">
              <div class="commerce-product__visual recommendation-card__visual" aria-hidden="true" />
              <BaseBadge variant="neutral">{{ product.category }}</BaseBadge>
              <h3>{{ product.name }}</h3>
              <p class="text-muted">{{ product.flavor.join(' · ') }}</p>
              <div class="recommendation-card__footer">
                <strong>¥{{ product.price }}</strong>
                <BaseButton size="sm" @click="addRecommendation(product)">加入购物车</BaseButton>
              </div>
            </BaseCard>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
