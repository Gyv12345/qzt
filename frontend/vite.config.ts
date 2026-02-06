import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
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
});
