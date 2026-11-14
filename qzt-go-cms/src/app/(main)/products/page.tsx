import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductCategories, getProducts } from "@/lib/api";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";
import ProductsBrowser from "./ProductsBrowser";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "产品与服务",
  description: "自研产品与交付案例: 行简开源一体化管理平台与精选软件开发案例, 数据来源于业务系统, 实时更新。",
  alternates: {
    canonical: "/products",
    // GEO: 声明 Markdown 版本, 供 AI 搜索引擎发现
    types: { "text/markdown": "/md/products" },
  },
};

export default async function ProductsPage() {
  // SSG: 构建期全量取产品(≤100)与分类树嵌入静态页, 分类筛选为纯客户端(静态导出无服务端运行时)。
  // 两个接口失败各自降级(空列表/空分类), 不阻断构建。
  const [{ list }, categories] = await Promise.all([
    getProducts({ page_size: 100 }).catch(() => ({ list: [], total: 0 })),
    getProductCategories(),
  ]);

  return (
    <>
      {/* 页面顶部淡渐变条带, 与首页 hero 呼应 */}
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="产品与服务" subtitle="自研产品与精选交付案例, 数据实时同步" />
        </div>
      </div>
      {/* useSearchParams 需要静态预渲染时有 Suspense 边界(静态导出兼容写法) */}
      <Suspense fallback={<section className="container py-16" aria-busy="true" />}>
        <ProductsBrowser products={list} categories={categories} />
      </Suspense>

      {/* 产品集合结构化数据: 让 AI 引擎一次性获取全部在售产品清单与入口 */}
      {list.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "产品与服务",
              numberOfItems: list.length,
              itemListElement: list.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "Product",
                  name: p.name,
                  url: `${SITE.url}/products/${p.id}`,
                  ...(p.category && { category: p.category }),
                },
              })),
            }),
          }}
        />
      )}
    </>
  );
}
