import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端服务地址(qzt-go-server);生产由 nginx 把 /prod-api 转发到 127.0.0.1:9000
const backend = 'http://localhost:9000'

const apiProxy = {
  target: backend,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/prod-api/, ''),
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
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
