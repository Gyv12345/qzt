import { getArticles } from "@/lib/api";
import { articleListToMd, mdResponse } from "@/lib/markdown";

/** /md/news — 新闻列表 Markdown。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getArticles({ page_size: 200 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(articleListToMd(list));
}
