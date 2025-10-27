import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js'
  },
  server: {
    port: 3000,
    proxy: {
      '/api/auth/login': {
        target: 'http://localhost:8789',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://localhost:8789',
        changeOrigin: true,
      }
    }
  }
})