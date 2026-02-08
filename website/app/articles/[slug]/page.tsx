import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getContentBySlug, getArticles } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, User, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600; // ISR: 每小时重新生成

// 静态生成所有文章路径
export async function generateStaticParams() {
  try {
    const { data: articles } = await getArticles({ pageSize: 100 });
    return articles.slice(0, 10).map((article: { slug: string }) => ({
      slug: article.slug,
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
    const article = await getContentBySlug(slug);
    return {
      title: `${article.metaTitle || article.title} - 企智通`,
      description: article.metaDesc || article.excerpt,
      keywords: article.keywords,
    };
  } catch {
    return {
      title: "文章详情 - 企智通",
    };
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let article;
  try {
    article = await getContentBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <article className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* 文章头部 */}
          <header className="mb-8">
            <h1 className="text-4xl font-heading font-bold md:text-5xl">
              {article.title}
            </h1>

            {/* 元信息 */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {article.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              )}
              {article.author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{article.author.username}</span>
                </div>
              )}
            </div>

            {/* 标签 */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {article.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* 文章摘要 */}
          {article.excerpt && (
            <p className="text-xl text-muted-foreground">{article.excerpt}</p>
          )}

          {/* 封面图 */}
          {article.coverImage && (
            <div className="my-8 aspect-video w-full overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.coverImage}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* 文章内容 */}
          <div
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* 文章元数据 */}
          <footer className="mt-12 border-t pt-8 text-sm text-muted-foreground">
            <p>
              发布于{" "}
              {new Date(article.createdAt).toLocaleDateString("zh-CN")}
              {article.updatedAt !== article.createdAt &&
                ` · 更新于 ${new Date(article.updatedAt).toLocaleDateString("zh-CN")}`}
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
