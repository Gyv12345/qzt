import { getArticles } from "@/lib/api";
import { articleListToMd, mdResponse } from "@/lib/markdown";

/** /md/news — 新闻列表 Markdown。
 *  落在 news/index/ 以避开静态导出中列表文件与详情子目录冲突;对外 /md/news 由 nginx rewrite。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getArticles({ page_size: 100 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(articleListToMd(list));
}
