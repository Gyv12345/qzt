import { notFound } from "next/navigation";
import { getArticleBySlug, getArticles } from "@/lib/api";
import { articleToMd, mdResponse } from "@/lib/markdown";

/** /md/news/:slug — 文章详情 Markdown。 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

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

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  try {
    const article = await getArticleBySlug(slug);
    return mdResponse(articleToMd(article));
  } catch {
    notFound();
  }
}
