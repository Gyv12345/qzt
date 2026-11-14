import type { NextConfig } from "next";

/** 本地后端地址(dev rewrites 用;build 期数据抓取同样读 NEXT_PUBLIC_API_BASE)。 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:9000";

const nextConfig: NextConfig = {
  // 完全静态导出: build 产出 out/ 目录, 由 nginx 纯静态托管(不再 pm2 常驻)。
  // 构建期数据抓取走 NEXT_PUBLIC_API_BASE(build env);浏览器侧调用一律走相对路径 /prod-api。
  output: "export",
  // 静态目录输出语义: 每个页面输出为 <route>/index.html, 与 nginx try_files 对齐。
  trailingSlash: true,
  images: {
    // 静态导出不支持 Next 图片优化服务(需要 Node 运行时), 直接输出原图。
    unoptimized: true,
  },
  // 仅 next dev 生效: 把浏览器侧 /prod-api/* 代理到本地后端并剥掉前缀
  // (与 admin/mobile 的 vite proxy 同语义)。next build(output:export)会忽略
  // rewrites(仅告警),生产环境的 /prod-api/* 由 nginx 反代到 9000 并剥前缀。
  async rewrites() {
    return [{ source: "/prod-api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
