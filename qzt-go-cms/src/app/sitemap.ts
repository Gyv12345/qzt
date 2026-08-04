import type { MetadataRoute } from "next";
import { getArticles, getProducts } from "@/lib/api";
import { SITE } from "@/lib/site";

/** 动态站点地图: 静态页 + 产品详情 + 文章详情。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/team`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/news`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // GEO: Markdown 入口, 供 AI 搜索引擎发现
    { url: `${base}/llms.txt`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/md`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/products`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/news`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/md/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/md/team`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/md/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [productsRes, newsRes] = await Promise.all([
    getProducts({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
    getArticles({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
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

  return [
    ...staticRoutes,
    ...productRoutes,
    ...articleRoutes,
    ...productMdRoutes,
    ...articleMdRoutes,
  ];
}
