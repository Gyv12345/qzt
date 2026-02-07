import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCases, type PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "客户案例 - 企账通",
  description: "了解我们如何帮助客户实现业务增长",
};

interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentType: string;
  coverImage?: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string; color?: string }>;
  author?: { id: string; username: string; avatar?: string };
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let cases: CaseStudy[] = [];
  let total = 0;
  let totalPages = 1;

  try {
    const result = (await getCases({
      page,
      pageSize: 12,
    })) as PaginatedResponse<CaseStudy>;
    cases = result.data;
    total = result.total;
    totalPages = result.totalPages;
  } catch (error) {
    console.error("Failed to fetch cases:", error);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-heading font-bold md:text-4xl">
              客户案例
            </h1>
            <p className="mt-4 text-muted-foreground">
              了解我们如何帮助客户实现业务增长
            </p>
          </div>

          {cases.length > 0 ? (
            <>
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {cases.map((item) => (
                  <ArticleCard key={item.id} article={item as any} />
                ))}
              </div>

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {page > 1 && (
                    <a
                      href={`/cases?page=${page - 1}`}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      上一页
                    </a>
                  )}
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  {page < totalPages && (
                    <a
                      href={`/cases?page=${page + 1}`}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      下一页
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-12 text-center">
              <p className="text-muted-foreground">
                暂无案例，敬请期待更多精彩内容。
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
