import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // === 图片优化（2C2G RDS 足够支持）===
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // === 实验性功能 ===
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // === 压缩 ===
  compress: true,

  // === 性能优化 ===
  productionBrowserSourceMaps: false,

  // === 日志优化 ===
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
