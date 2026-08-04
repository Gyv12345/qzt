import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端服务地址(qzt-go-server)
const backend = 'http://localhost:9000'

// 前端路由(/system/user 等)与后端 API(/system/users 等)前缀相同,
// 浏览器页面导航(Accept: text/html)交给 SPA fallback,XHR/fetch 才代理到后端。
const apiProxy = {
  target: backend,
  changeOrigin: true,
  bypass(req: import('node:http').IncomingMessage) {
    if (req.headers.accept?.includes('text/html')) {
      return req.url
    }
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiProxy,
      '/system': apiProxy,
      '/crm': apiProxy,
      '/cms': apiProxy,
      '/approval': apiProxy,
      '/enterprise': apiProxy,
      '/hrm': apiProxy,
      '/psi': apiProxy,
      '/finance': apiProxy,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxy,
      '/system': apiProxy,
      '/crm': apiProxy,
      '/cms': apiProxy,
      '/approval': apiProxy,
      '/enterprise': apiProxy,
      '/hrm': apiProxy,
      '/psi': apiProxy,
      '/finance': apiProxy,
    },
  },
})
