import { createApp } from 'vue'

import App from './App.vue'
import { pinia } from './stores'
import { useAuthStore } from './stores/auth'
import router from './router'
import { installMotionDevTools } from '../../shared/motion/runtime.js'
import './assets/styles/main.css'

const app = createApp(App)
installMotionDevTools()
app.use(pinia)

window.addEventListener('coffee-book:auth-expired', () => {
  useAuthStore(pinia).clearSession()
})

app.use(router).mount('#app')
