import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端服务地址(qzt-go-server);生产由 nginx 把 /prod-api 转发到 127.0.0.1:9000
// 本机 9000 被其他项目占用时, 可 MALL_API_TARGET=https://admin.devlovecode.com 指向生产走查
const target = process.env.MALL_API_TARGET
const backend = target || 'http://localhost:9000'

const apiProxy = {
  target: backend,
  changeOrigin: true,
  // 本地后端不认识 /prod-api 前缀需 rewrite; 生产 nginx 恰恰按 /prod-api 前缀转发, 必须保留
  ...(target ? {} : { rewrite: (path: string) => path.replace(/^\/prod-api/, '') }),
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
