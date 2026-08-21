import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPage } from "@/lib/api";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
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
    return (
      <section className="container py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-strong">页面未找到</h1>
        <p className="mt-4 text-muted">该页面可能已被删除或尚未发布。</p>
      </section>
    );
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
