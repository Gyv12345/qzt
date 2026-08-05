import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端服务地址(qzt-go-server)
const backend = 'http://localhost:9000'

// 所有 API 统一走 /prod-api 前缀,与前端页面路由完全隔离
const apiProxy = {
  target: backend,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/prod-api/, ''),
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/prod-api': apiProxy,
    },
  },
  preview: {
    proxy: {
      '/prod-api': apiProxy,
    },
  },
})
