import type { Metadata } from "next";
import { getProducts } from "@/lib/api";
import { ProductCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "产品与服务",
  description: "了解我们的全部产品与服务, 数据来源于业务系统, 实时更新。",
  alternates: {
    canonical: "/products",
    // GEO: 声明 Markdown 版本, 供 AI 搜索引擎发现
    types: { "text/markdown": "/md/products" },
  },
};

export default async function ProductsPage() {
  const { list } = await getProducts({ page_size: 24 }).catch(() => ({ list: [], total: 0 }));

  return (
    <>
      {/* 页面顶部淡渐变条带, 与首页 hero 呼应 */}
      <div className="hero-mesh relative overflow-hidden border-b border-ink-100">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="产品与服务" subtitle="全部在售产品, 数据实时同步" />
        </div>
      </div>
      <section className="container py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {list.length > 0 ? (
            list.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <EmptyState text="暂无产品数据" />
          )}
        </div>
      </section>
    </>
  );
}
