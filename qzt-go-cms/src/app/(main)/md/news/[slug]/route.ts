import { notFound } from "next/navigation";
import { getArticleBySlug, getArticles } from "@/lib/api";
import { articleToMd, mdResponse } from "@/lib/markdown";

/** /md/news/:slug — 文章详情 Markdown。 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // 静态导出(output:export)要求动态路由至少预渲染一个参数:
  // 后端不可达时给占位 slug — GET 时必然失败走 notFound, 该路径被 exporter 跳过。
  try {
    const { list } = await getArticles({ page_size: 50 });
    return list
      .filter((a) => a.slug)
      .map((a) => ({ slug: a.slug as string }));
  } catch {
    return [{ slug: "__empty__" }];
  }
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  try {
    const article = await getArticleBySlug(slug);
    return mdResponse(articleToMd(article));
  } catch {
    notFound();
  }
}
