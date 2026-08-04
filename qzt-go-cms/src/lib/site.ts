/** 站点级常量, 供 SEO 与导航使用。 */

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "企业官网",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description: "企业级业务管理平台 · 产品 · 团队 · 合作伙伴",
};

export const NAV = [
  { href: "/", label: "首页" },
  { href: "/products", label: "产品" },
  { href: "/partners", label: "合作伙伴" },
  { href: "/team", label: "团队" },
  { href: "/news", label: "新闻动态" },
  { href: "/about", label: "关于我们" },
] as const;
