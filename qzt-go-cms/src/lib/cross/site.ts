/**
 * 跨境主题站点级常量, 供 SEO(canonical/JSON-LD/sitemap)与导航使用。
 * 并入说明(2026-11): storefront 并入 cms 后, 官网与跨境树同项目构建,
 * 跨境域名/站名改用独立变量, 与官网的同名变量区分, 防止两棵树互相串值:
 * - NEXT_PUBLIC_STOREFRONT_SITE_URL(生产=storefront.devlovecode.com)
 *   ↔ 官网的 NEXT_PUBLIC_SITE_URL(devlovecode.com)
 * - NEXT_PUBLIC_STOREFRONT_SITE_NAME(默认 "Xingjian Store")
 *   ↔ 官网的 NEXT_PUBLIC_SITE_NAME
 * 两棵树的 canonical/hreflang/sitemap 各取所需, SEO 连续性不受影响。
 */
export const SITE = {
  name: process.env.NEXT_PUBLIC_STOREFRONT_SITE_NAME ?? "Xingjian Store",
  url: (
    process.env.NEXT_PUBLIC_STOREFRONT_SITE_URL ?? "http://localhost:3200"
  ).replace(/\/$/, ""),
  description:
    "Xingjian cross-border storefront — factory-direct products, transparent quotes, English-first service.",
};

/** 品牌 JSON-LD 与页脚统一使用。 */
export const BRAND = "Xingjian";
