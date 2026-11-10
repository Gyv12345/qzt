/** 站点级常量, 供 SEO 与导航使用。 */

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "河南爱编程官网",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description: "一人软件公司(OPC) · Java 后端 12 年 · Spring 全家桶/微服务/Docker · 全栈定制开发 · 自研开源产品行简",
};

export const NAV = [
  { href: "/", label: "首页" },
  { href: "/services", label: "服务" },
  { href: "/products", label: "产品" },
  { href: "/faq", label: "常见问题" },
  { href: "/partners", label: "合作伙伴" },
  { href: "/team", label: "团队" },
  { href: "/news", label: "新闻动态" },
  { href: "/contact", label: "联系我们" },
] as const;
