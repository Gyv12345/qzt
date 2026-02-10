import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@qzt/shared-types": path.resolve(
        __dirname,
        "../packages/shared-types/src",
      ),
    },
  },
  server: {
    port: 3456,
    proxy: {
      // /api 前缀的请求代理到后端，并去掉 /api 前缀
      "/api": {
        target: "http://localhost:7890",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    // 生产环境优化配置
    minify: mode === "production" ? "terser" : "esbuild",
    terserOptions:
      mode === "production"
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.info", "console.debug"],
            },
            format: {
              comments: false,
            },
          }
        : undefined,
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库单独打包
          "react-vendor": ["react", "react-dom"],
          // 路由和状态管理
          "router-vendor": ["@tanstack/react-router", "@tanstack/react-query"],
          // UI 组件库
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          // 图表和富文本编辑器
          "editor-vendor": ["@tiptap/react", "@tiptap/starter-kit", "recharts"],
          // 工具库
          "utils-vendor": ["axios", "date-fns", "zod"],
        },
        // 资源文件命名带 hash，便于长期缓存
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // chunk 大小警告阈值 (KB)
    chunkSizeWarningLimit: 1000,
    // CSS 代码分割
    cssCodeSplit: true,
    // 设置 source map 类型
    sourcemap: mode === "development",
  },
  // 依赖预构建优化
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-router",
      "@tanstack/react-query",
    ],
  },
}));
