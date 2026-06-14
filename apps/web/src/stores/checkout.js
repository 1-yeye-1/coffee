import { defineStore } from 'pinia'

const emptyAddress = () => ({
  recipient: '',
  phone: '',
  region: '',
  detail: '',
})

export const useCheckoutStore = defineStore('checkout', {
  state: () => ({
    deliveryType: 'pickup',
    addressForm: emptyAddress(),
    pickupStore: 'city',
    paymentMethod: 'wechat',
    coupon: 'none',
    pointsUsed: 0,
    orderNote: '',
  }),
  actions: {
    setDeliveryType(type) {
      this.deliveryType = type === 'delivery' ? 'delivery' : 'pickup'
    },
    setAddress(address) {
      this.addressForm = { ...this.addressForm, ...address }
    },
    setPaymentMethod(method) {
      this.paymentMethod = method
    },
    buildCheckoutSnapshot(items) {
      const normalizedItems = items.map((item) => ({
        ...item,
        flavor: [...(item.flavor || [])],
        quantity: Number(item.quantity),
        lineTotal: Number(item.price) * Number(item.quantity),
      }))
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0)
      const couponDiscount =
        this.coupon === 'new-10' && subtotal >= 99
          ? 10
          : this.coupon === 'member-90'
            ? Math.round(subtotal * 0.1 * 100) / 100
            : 0
      const pointsDeduction = Math.min(
        Math.floor(Math.max(0, Number(this.pointsUsed) || 0) / 100),
        20,
        Math.max(0, subtotal - couponDiscount),
      )
      const shippingFee = this.deliveryType === 'delivery' && subtotal < 199 ? 12 : 0
      const total = Math.max(0, subtotal - couponDiscount - pointsDeduction + shippingFee)

      return {
        items: normalizedItems,
        deliveryType: this.deliveryType,
        address:
          this.deliveryType === 'delivery'
            ? { ...this.addressForm }
            : null,
        pickupStore: this.deliveryType === 'pickup' ? this.pickupStore : null,
        paymentMethod: this.paymentMethod,
        coupon: this.coupon,
        pointsUsed: Number(this.pointsUsed) || 0,
        orderNote: this.orderNote.trim(),
        amounts: {
          subtotal,
          discount: couponDiscount,
          pointsDeduction,
          shippingFee,
          total: Math.round(total * 100) / 100,
        },
      }
    },
    reset() {
      this.deliveryType = 'pickup'
      this.addressForm = emptyAddress()
      this.pickupStore = 'city'
      this.paymentMethod = 'wechat'
      this.coupon = 'none'
      this.pointsUsed = 0
      this.orderNote = ''
    },
  },
})
