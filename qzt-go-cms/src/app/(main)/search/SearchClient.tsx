"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArticleCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 12;

/**
 * 客户端站内搜索结果区: 静态导出后无服务端渲染,
 * 关键词/页码从 location.search 读取, 直查同源 /prod-api/cms/public/search
 * (nginx 反代到后端,零域名硬编码)。请求失败降级为友好空态,不抛错。
 */
export default function SearchClient() {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // 读取 URL query(静态导出无服务端 searchParams prop);popstate 兜底前进/后退
  useEffect(() => {
    const read = () => {
      const sp = new URLSearchParams(window.location.search);
      setKeyword((sp.get("q") ?? "").trim());
      setPage(Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  // 关键词或页码变化时拉取结果
  useEffect(() => {
    if (!keyword) {
      setList([]);
      setTotal(0);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const url = `/prod-api/cms/public/search?q=${encodeURIComponent(keyword)}&page=${page}&page_size=${PAGE_SIZE}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`搜索请求失败: ${res.status}`);
        const body = await res.json();
        if (body.code !== 0) throw new Error(body.msg || "搜索失败");
        return body.data as { list: Article[]; total: number };
      })
      .then((data) => {
        if (cancelled) return;
        setList(data.list ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setList([]);
          setTotal(0);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasKeyword = keyword !== "";

  return (
    <section className="container py-12">
      {hasKeyword && (
        <p className="mb-6 text-sm text-muted">
          「{keyword}」共 {total} 条结果{loading ? "（搜索中…）" : ""}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {list.length > 0 ? (
          list.map((a) => <ArticleCard key={a.id} article={a} />)
        ) : hasKeyword ? (
          <EmptyState
            text={
              loading
                ? "搜索中…"
                : failed
                  ? "搜索服务暂时不可用,请稍后重试"
                  : `未找到与「${keyword}」相关的内容`
            }
          />
        ) : (
          <EmptyState text="输入关键词开始搜索" />
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/search/?q=${encodeURIComponent(keyword)}&page=${page - 1}`}
              className="rounded-full border border-line px-4 py-2 text-sm text-muted no-underline hover:bg-raised hover:text-strong"
            >
              上一页
            </Link>
          )}
          <span className="px-2 py-2 text-sm text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/search/?page=${page + 1}&q=${encodeURIComponent(keyword)}`}
              className="rounded-full border border-line px-4 py-2 text-sm text-muted no-underline hover:bg-raised hover:text-strong"
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
