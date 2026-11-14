import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import SearchClient from "./SearchClient";

/**
 * P21 站内搜索页(静态导出形态): 页面本体纯静态壳。
 * 关键词与结果由浏览器侧 SearchClient 读取 query 并直查 /prod-api/cms/public/search;
 * 不进 sitemap、noindex 防垃圾收录。
 */
export const metadata: Metadata = {
  title: "站内搜索",
  description: "搜索站内新闻与文章。",
  robots: { index: false, follow: false },
};

export default function SearchPage() {
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
      {/* useSearchParams 需要静态预渲染时有 Suspense 边界 */}
      <Suspense fallback={<section className="container py-12" aria-busy="true" />}>
        <SearchClient />
      </Suspense>
    </>
  );
}
