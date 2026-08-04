import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getArticles } from "@/lib/api";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/** 预生成已发布文章的静态页。 */
export async function generateStaticParams() {
  try {
    const { list } = await getArticles({ page_size: 50 });
    return list
      .filter((a) => a.slug)
      .map((a) => ({ slug: a.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const a = await getArticleBySlug(slug);
    return {
      title: a.title,
      description: a.summary || a.title,
      alternates: {
        canonical: `/news/${slug}`,
        types: { "text/markdown": `/md/news/${slug}` },
      },
      openGraph: {
        title: a.title,
        description: a.summary || a.title,
        type: "article",
        ...(a.cover_url && { images: [a.cover_url] }),
      },
    };
  } catch {
    return { title: "文章详情" };
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  let article;
  try {
    article = await getArticleBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <section className="container py-16">
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/news" className="no-underline hover:text-brand-700">
          新闻动态
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-600">{article.title}</span>
      </nav>

      <article className="mx-auto max-w-3xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            {article.category?.name && (
              <span className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                {article.category.name}
              </span>
            )}
            {article.created_at && <time>{new Date(article.created_at).toLocaleDateString("zh-CN")}</time>}
            {typeof article.view_count === "number" && <span>· {article.view_count} 阅读</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
            {article.title}
          </h1>
          {article.summary && <p className="mt-3 text-lg leading-8 text-ink-600">{article.summary}</p>}
        </header>

        {article.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.cover_url} alt={article.title} className="mb-8 w-full rounded-xl shadow-card" />
        )}

        {article.content && (
          <div
            className="prose-content max-w-none"
            // CMS 文章正文为富文本 HTML, 服务端渲染输出, 已通过 trusted 后端产出。
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}
      </article>

      {/* 文章结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.summary,
            datePublished: article.created_at,
            ...(article.cover_url && { image: [article.cover_url] }),
          }),
        }}
      />
    </section>
  );
}
