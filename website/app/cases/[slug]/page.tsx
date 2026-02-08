import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getContentBySlug, getCases } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Building2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

// 静态生成所有案例路径
export async function generateStaticParams() {
  try {
    const { data: cases } = await getCases({ pageSize: 100 });
    return cases.slice(0, 10).map((item: { slug: string }) => ({
      slug: item.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const caseStudy = await getContentBySlug(slug);
    return {
      title: `${caseStudy.metaTitle || caseStudy.title} - 企智通`,
      description: caseStudy.metaDesc || caseStudy.excerpt,
    };
  } catch {
    return {
      title: "案例详情 - 企智通",
    };
  }
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let caseStudy;
  try {
    caseStudy = await getContentBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <article className="mx-auto max-w-4xl px-6 lg:px-8">
          {/* 案例头部 */}
          <header className="mb-8">
            <div className="mb-4">
              <Badge variant="outline" className="text-xs">
                客户案例
              </Badge>
            </div>
            <h1 className="text-4xl font-heading font-bold md:text-5xl">
              {caseStudy.title}
            </h1>

            {/* 元信息 */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {caseStudy.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={caseStudy.publishedAt}>
                    {new Date(caseStudy.publishedAt).toLocaleDateString(
                      "zh-CN",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </time>
                </div>
              )}
              {caseStudy.author && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{caseStudy.author.username}</span>
                </div>
              )}
            </div>

            {/* 标签 */}
            {caseStudy.tags && caseStudy.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {caseStudy.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* 案例摘要 */}
          {caseStudy.excerpt && (
            <p className="text-xl text-muted-foreground">{caseStudy.excerpt}</p>
          )}

          {/* 封面图 */}
          {caseStudy.coverImage && (
            <div className="my-8 aspect-video w-full overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={caseStudy.coverImage}
                alt={caseStudy.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* 案例内容 */}
          <div
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: caseStudy.content }}
          />

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-muted/50 p-8 text-center">
            <h3 className="text-2xl font-heading font-bold">
              想要实现类似的成功？
            </h3>
            <p className="mt-2 text-muted-foreground">
              联系我们，了解企智通如何帮助您的业务增长
            </p>
            <a
              href="/contact"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              联系销售团队
            </a>
          </div>

          {/* 文章元数据 */}
          <footer className="mt-12 border-t pt-8 text-sm text-muted-foreground">
            <p>
              发布于{" "}
              {new Date(caseStudy.createdAt).toLocaleDateString("zh-CN")}
              {caseStudy.updatedAt !== caseStudy.createdAt &&
                ` · 更新于 ${new Date(caseStudy.updatedAt).toLocaleDateString("zh-CN")}`}
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
