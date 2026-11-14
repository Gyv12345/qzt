import type { MetadataRoute } from "next";
import { getArticles, getProducts } from "@/lib/api";
import { SITE } from "@/lib/site";
// 跨境主题(storefront 并入)的条目: 域名用 NEXT_PUBLIC_STOREFRONT_SITE_URL
import { locales } from "@/i18n";
import { getStorefrontProducts, safe } from "@/lib/cross/api";
import { SITE as CROSS_SITE } from "@/lib/cross/site";

/** 静态导出(output:export)要求元文件路由显式声明静态。 */
export const dynamic = "force-static";

/** 动态站点地图: 静态页 + 产品详情 + 文章详情。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/services/custom-software`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services/miniprogram`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services/app`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/team`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/news`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // GEO: Markdown 入口, 供 AI 搜索引擎发现
    { url: `${base}/llms.txt`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/md`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/services`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/md/products`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/md/news`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/md/team`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/md/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [productsRes, newsRes] = await Promise.all([
    getProducts({ page_size: 100 }).catch(() => ({ list: [], total: 0 })),
    getArticles({ page_size: 100 }).catch(() => ({ list: [], total: 0 })),
  ]);

  const productRoutes: MetadataRoute.Sitemap = productsRes.list.map((p) => ({
    url: `${base}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const articleRoutes: MetadataRoute.Sitemap = newsRes.list
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${base}/news/${a.slug}`,
      lastModified: a.created_at ? new Date(a.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  // GEO: 详情页的 Markdown 版本
  const productMdRoutes: MetadataRoute.Sitemap = productsRes.list.map((p) => ({
    url: `${base}/md/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const articleMdRoutes: MetadataRoute.Sitemap = newsRes.list
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${base}/md/news/${a.slug}`,
      lastModified: a.created_at ? new Date(a.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  // ── 跨境主题条目(storefront 并入, 原独立站 sitemap 原样保留) ──
  // 静态页 + 产品详情(slug), 每条带 hreflang alternates(en/zh)。
  // 提供 alternates.languages 后, Next 生成 sitemap.xml 时会自动补
  // xhtml 命名空间(xmlns:xhtml)与 xhtml:link alternate 节点。
  const crossBase = CROSS_SITE.url;

  const crossStaticPaths = ["", "/products", "/cart", "/inquiry", "/about"];

  // 产品 slug 以 en 目录为准; 后端不可达 → 只出静态页, 不炸 sitemap
  const crossProducts = await safe(getStorefrontProducts("en"), []);
  const crossProductPaths = crossProducts.map(
    (p) => `/products/${encodeURIComponent(p.slug)}`,
  );

  const crossPaths = [...crossStaticPaths, ...crossProductPaths];

  const crossRoutes: MetadataRoute.Sitemap = crossPaths.map((path) => ({
    url: `${crossBase}/en${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/products" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/products" ? 0.9 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [l, `${crossBase}/${l}${path}`]),
      ),
    },
  }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...articleRoutes,
    ...productMdRoutes,
    ...articleMdRoutes,
    ...crossRoutes,
  ];
}
