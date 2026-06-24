import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: {
      '/uploads': 'http://127.0.0.1:4173',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
    proxy: {
      '/uploads': 'http://127.0.0.1:4173',
    },
  },
  build: {
    outDir: '../../dist/admin',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
