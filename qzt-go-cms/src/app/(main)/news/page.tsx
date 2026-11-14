import type { Metadata } from "next";
import { getArticles } from "@/lib/api";
import { ArticleCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "新闻动态",
  description: "企业最新资讯与公告, 内容来源于 CMS 系统, 实时更新。",
  alternates: {
    canonical: "/news",
    types: { "text/markdown": "/md/news" },
  },
};

export default async function NewsPage() {
  const { list } = await getArticles({ page_size: 24 }).catch(() => ({ list: [], total: 0 }));

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="新闻动态" subtitle="最新资讯与公告" />
        </div>
      </div>
      <section className="container py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {list.length > 0 ? (
            list.map((a) => <ArticleCard key={a.id} article={a} />)
          ) : (
            <EmptyState text="暂无新闻" />
          )}
        </div>
      </section>
    </>
  );
}
