import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 后端(qzt-go-server)图片/文件走 /api/upload, 如需显示外部图片可在此配置 remotePatterns。
  // images: { remotePatterns: [...] }
};

export default nextConfig;
