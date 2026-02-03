import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routes/routeTree.gen.ts',
      routeFileIgnorePattern: 'routeTree.gen.ts',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
    exclude: ['@tanstack/react-table'], // 排除预构建，使用源码
    force: true, // 强制重新预构建依赖
  },
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: true, // 显示错误覆盖层
    },
  },
  build: {
    // 开发环境下不使用缓存
    sourcemap: true,
  },
})
