import type { Metadata } from "next";
import Link from "next/link";
import { searchArticles } from "@/lib/api";
import { ArticleCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

/**
 * P21 站内搜索页: GET /search?q=xx&page=N。
 * 搜索结果实时(no-store),页面强制动态渲染;不进 sitemap、noindex 防垃圾收录。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "站内搜索",
  description: "搜索站内新闻与文章。",
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const keyword = q.trim();

  const { list, total } = keyword
    ? await searchArticles(keyword, pageNum, 12).catch(() => ({ list: [], total: 0 }))
    : { list: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="站内搜索" subtitle="搜索站内新闻与文章" />
          {/* 原生 GET 表单,无 JS 也能搜 */}
          <form action="/search" className="mt-6 flex max-w-xl gap-2">
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="输入关键词,如「CRM」「审批」"
              aria-label="站内搜索"
              className="w-full rounded-full border border-line bg-raised px-4 py-2.5 text-sm text-strong placeholder:text-muted focus:border-brand-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              搜索
            </button>
          </form>
        </div>
      </div>
      <section className="container py-12">
        {keyword && (
          <p className="mb-6 text-sm text-muted">
            「{keyword}」共 {total} 条结果
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {list.length > 0 ? (
            list.map((a) => <ArticleCard key={a.id} article={a} />)
          ) : keyword ? (
            <EmptyState text={`未找到与「${keyword}」相关的内容`} />
            ) : (
            <EmptyState text="输入关键词开始搜索" />
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-3">
            {pageNum > 1 && (
              <Link
                href={`/search?q=${encodeURIComponent(keyword)}&page=${pageNum - 1}`}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted no-underline hover:bg-raised hover:text-strong"
              >
                上一页
              </Link>
            )}
            <span className="px-2 py-2 text-sm text-muted">
              {pageNum} / {totalPages}
</span>
            {pageNum < totalPages && (
              <Link
                href={`/search?page=${pageNum + 1}&q=${encodeURIComponent(keyword)}`}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted no-underline hover:bg-raised hover:text-strong"
              >
                下一页
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}