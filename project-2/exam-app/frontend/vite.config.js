import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth':    { target: 'http://auth-service:8000',   changeOrigin: true },
      '/api/exams':   { target: 'http://exam-service:8000',   changeOrigin: true },
      '/api/results': { target: 'http://result-service:8000', changeOrigin: true },
    }
  }
})

