import { createApp } from 'vue'

import App from './App.vue'
import { pinia } from './stores'
import { useAuthStore } from './stores/auth'
import { useCartStore } from './stores/cart'
import router from './router'
import { installMotionDevTools } from '../../shared/motion/runtime.js'
import { installGlobalErrorHandlers } from '../../shared/error-handlers.js'
import './assets/styles/main.css'

const app = createApp(App)
installMotionDevTools()
app.use(pinia)
installGlobalErrorHandlers(app, router, 'web')

window.addEventListener('coffee-book:auth-expired', () => {
  useAuthStore(pinia).clearSession()
})
window.addEventListener('coffee-book:auth-login', () => useCartStore(pinia).fetchCart())
window.addEventListener('coffee-book:auth-logout', () => useCartStore(pinia).$reset())

app.use(router).mount('#app')
