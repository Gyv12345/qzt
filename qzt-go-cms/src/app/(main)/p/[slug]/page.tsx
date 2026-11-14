import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPage, getPages } from "@/lib/api";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 静态导出(output:export)要求动态路由必须枚举全部预渲染参数:
 * 预生成全部启用单页(排除外链类型)。后端不可达时给占位 slug —
 * 页面渲染必然失败走 notFound, 该路径被 exporter 跳过, build 不炸。
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const pages = await getPages();
  const slugs = pages
    .filter((p) => p.link_type !== "link" && p.slug)
    .map((p) => ({ slug: p.slug }));
  return slugs.length > 0 ? slugs : [{ slug: "__empty__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPage(slug);
    return {
      title: page.title,
      description: page.content?.slice(0, 160) || page.title,
      alternates: {
        canonical: `/p/${slug}`,
      },
    };
  } catch {
    return { title: "页面未找到" };
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  let title = "";
  let content = "";

  try {
    const page = await getPage(slug);
    title = page.title;
    content = page.content || "";
  } catch {
    // 不存在的 slug 返回真 404,避免搜索引擎把占位内容当软 404 收录
    notFound();
  }

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title={title} mb="mb-0" />
        </div>
      </div>
      <section className="container py-16">
        <article className="prose-content mx-auto max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </section>
    </>
  );
}
