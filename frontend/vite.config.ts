import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
      },
    },
  },
})
